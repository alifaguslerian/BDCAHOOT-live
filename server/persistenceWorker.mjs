import { parentPort, workerData } from 'node:worker_threads';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';

let db;
try {
  mkdirSync(dirname(workerData.path), { recursive: true, mode: 0o700 });
  db = new DatabaseSync(workerData.path);
  if (process.platform !== 'win32') chmodSync(workerData.path, 0o600);
  db.exec('PRAGMA busy_timeout=0; PRAGMA locking_mode=EXCLUSIVE; PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL;');
  db.exec('BEGIN EXCLUSIVE');
  const version = db.prepare('PRAGMA user_version').get().user_version;
  if (version !== 0 && version !== 1) throw Error('Unsupported database version');
  db.exec('CREATE TABLE IF NOT EXISTS snapshot (id INTEGER PRIMARY KEY CHECK(id=1), data BLOB NOT NULL, digest TEXT NOT NULL); PRAGMA user_version=1; COMMIT;');
  if (db.prepare('PRAGMA quick_check').get().quick_check !== 'ok') throw Error('Database integrity failure');
  const row = db.prepare('SELECT data,digest FROM snapshot WHERE id=1').get();
  const writeSnapshot = db.prepare('INSERT INTO snapshot(id,data,digest) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,digest=excluded.digest');
  const digest = data => createHash('sha256').update(data).digest('hex');
  if (row && digest(row.data) !== row.digest) throw Error('Snapshot checksum failure');
  parentPort.postMessage({ id: 0, data: row?.data ?? null });
  parentPort.on('message', ({ id, data, close }) => {
    try {
      if (close) {
        db.close(); parentPort.postMessage({ id }); parentPort.close(); return;
      }
      db.exec('BEGIN IMMEDIATE');
      try {
        writeSnapshot.run(data, digest(data));
        db.exec('COMMIT');
      } catch (error) { db.exec('ROLLBACK'); throw error; }
      parentPort.postMessage({ id });
    } catch {
      parentPort.postMessage({ id, error: 'Penyimpanan pertandingan gagal. Periksa disk dan restart server.' });
    }
  });
} catch (error) {
  try { db?.close(); } catch { /* Closing rolls back a failed startup transaction. */ }
  parentPort.postMessage({ id: 0, error: `Database pertandingan tidak dapat dibuka: ${error.message}` });
  parentPort.close();
}
