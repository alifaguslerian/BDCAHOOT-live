import type { Server as HttpServer } from 'node:http';
import { timingSafeEqual, createHash } from 'node:crypto';
import { Server, type Socket } from 'socket.io';
import { GameEngine } from './gameEngine';
import { serialize, deserialize } from 'node:v8';
import type { Persistence } from './persistence';
import { parseLibraryRequest } from './quizLibrary';
import type { ClientEvents, ServerEvents, SessionCredentials, Reply } from '../types/network';

interface ConnectionData { credentials?: SessionCredentials; tokens: number; refillAt: number; pending: number; needsState?: boolean }
type GameSocket = Socket<ClientEvents, ServerEvents, Record<string, never>, ConnectionData>;
interface Options { hostKey: string; now?: () => number; persistence?: Persistence; maxConnectionsPerAddress?: number }

export function createSocketServer(http: HttpServer, options: Options) {
  if (options.hostKey.length < 12) throw Error('HOST_KEY minimal 12 karakter.');
  let generation = 0, committed = 0;
  let storageFailure: Error | undefined, closing = false, publishing = false;
  let writing: Promise<void> | undefined;
  let pendingRequests = 0;
  const connectionsByAddress = new Map<string, number>();
  const addressLimit = options.maxConnectionsPerAddress ?? 200;
  if (!Number.isInteger(addressLimit) || addressLimit < 1) throw Error('Batas koneksi tidak valid.');
  const io = new Server<ClientEvents, ServerEvents, Record<string, never>, ConnectionData>(http, {
    maxHttpBufferSize: 256 * 1024,
    perMessageDeflate: false,
    allowRequest: (req, callback) => {
      const origin = req.headers.origin;
      let allowed = !origin;
      try { allowed ||= new URL(origin!).host === req.headers.host; } catch { /* invalid origin */ }
      callback(null, allowed && !storageFailure && !closing && io.engine.clientsCount < 1000
        && (connectionsByAddress.get(req.socket.remoteAddress || '') ?? 0) < addressLimit);
    },
  });
  io.engine.on('connection', connection => {
    const address = connection.remoteAddress || '';
    const count = connectionsByAddress.get(address) ?? 0;
    // Recheck after handshake to cover simultaneous requests passing allowRequest.
    if (count >= addressLimit || io.engine.clientsCount > 1000) { connection.close(true); return; }
    connectionsByAddress.set(address, count + 1);
    connection.once('close', () => {
      const remaining = (connectionsByAddress.get(address) ?? 1) - 1;
      if (remaining) connectionsByAddress.set(address, remaining); else connectionsByAddress.delete(address);
    });
  });
  const dirtyRooms = new Set<string>();
  const dirtyCounts = new Set<string>();
  const engine = new GameEngine({ now: options.now, deferQuestionStart: Boolean(options.persistence),
    onChange: code => { generation++; dirtyRooms.add(code); },
    onAnswer: code => { generation++; dirtyCounts.add(code); } });
  // All LAN clients may share an address. Limit expensive failed operator authentication separately.
  const operatorFailures = new Map<string, { count: number; expires: number }>();
  const creations = new Map<string, { fingerprint: string; credentials: SessionCredentials }>();
  if (options.persistence?.initial) {
    try {
      const saved = deserialize(options.persistence.initial);
      if (saved?.version !== 1 || !(saved.creations instanceof Map) || saved.creations.size > 16) throw Error('Versi snapshot tidak didukung.');
      engine.restore(saved.rooms);
      for (const [id, entry] of saved.creations) {
        if (typeof id !== 'string' || typeof entry?.fingerprint !== 'string' || !entry.credentials) throw Error('Snapshot pembuatan room tidak valid.');
        if (engine.roomCodes().includes(entry.credentials.code)) {
          engine.resume(entry.credentials);
          creations.set(id, entry);
        }
      }
      generation++;
    } catch (error) {
      void options.persistence.close(); void io.close(); throw error;
    }
  }

  async function flush(): Promise<void> {
    if (!options.persistence) return;
    while (committed < generation) {
      if (storageFailure) throw storageFailure;
      if (!writing) {
        const version = generation;
        const codes = new Set(engine.roomCodes());
        for (const [id, entry] of creations) if (!codes.has(entry.credentials.code)) creations.delete(id);
        const data = serialize({ version: 1, rooms: engine.snapshot(), creations });
        let timeout: ReturnType<typeof setTimeout>;
        const deadline = new Promise<never>((_, reject) => {
          timeout = setTimeout(() => reject(Error('Storage commit timed out')), 5000);
        });
        writing = Promise.race([options.persistence.save(data), deadline]).then(() => { committed = version; }).catch(error => {
          storageFailure = error instanceof Error ? error : Error('Storage failure');
          console.error('Penyimpanan pertandingan gagal. Permainan dihentikan; periksa disk lalu restart server.');
          for (const socket of io.sockets.sockets.values()) socket.conn.close();
          throw storageFailure;
        }).finally(() => { clearTimeout(timeout); writing = undefined; });
      }
      await writing;
    }
    if (storageFailure) throw storageFailure;
    engine.activateCommittedQuestions();
  }
  const ready = flush();

  function bind(socket: GameSocket, credentials: SessionCredentials) {
    socket.data.credentials = engine.resume(credentials);
    socket.data.needsState = true;
  }
  function credentials(socket: GameSocket) {
    if (!socket.data.credentials) throw Error('Bergabung ke room terlebih dahulu.');
    return engine.resume(socket.data.credentials);
  }
  function takeToken(socket: GameSocket) {
    const now = performance.now();
    socket.data.tokens = Math.min(200, socket.data.tokens + (now - socket.data.refillAt) * 0.05);
    socket.data.refillAt = now;
    if (socket.data.tokens < 1) return false;
    socket.data.tokens--;
    return true;
  }
  async function handle<T>(socket: GameSocket, ack: ((reply: Reply<T>) => void) | undefined, operation: () => T | Promise<T>, committedResult?: () => T) {
    if (typeof ack !== 'function') return;
    if (storageFailure || closing) { ack({ success: false, error: 'Penyimpanan tidak tersedia. Tunggu server pulih.', code: 'UNKNOWN' }); return; }
    if (!takeToken(socket)) { ack({ success: false, error: 'Terlalu banyak permintaan. Coba lagi sebentar.', code: 'RATE_LIMIT' }); return; }
    if (socket.data.pending >= 8 || pendingRequests >= 1000) { ack({ success: false, error: 'Server sedang menyimpan. Coba lagi sebentar.', code: 'RATE_LIMIT' }); return; }
    socket.data.pending++; pendingRequests++;
    try { const operationResult = operation(); const data = operationResult instanceof Promise ? await operationResult : operationResult; await flush(); ack({ success: true, data: committedResult ? committedResult() : data }); }
    catch (error) { ack({ success: false, error: storageFailure ? 'Konfirmasi penyimpanan gagal. Tunggu server pulih.' : error instanceof Error ? error.message : 'Permintaan tidak valid.', ...(storageFailure ? { code: 'UNKNOWN' } : {}) }); }
    finally { socket.data.pending--; pendingRequests--; }
  }
  function authorizeOperator(socket: GameSocket, hostKey: unknown) {
    const address = socket.handshake.address;
    const failure = operatorFailures.get(address);
    if (failure && failure.expires > Date.now() && failure.count >= 10) throw Error('Terlalu banyak kode operator salah. Tunggu satu menit.');
    const actual = Buffer.from(typeof hostKey === 'string' ? hostKey : '');
    const expected = Buffer.from(options.hostKey);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      operatorFailures.set(address, { count: failure && failure.expires > Date.now() ? failure.count + 1 : 1, expires: Date.now() + 60000 });
      throw Error('Kode operator tidak valid. Lihat terminal server Host.');
    }
  }
  io.on('connection', socket => {
    socket.data.tokens = 200;
    socket.data.pending = 0;
    socket.data.refillAt = performance.now();
    socket.on('host:recover', (payload, ack) => handle(socket, ack, () => {
      authorizeOperator(socket, payload?.hostKey);
      const session = engine.recoverHost(payload?.code);
      bind(socket, session);
      return session;
    }));
    socket.on('library:request', (payload, ack) => handle(socket, ack, () => {
      authorizeOperator(socket, payload?.hostKey);
      if (!options.persistence?.library) throw Error('Penyimpanan kuis server tidak tersedia.');
      return options.persistence.library(parseLibraryRequest(payload));
    }));
    socket.on('room:create', (payload, ack) => handle(socket, ack, () => {
      authorizeOperator(socket, payload?.hostKey);
      if (typeof payload.requestId !== 'string' || !/^[a-zA-Z0-9_-]{16,100}$/.test(payload.requestId)) throw Error('ID pembuatan room tidak valid.');
      const fingerprint = createHash('sha256').update(JSON.stringify([payload.quiz, payload.settings])).digest('hex');
      const previous = creations.get(payload.requestId);
      if (previous) {
        if (previous.fingerprint !== fingerprint) throw Error('Permintaan pembuatan room sudah digunakan.');
        bind(socket, previous.credentials);
        return previous.credentials;
      }
      if (engine.roomCodes().length >= 16) throw Error('Batas 16 room aktif tercapai. Tutup room lama.');
      const session = engine.createRoom(payload.quiz, payload.settings);
      for (const [id, value] of creations) {
        if (value.credentials.code === session.code) creations.delete(id);
      }
      creations.set(payload.requestId, { fingerprint, credentials: session });
      bind(socket, session);
      return session;
    }));
    socket.on('room:inspect', (payload, ack) => handle(socket, ack, () => engine.inspect(payload?.code)));
    socket.on('room:leave', (_payload, ack) => handle(socket, ack, () => {
      if (!socket.data.credentials) return undefined;
      engine.leave(credentials(socket));
      socket.data.credentials = undefined;
      return undefined;
    }));
    socket.on('room:join', (payload, ack) => handle(socket, ack, () => {
      const session = engine.join(payload?.code, payload?.name, payload?.requestId, socket.data.credentials, payload?.avatarId);
      bind(socket, session);
      return session;
    }));
    socket.on('session:resume', (payload, ack) => handle(socket, ack, () => {
      bind(socket, payload);
      return engine.view(credentials(socket));
    }, () => engine.view(credentials(socket))));
    socket.on('answer:submit', (payload, ack) => handle(socket, ack, () => engine.submit(credentials(socket), payload)));
    socket.on('host:command', (payload, ack) => handle(socket, ack, () => {
      const session = engine.command(credentials(socket), payload);
      if (session) bind(socket, session);
      if (payload.action === 'reset') socket.data.credentials = undefined;
      return session;
    }));
    socket.on('clock:ping', (_payload, ack) => {
      if (typeof ack !== 'function' || storageFailure || closing || !takeToken(socket)) return;
      const now = engine.serverTime();
      ack({ receivedAt: now, sentAt: engine.serverTime() });
    });
  });

  let lastActivitySave = performance.now();
  async function publish() {
    if (publishing || closing || storageFailure) return;
    publishing = true;
    try {
      await flush();
      broadcast();
    } catch { /* flush has already stopped the transport on storage failure. */ }
    finally { publishing = false; }
  }
  function broadcast() {
    const activeCodes = new Set(engine.roomCodes());
    for (const [id, value] of creations) if (!activeCodes.has(value.credentials.code)) creations.delete(id);
    for (const [address, failure] of operatorFailures) if (failure.expires <= Date.now()) operatorFailures.delete(address);
    for (const socket of io.sockets.sockets.values()) {
      const session = socket.data.credentials;
      if (!session) continue;
      if (!socket.data.needsState && !dirtyRooms.has(session.code) && !(session.role === 'host' && dirtyCounts.has(session.code))) continue;
      try {
        const view = engine.view(session);
        if (socket.data.needsState || dirtyRooms.has(session.code)) socket.emit('room:state', view);
        else socket.emit('room:count', { sessionId: view.sessionId, questionIndex: view.currentQuestionIndex, count: view.answeredCount });
      } catch {
        socket.data.credentials = undefined;
        socket.emit('session:ended', 'Room berakhir atau sesi pemain tidak berlaku lagi.', session.sessionId, session.playerId);
      }
      socket.data.needsState = false;
    }
    dirtyRooms.clear(); dirtyCounts.clear();
  }
  const interval = setInterval(() => {
    if (closing || storageFailure) return;
    engine.tick();
    if (options.persistence && performance.now() - lastActivitySave >= 30000) {
      if (engine.roomCodes().length) generation++;
      lastActivitySave = performance.now();
    }
    void publish();
  }, 100);
  interval.unref();
  let closePromise: Promise<void> | undefined;
  return { io, engine, ready, close: () => closePromise ??= (async () => {
    closing = true;
    clearInterval(interval);
    try { if (!storageFailure) { generation++; await flush(); } }
    finally {
      await new Promise<void>(resolve => io.close(() => resolve()));
      await options.persistence?.close();
      engine.close(); operatorFailures.clear(); creations.clear();
    }
  })() };
}
