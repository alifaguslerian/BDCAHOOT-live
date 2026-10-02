import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';

const db = new DatabaseSync(process.argv[2]);
db.exec('PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL; PRAGMA cache_size=10; BEGIN IMMEDIATE;');
const data = Buffer.alloc(4 * 1024 * 1024, 42);
db.prepare('UPDATE snapshot SET data=?,digest=? WHERE id=1').run(data, createHash('sha256').update(data).digest('hex'));
process.send?.('transaction-written');
setInterval(() => {}, 1000);
