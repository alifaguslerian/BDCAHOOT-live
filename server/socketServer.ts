import type { Server as HttpServer } from 'node:http';
import { timingSafeEqual, createHash } from 'node:crypto';
import { Server, type Socket } from 'socket.io';
import { GameEngine } from './gameEngine';
import type { ClientEvents, ServerEvents, SessionCredentials, Reply } from '../types/network';

interface ConnectionData { credentials?: SessionCredentials; tokens: number; refillAt: number }
type GameSocket = Socket<ClientEvents, ServerEvents, Record<string, never>, ConnectionData>;
interface Options { hostKey: string; now?: () => number }

export function createSocketServer(http: HttpServer, options: Options) {
  if (options.hostKey.length < 12) throw Error('HOST_KEY minimal 12 karakter.');
  const io = new Server<ClientEvents, ServerEvents, Record<string, never>, ConnectionData>(http, {
    maxHttpBufferSize: 256 * 1024,
    perMessageDeflate: false,
    allowRequest: (req, callback) => {
      const origin = req.headers.origin;
      let allowed = !origin;
      try { allowed ||= new URL(origin!).host === req.headers.host; } catch { /* invalid origin */ }
      callback(null, allowed && io.engine.clientsCount < 1000);
    },
  });
  const dirtyRooms = new Set<string>();
  const dirtyCounts = new Set<string>();
  const engine = new GameEngine({ now: options.now,
    onChange: code => dirtyRooms.add(code), onAnswer: code => dirtyCounts.add(code) });
  // All LAN clients may share an address. Limit expensive failed operator authentication separately.
  const operatorFailures = new Map<string, { count: number; expires: number }>();
  const creations = new Map<string, { fingerprint: string; credentials: SessionCredentials }>();

  function bind(socket: GameSocket, credentials: SessionCredentials) {
    socket.data.credentials = engine.resume(credentials);
    socket.emit('room:state', engine.view(socket.data.credentials));
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
  function handle<T>(socket: GameSocket, ack: ((reply: Reply<T>) => void) | undefined, operation: () => T) {
    if (typeof ack !== 'function') return;
    if (!takeToken(socket)) { ack({ success: false, error: 'Terlalu banyak permintaan. Coba lagi sebentar.', code: 'RATE_LIMIT' }); return; }
    try { ack({ success: true, data: operation() }); }
    catch (error) { ack({ success: false, error: error instanceof Error ? error.message : 'Permintaan tidak valid.' }); }
  }
  io.on('connection', socket => {
    socket.data.tokens = 200;
    socket.data.refillAt = performance.now();
    socket.on('room:create', (payload, ack) => handle(socket, ack, () => {
      const address = socket.handshake.address;
      const failure = operatorFailures.get(address);
      if (failure && failure.expires > Date.now() && failure.count >= 10) throw Error('Terlalu banyak kode operator salah. Tunggu satu menit.');
      const actual = Buffer.from(typeof payload?.hostKey === 'string' ? payload.hostKey : '');
      const expected = Buffer.from(options.hostKey);
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
        operatorFailures.set(address, { count: failure && failure.expires > Date.now() ? failure.count + 1 : 1, expires: Date.now() + 60000 });
        throw Error('Kode operator tidak valid. Lihat terminal server Host.');
      }
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
      const session = engine.join(payload?.code, payload?.name, payload?.requestId);
      bind(socket, session);
      return session;
    }));
    socket.on('session:resume', (payload, ack) => handle(socket, ack, () => {
      bind(socket, payload);
      return engine.view(credentials(socket));
    }));
    socket.on('answer:submit', (payload, ack) => handle(socket, ack, () => engine.submit(credentials(socket), payload)));
    socket.on('host:command', (payload, ack) => handle(socket, ack, () => {
      const session = engine.command(credentials(socket), payload);
      if (session) bind(socket, session);
      if (payload.action === 'reset') socket.data.credentials = undefined;
      return session;
    }));
    socket.on('clock:ping', (_payload, ack) => {
      if (typeof ack !== 'function' || !takeToken(socket)) return;
      const now = engine.serverTime();
      ack({ receivedAt: now, sentAt: engine.serverTime() });
    });
  });

  const interval = setInterval(() => {
    engine.tick();
    const activeCodes = new Set(engine.roomCodes());
    for (const [id, value] of creations) if (!activeCodes.has(value.credentials.code)) creations.delete(id);
    for (const [address, failure] of operatorFailures) if (failure.expires <= Date.now()) operatorFailures.delete(address);
    for (const socket of io.sockets.sockets.values()) {
      const session = socket.data.credentials;
      if (!session) continue;
      if (!dirtyRooms.has(session.code) && !(session.role === 'host' && dirtyCounts.has(session.code))) continue;
      try {
        const view = engine.view(session);
        if (dirtyRooms.has(session.code)) socket.emit('room:state', view);
        else socket.emit('room:count', { sessionId: view.sessionId, questionIndex: view.currentQuestionIndex, count: view.answeredCount });
      } catch {
        socket.data.credentials = undefined;
        socket.emit('session:ended', 'Room berakhir atau sesi pemain tidak berlaku lagi.', session.sessionId, session.playerId);
      }
    }
    dirtyRooms.clear(); dirtyCounts.clear();
  }, 100);
  interval.unref();
  return { io, engine, close: async () => {
    clearInterval(interval); engine.close(); operatorFailures.clear(); creations.clear();
    await new Promise<void>(resolve => io.close(() => resolve()));
  } };
}
