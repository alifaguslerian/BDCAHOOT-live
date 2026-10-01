import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { cpus, platform, release, totalmem } from 'node:os';
import { dirname, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { parseArgs } from 'node:util';
import { io, type Socket } from 'socket.io-client';
import type { Reply, RoomView, SessionCredentials } from '../types/network';
import type { Sample } from './enduranceServer';

async function main() {
  const { values } = parseArgs({ options: {
    players: { type: 'string', default: '100' }, questions: { type: 'string', default: '40' },
    seconds: { type: 'string', default: '5' }, report: { type: 'string', default: 'reports/endurance.json' },
  } });
  const playersCount = Number(values.players), questions = Number(values.questions), seconds = Number(values.seconds);
  for (const [name, value, min, max] of [['players', playersCount, 1, 150], ['questions', questions, 1, 200], ['seconds', seconds, 5, 120]] as const) {
    assert(Number.isInteger(value) && value >= min && value <= max, `${name} must be ${min}..${max}`);
  }
  const reportPath = resolve(values.report!);
  const samples: Sample[] = [], latencies: number[] = [];
  const clients: { socket: Socket; view?: RoomView }[] = [];
  const hostKey = randomUUID();
  const worker = spawn(process.execPath, ['--import', 'tsx', resolve('scripts/enduranceServer.ts')], {
    env: { ...process.env, ENDURANCE_HOST_KEY: hostKey },
    stdio: ['ignore', 'inherit', 'inherit', 'ipc'], windowsHide: true,
  });
  let failure: Error | undefined, stopping = false, disconnected = 0, completedQuestions = 0, pid: number | undefined;
  let workerExited = false, workerExitCode: number | null = null;
  worker.on('error', error => { failure = error; });
  worker.on('exit', (code, signal) => {
    workerExited = true; workerExitCode = code;
    if (!stopping || code !== 0) failure ??= Error(`Server exited: ${code} / ${signal}`);
  });
  worker.on('message', (message: { type: string; row?: Sample }) => {
    if (message.type === 'sample' && message.row) samples.push(message.row);
  });
  const startedAt = new Date().toISOString(), started = performance.now();
  const abort = () => { failure ??= Error('Interrupted'); };
  process.on('SIGINT', abort); process.on('SIGTERM', abort);
  async function until(predicate: () => boolean, label: string, timeout = 10000) {
    const deadline = performance.now() + timeout;
    while (!predicate()) {
      if (failure) throw failure;
      if (performance.now() > deadline) throw Error(`Timed out: ${label}`);
      await delay(25);
    }
    if (failure) throw failure;
  }
  async function request<T>(socket: Socket, event: string, payload: unknown): Promise<T> {
    const reply = await socket.timeout(6000).emitWithAck(event, payload) as Reply<T>;
    if (!reply.success) throw Error(`${event}: ${reply.error}`);
    return reply.data;
  }
  function phase(value: string) { worker.send?.({ type: 'phase', phase: value }); }
  try {
    let url = '';
    worker.on('message', (message: { type: string; url?: string; pid?: number }) => {
      if (message.type === 'ready') { url = message.url!; pid = message.pid; }
    });
    await until(() => Boolean(url), 'server startup');
    await delay(3000);
    phase('joining');
    async function connect() {
      const client: (typeof clients)[number] = { socket: io(url, { transports: ['websocket'], forceNew: true, reconnection: false }) };
      clients.push(client);
      client.socket.on('room:state', (view: RoomView) => { client.view = view; });
      client.socket.on('connect_error', (error: Error) => { failure ??= error; });
      client.socket.on('disconnect', reason => {
        if (!stopping) { disconnected++; failure ??= Error(`Unexpected disconnect: ${reason}`); }
      });
      await until(() => client.socket.connected, 'client connection');
      return client;
    }
    const host = await connect();
    const quiz = { id: 'endurance', title: 'Endurance', createdAt: 1, updatedAt: 1,
      questions: Array.from({ length: questions }, (_, i) => ({ id: `q${i}`, question: `Question ${i + 1}`,
        options: ['A', 'B', 'C', 'D'].map(id => ({ id, text: id })), correctOption: 'B', timerSeconds: seconds })) };
    const owner = await request<SessionCredentials>(host.socket, 'room:create', { quiz, hostKey, requestId: randomUUID() });
    const players = await Promise.all(Array.from({ length: playersCount }, async (_, i) => {
      const client = await connect();
      const name = `P${String.fromCharCode(65 + Math.floor(i / 26))}${String.fromCharCode(65 + i % 26)}`;
      const identity = await request<SessionCredentials>(client.socket, 'room:join', { code: owner.code, name, requestId: randomUUID() });
      return { client, identity };
    }));
    const command = async (action: string) => {
      const view = await request<RoomView>(host.socket, 'session:resume', owner);
      await request(host.socket, 'host:command', { sessionId: owner.sessionId, revision: view.revision, action });
    };
    phase('game');
    await command('start');
    for (let q = 0; q < questions; q++) {
      await until(() => clients.every(c => c.view?.stage === 'QUESTION' && c.view.currentQuestionIndex === q), `question ${q + 1} broadcast`);
      for (const { client } of players) assert.equal(client.view!.currentQuestion?.correctOption, undefined);
      // One burst per question exercises simultaneous answers without bypassing real deadlines.
      await delay(1000);
      await Promise.all(players.map(async ({ client }, i) => {
        const payload = { sessionId: owner.sessionId, questionIndex: q, submissionId: randomUUID(), option: (i + q) % 4 === 0 ? 'A' : 'B' };
        const sent = performance.now();
        await request(client.socket, 'answer:submit', payload);
        latencies.push(performance.now() - sent);
      }));
      await until(() => clients.every(c => c.view?.stage === 'SCOREBOARD' && c.view.currentQuestionIndex === q), `scoreboard ${q + 1}`, (seconds + 12) * 1000);
      assert.equal(host.view!.answeredCount, playersCount);
      assert.equal(host.view!.rankings.length, playersCount);
      await delay(1000);
      completedQuestions++;
      console.log(`Question ${completedQuestions}/${questions}: ${latencies.length} ACKs; server RSS ${((samples.at(-1)?.rssBytes ?? 0) / 1048576).toFixed(1)} MiB`);
      await command(q === questions - 1 ? 'finish' : 'next');
    }
    await until(() => clients.every(c => c.view?.stage === 'FINAL'), 'final podium');
    assert.equal(host.view!.rankings.length, playersCount);
    for (const [i, { client, identity }] of players.entries()) {
      const player = client.view!.players[identity.playerId!];
      assert.equal(Object.keys(player.answers).length, questions);
      let score = 0;
      for (let q = 0; q < questions; q++) {
        const answer = player.answers[q], correct = (i + q) % 4 !== 0;
        assert.equal(answer.isCorrect, correct);
        const expected = correct ? 1000 + Math.max(1, Math.round(1000 * Math.exp(-4 * answer.responseDurationMs / (seconds * 1000)))) : 0;
        assert.equal(answer.pointsEarned, expected); score += expected;
      }
      assert.equal(player.score, score);
      assert.equal(host.view!.players[identity.playerId!].score, score);
    }
    assert.equal(latencies.length, playersCount * questions);
    phase('cleanup');
    await command('reset');
    stopping = true;
    clients.forEach(c => c.socket.disconnect());
    await delay(5000);
    assert.equal(samples.at(-1)?.rooms, 0);
    assert.equal(samples.at(-1)?.sockets, 0);
  } catch (error) { failure ??= error instanceof Error ? error : Error(String(error)); }
  finally {
    stopping = true; clients.forEach(c => c.socket.disconnect());
    if (worker.connected) worker.send?.({ type: 'stop' });
    const deadline = performance.now() + 5000;
    while (!workerExited && performance.now() < deadline) await delay(50);
    if (!workerExited) { failure ??= Error('Server did not stop cleanly'); worker.kill(); }
    process.off('SIGINT', abort); process.off('SIGTERM', abort);
    const sorted = [...latencies].sort((a, b) => a - b);
    const percentile = (p: number) => sorted.length ? sorted[Math.ceil(sorted.length * p) - 1] : null;
    const phases = Object.fromEntries(['baseline', 'joining', 'game', 'cleanup'].map(name => {
      const rows = samples.filter(s => s.phase === name);
      const duration = rows.reduce((sum, s) => sum + s.intervalMs, 0);
      return [name, rows.length ? {
        durationMs: duration,
        averageCpuPercentOneCore: rows.reduce((sum, s) => sum + s.cpuPercentOneCore * s.intervalMs, 0) / duration,
        peakCpuPercentOneCore: Math.max(...rows.map(s => s.cpuPercentOneCore)),
        peakRssMiB: Math.max(...rows.map(s => s.rssBytes)) / 1048576,
        peakHeapMiB: Math.max(...rows.map(s => s.heapUsedBytes)) / 1048576,
        lastHeapMiB: rows.at(-1)!.heapUsedBytes / 1048576,
        maxSampleEventLoopP99Ms: Math.max(...rows.map(s => s.eventLoopP99Ms)),
        eventLoopMaxMs: Math.max(...rows.map(s => s.eventLoopMaxMs)),
      } : null];
    }));
    const report = { passed: !failure, error: failure?.message ?? null, startedAt, elapsedMs: performance.now() - started,
      config: { players: playersCount, questions, questionSeconds: seconds, revealMs: 4000, scoreboardMs: 1000 },
      environment: { node: process.version, platform: platform(), release: release(), cpu: cpus()[0]?.model, logicalCpus: cpus().length, totalMemoryBytes: totalmem(), serverPid: pid, workerExitCode },
      scope: 'Production Socket.io + game engine, real clock, isolated server process; loopback, no Next.js rendering or physical phones; no forced GC.',
      completedQuestions, acceptedAnswers: latencies.length, unexpectedDisconnects: disconnected,
      ackMs: { p50: percentile(.5), p95: percentile(.95), p99: percentile(.99), max: sorted.at(-1) ?? null }, phases, samples };
    await mkdir(dirname(reportPath), { recursive: true });
    await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ ...report, samples: `${samples.length} samples in ${reportPath}` }, null, 2));
  }
  if (failure) throw failure;
}

main().catch(error => { console.error(error); process.exitCode = 1; });
