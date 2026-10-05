import { performance } from 'node:perf_hooks';
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { GameEngine } from '../server/gameEngine';

// Measures snapshot construction and JSON encoding only, not Socket.io transport.
const results = [];
for (const count of [100, 150]) {
  let now = 10000;
  const engine = new GameEngine({ now: () => now });
  const host = engine.createRoom({ title: 'Broadcast audit', questions: Array.from({ length: 40 }, (_, i) => ({
    id: `q${i}`, question: `Question ${i}`, timerSeconds: 5, correctOption: 'B',
    options: ['A','B','C','D'].map(id => ({ id, text: id })),
  })) });
  const players = Array.from({ length: count }, (_, i) => engine.join(host.code, `P${String.fromCharCode(65 + Math.floor(i/26))}${String.fromCharCode(65 + i%26)}`, randomUUID()));
  const sessions = [host, ...players];
  const command = (action: 'start' | 'reveal' | 'scoreboard' | 'next') => engine.command(host, { action, sessionId: host.sessionId, revision: engine.view(host).revision });
  command('start'); now += 5000; engine.tick();
  const samples: { question: number; buildMs: number; encodeMs: number; totalMs: number; jsonBytes: number }[] = [];
  for (let q = 0; q < 40; q++) {
    now += 1000;
    for (const player of players) engine.submit(player, { sessionId:host.sessionId, questionIndex:q, submissionId:randomUUID(), option:'B' });
    command('reveal'); command('scoreboard');
    const start = performance.now();
    const views = sessions.map(s => engine.view(s));
    const built = performance.now();
    const json = views.map(v => JSON.stringify(v));
    const encoded = performance.now();
    samples.push({ question:q+1, buildMs:built-start, encodeMs:encoded-built, totalMs:encoded-start, jsonBytes:json.reduce((sum,s)=>sum+Buffer.byteLength(s),0) });
    if (q < 39) command('next');
  }
  const p95 = (key: 'buildMs' | 'encodeMs' | 'totalMs') => [...samples].map(s=>s[key]).sort((a,b)=>a-b)[37];
  results.push({ players:count, recipients:sessions.length, buildP95Ms:p95('buildMs'), encodeP95Ms:p95('encodeMs'), totalP95Ms:p95('totalMs'), maxJsonBytes:Math.max(...samples.map(s=>s.jsonBytes)), samples });
}
const report = { scope:'40 scoreboard snapshots per size; synthetic quiz; engine.view + JSON.stringify on this machine; excludes Socket.io encoding/framing, TCP, SQLite, browser and Wi-Fi; not a production latency measurement', results };
writeFileSync('reports/audit-broadcast.json', JSON.stringify(report,null,2));
console.log(JSON.stringify(results.map(({samples,...summary})=>summary),null,2));
