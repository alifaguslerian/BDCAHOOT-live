import { createServer } from 'node:http';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import { createSocketServer } from '../server/socketServer';

export interface Sample {
  elapsedMs: number; intervalMs: number; phase: string; cpuPercentOneCore: number;
  rssBytes: number; heapUsedBytes: number; externalBytes: number;
  eventLoopP99Ms: number; eventLoopMaxMs: number; sockets: number; rooms: number;
}

async function main() {
  if (!process.send || !process.env.ENDURANCE_HOST_KEY) throw Error('Run through npm run test:endurance.');
  const app = process.env.ENDURANCE_BROWSER === '1'
    ? (await import('next')).default({ dev: false, hostname: '127.0.0.1' }) : null;
  await app?.prepare();
  const handler = app?.getRequestHandler();
  const http = createServer((req, res) => { if (handler) void handler(req, res); else res.end(); });
  const service = createSocketServer(http, { hostKey: process.env.ENDURANCE_HOST_KEY });
  if (app) http.on('upgrade', (req, socket, head) => {
    if (!req.url?.startsWith('/socket.io/')) void app.getUpgradeHandler()(req, socket, head);
  });
  const histogram = monitorEventLoopDelay({ resolution: 10 });
  histogram.enable();
  const started = performance.now();
  let previousTime = started, previousCpu = process.cpuUsage(), phase = 'baseline';
  const sample = () => {
    const now = performance.now(), cpu = process.cpuUsage(), memory = process.memoryUsage();
    const intervalMs = now - previousTime;
    const row: Sample = {
      elapsedMs: now - started, intervalMs, phase,
      cpuPercentOneCore: ((cpu.user - previousCpu.user + cpu.system - previousCpu.system) / 1000) / intervalMs * 100,
      rssBytes: memory.rss, heapUsedBytes: memory.heapUsed, externalBytes: memory.external,
      eventLoopP99Ms: histogram.percentile(99) / 1e6, eventLoopMaxMs: histogram.max / 1e6,
      sockets: service.io.engine.clientsCount, rooms: service.engine.roomCodes().length,
    };
    if (process.connected) process.send?.({ type: 'sample', row });
    previousTime = now; previousCpu = cpu; histogram.reset();
  };
  const interval = setInterval(sample, 1000);
  let closing = false;
  const close = async () => {
    if (closing) return;
    closing = true; clearInterval(interval); sample(); histogram.disable();
    await service.close();
    await app?.close();
    process.disconnect?.();
  };
  process.on('message', (message: { type: string; phase?: string }) => {
    if (message.type === 'phase') { sample(); phase = message.phase ?? phase; }
    if (message.type === 'stop') void close();
  });
  process.on('disconnect', () => { void close(); });
  process.on('SIGTERM', () => { void close(); });
  await new Promise<void>(resolve => http.listen(0, '127.0.0.1', resolve));
  const address = http.address();
  if (!address || typeof address === 'string') throw Error('Missing server address');
  process.send({ type: 'ready', url: `http://127.0.0.1:${address.port}`, pid: process.pid });
}

main().catch(error => { console.error(error); process.exitCode = 1; });
