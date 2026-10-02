import { createServer } from 'node:http';
import { SnapshotStore } from '../../server/persistence';
import { createSocketServer } from '../../server/socketServer';

async function main() {
  const persistence = await SnapshotStore.open(process.argv[2]);
  const http = createServer();
  const service = createSocketServer(http, { hostKey: 'crash-test-operator', persistence });
  await service.ready;
  await new Promise<void>(resolve => http.listen(0, '127.0.0.1', resolve));
  const address = http.address();
  if (!address || typeof address === 'string') throw Error('Missing port');
  process.send?.({ url: `http://127.0.0.1:${address.port}` });
}
main().catch(error => { console.error(error); process.exit(1); });
