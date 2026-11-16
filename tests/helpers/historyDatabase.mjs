import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';

const [path, action] = process.argv.slice(2);
const db = new DatabaseSync(path);
try {
  if (action === 'legacy') {
    db.exec('CREATE TABLE snapshot(id INTEGER PRIMARY KEY, data BLOB NOT NULL, digest TEXT NOT NULL); CREATE TABLE quizzes(id TEXT PRIMARY KEY, data TEXT, revision INTEGER NOT NULL); PRAGMA user_version=1;');
    const data = Buffer.from('old-snapshot');
    db.prepare('INSERT INTO snapshot VALUES(1,?,?)').run(data, createHash('sha256').update(data).digest('hex'));
    db.prepare('INSERT INTO quizzes VALUES(?,?,?)').run('old-quiz', JSON.stringify({ id: 'old-quiz', title: 'Keep this quiz', questions: [], updatedAt: 7 }), 7);
  } else if (action === 'fail-result') {
    db.exec("CREATE TRIGGER reject_result BEFORE INSERT ON match_results BEGIN SELECT RAISE(ABORT, 'injected result failure'); END;");
  } else if (action === 'fail-snapshot') {
    db.exec("CREATE TRIGGER reject_snapshot BEFORE UPDATE ON snapshot BEGIN SELECT RAISE(ABORT, 'injected snapshot failure'); END;");
  } else if (action === 'inspect') {
    console.log(JSON.stringify({ snapshot: Buffer.from(db.prepare('SELECT data FROM snapshot').get().data).toString(),
      results: db.prepare('SELECT count(*) AS n FROM match_results').get().n,
      version: db.prepare('PRAGMA user_version').get().user_version }));
  } else throw Error('Unknown action');
} finally { db.close(); }
