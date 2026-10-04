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
  db.exec('CREATE TABLE IF NOT EXISTS quizzes (id TEXT PRIMARY KEY, data TEXT, revision INTEGER NOT NULL);');
  if (db.prepare('PRAGMA quick_check').get().quick_check !== 'ok') throw Error('Database integrity failure');
  const row = db.prepare('SELECT data,digest FROM snapshot WHERE id=1').get();
  const writeSnapshot = db.prepare('INSERT INTO snapshot(id,data,digest) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,digest=excluded.digest');
  const digest = data => createHash('sha256').update(data).digest('hex');
  if (row && digest(row.data) !== row.digest) throw Error('Snapshot checksum failure');
  parentPort.postMessage({ id: 0, data: row?.data ?? null });
  function library(request) {
    if (request.action === 'list') return db.prepare('SELECT data FROM quizzes WHERE data IS NOT NULL ORDER BY revision DESC').all().map(row => JSON.parse(row.data));
    const key = request.quiz?.id ?? request.id;
    const existing = db.prepare('SELECT data,revision FROM quizzes WHERE id=?').get(key);
    if (request.action === 'get') return existing?.data ? JSON.parse(existing.data) : null;
    if (request.action === 'import' && existing) return existing.data ? JSON.parse(existing.data) : null;
    if (request.action !== 'import' && (existing?.revision ?? 0) !== (request.quiz?.updatedAt ?? request.updatedAt)) {
      throw Object.assign(Error('Kuis sudah berubah di tab lain. Muat ulang sebelum mengedit lagi.'), { expected: true });
    }
    if (request.action === 'delete') {
      // Keep the ID so an old browser migration cannot resurrect a deleted quiz.
      if (existing) db.prepare('UPDATE quizzes SET data=NULL,revision=? WHERE id=?').run(Math.max(Date.now(), existing.revision + 1), key);
      return null;
    }
    if (existing && !existing.data) throw Object.assign(Error('Kuis sudah dihapus. Buat kuis baru.'), { expected: true });
    if (!existing && db.prepare('SELECT count(*) AS count FROM quizzes WHERE data IS NOT NULL').get().count >= 500) throw Object.assign(Error('Koleksi penuh (500 kuis). Hapus kuis yang tidak diperlukan.'), { expected: true });
    const quiz = { ...request.quiz, createdAt: existing?.data ? JSON.parse(existing.data).createdAt : request.quiz.createdAt,
      updatedAt: Math.max(Date.now(), (existing?.revision ?? 0) + 1) };
    db.prepare('INSERT INTO quizzes(id,data,revision) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,revision=excluded.revision').run(key, JSON.stringify(quiz), quiz.updatedAt);
    return quiz;
  }
  parentPort.on('message', ({ id, data, close, library: request }) => {
    try {
      if (close) {
        db.close(); parentPort.postMessage({ id }); parentPort.close(); return;
      }
      if (request) {
        const result = library(request);
        parentPort.postMessage({ id, data: result });
        return;
      }
      db.exec('BEGIN IMMEDIATE');
      try {
        writeSnapshot.run(data, digest(data));
        db.exec('COMMIT');
      } catch (error) { db.exec('ROLLBACK'); throw error; }
      parentPort.postMessage({ id });
    } catch (error) {
      parentPort.postMessage({ id, error: error.expected ? error.message : 'Penyimpanan pertandingan gagal. Periksa disk dan restart server.', expected: Boolean(error.expected) });
    }
  });
} catch (error) {
  try { db?.close(); } catch { /* Closing rolls back a failed startup transaction. */ }
  parentPort.postMessage({ id: 0, error: `Database pertandingan tidak dapat dibuka: ${error.message}` });
  parentPort.close();
}
