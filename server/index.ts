import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { networkInterfaces } from 'node:os';
import next from 'next';
import { createSocketServer } from './socketServer';

async function main() {
  const dev = process.argv.includes('--dev');
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('PORT tidak valid.');
  const app = next({ dev, hostname: '0.0.0.0', port });
  await app.prepare();
  const handle = app.getRequestHandler();
  const http = createServer((req, res) => { void handle(req, res); });
  const hostKey = process.env.HOST_KEY || randomBytes(12).toString('hex');
  const service = createSocketServer(http, { hostKey });
  const upgrade = app.getUpgradeHandler();
  http.on('upgrade', (req, socket, head) => {
    if (!req.url?.startsWith('/socket.io/')) void upgrade(req, socket, head);
  });
  await new Promise<void>((resolve, reject) => { http.once('error', reject); http.listen(port, '0.0.0.0', resolve); });
  console.log(`BDCAHOOT: http://localhost:${port}`);
  for (const entries of Object.values(networkInterfaces())) for (const entry of entries || []) {
    if (entry.family === 'IPv4' && !entry.internal) console.log(`LAN: http://${entry.address}:${port}`);
  }
  console.log(`Kode operator (Host saja): ${hostKey}`);
  console.log('Room disimpan selama proses ini berjalan. Jangan tutup terminal saat pertandingan.');
  let closing = false;
  const shutdown = async () => {
    if (closing) return; closing = true;
    await service.close(); await app.close(); process.exit(0);
  };
  process.once('SIGINT', shutdown); process.once('SIGTERM', shutdown);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
