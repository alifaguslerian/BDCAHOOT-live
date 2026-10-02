import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { networkInterfaces } from 'node:os';
import next from 'next';
import { createSocketServer } from './socketServer';
import { SnapshotStore } from './persistence';
import { resolve, sep } from 'node:path';

async function main() {
  const dev = process.argv.includes('--dev');
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('PORT tidak valid.');
  const app = next({ dev, hostname: '0.0.0.0', port });
  await app.prepare();
  const handle = app.getRequestHandler();
  const http = createServer((req, res) => { void handle(req, res); });
  const hostKey = process.env.HOST_KEY || randomBytes(12).toString('hex');
  const databasePath = resolve(process.env.DATABASE_PATH || 'data/game.sqlite');
  const comparablePath = process.platform === 'win32' ? databasePath.toLowerCase() : databasePath;
  const publicPath = process.platform === 'win32' ? resolve('public').toLowerCase() : resolve('public');
  if (comparablePath.startsWith(publicPath + sep)) { await app.close(); throw Error('Database tidak boleh berada di folder public.'); }
  let persistence: SnapshotStore;
  try { persistence = await SnapshotStore.open(databasePath); }
  catch (error) { await app.close(); throw error; }
  let service: ReturnType<typeof createSocketServer>;
  try { service = createSocketServer(http, { hostKey, persistence }); await service.ready; }
  catch (error) { await persistence.close(); await app.close(); throw error; }
  const upgrade = app.getUpgradeHandler();
  http.on('upgrade', (req, socket, head) => {
    if (!req.url?.startsWith('/socket.io/')) void upgrade(req, socket, head);
  });
  try { await new Promise<void>((resolve, reject) => { http.once('error', reject); http.listen(port, '0.0.0.0', resolve); }); }
  catch (error) { await service.close(); await app.close(); throw error; }
  console.log(`BDCAHOOT: http://localhost:${port}`);
  for (const entries of Object.values(networkInterfaces())) for (const entry of entries || []) {
    if (entry.family === 'IPv4' && !entry.internal) console.log(`LAN: http://${entry.address}:${port}`);
  }
  console.log(`Kode operator (Host saja): ${hostKey}`);
  console.log(`Database pertandingan: ${databasePath}`);
  console.log(`Room tersimpan: ${service.engine.roomCodes().length}. Soal aktif saat restart dipulihkan ke scoreboard.`);
  let closing = false;
  const shutdown = async () => {
    if (closing) return; closing = true;
    try { await service.close(); await app.close(); process.exit(0); }
    catch (error) { console.error(error); process.exit(1); }
  };
  process.once('SIGINT', shutdown); process.once('SIGTERM', shutdown);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
