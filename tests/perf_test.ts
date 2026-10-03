import { GameEngine } from '../server/gameEngine';
import { randomUUID } from 'node:crypto';

const engine = new GameEngine();

function numToLetters(num: number): string {
  let str = '';
  while (num >= 0) {
    str = String.fromCharCode(65 + (num % 26)) + str;
    num = Math.floor(num / 26) - 1;
  }
  return str;
}

for (let r = 0; r < 16; r++) {
  const host = engine.createRoom({
    title: `Room ${numToLetters(r)}`,
    questions: Array(40).fill(0).map((_, i) => ({
      id: `q${i}`, question: `Q${i}`, options: [{id: "A", text: "A"}, {id: "B", text: "B"}, {id: "C", text: "C"}, {id: "D", text: "D"}], correctOption: "A", timerSeconds: 10
    }))
  });
  const players = [];
  for (let p = 0; p < 150; p++) {
    players.push(engine.join(host.code, numToLetters(p), randomUUID()));
  }
  let rev = engine['rooms'].get(host.code)!.revision;
  engine.command(host, { action: "start", revision: rev, sessionId: host.sessionId });
  
  for (let q = 0; q < 40; q++) {
    for (const p of players) {
      engine.submit(p, { sessionId: host.sessionId, questionIndex: q, submissionId: randomUUID(), option: "A" });
    }
    let t = engine.serverTime();
    engine['now'] = () => t + 11000;
    engine.tick(); // reveal
    rev = engine['rooms'].get(host.code)!.revision;
    engine.command(host, { action: "scoreboard", revision: rev, sessionId: host.sessionId });
    if (q < 39) {
      rev = engine['rooms'].get(host.code)!.revision;
      engine.command(host, { action: "next", revision: rev, sessionId: host.sessionId });
    }
  }
}

const start = performance.now();
const snap = engine.snapshot();
console.log("Snapshot time:", performance.now() - start, "ms");

const v8 = require('v8');
const sstart = performance.now();
const buf = v8.serialize(snap);
console.log("Serialize time:", performance.now() - sstart, "ms, size:", buf.length);
