import { GameEngine } from '../server/gameEngine';
import { randomUUID } from 'node:crypto';

const engine = new GameEngine();
const hostSession = engine.createRoom({
  title: "Test",
  questions: [
    { id: "q1", question: "Q1", options: [{id: "A", text: "A"}, {id: "B", text: "B"}, {id: "C", text: "C"}, {id: "D", text: "D"}], correctOption: "A", timerSeconds: 10 },
    { id: "q2", question: "Q2", options: [{id: "A", text: "A"}, {id: "B", text: "B"}, {id: "C", text: "C"}, {id: "D", text: "D"}], correctOption: "A", timerSeconds: 10 }
  ]
});

const p1 = engine.join(hostSession.code, "P1", randomUUID());
engine.command(hostSession, { action: "start", revision: 1, sessionId: hostSession.sessionId });

let t = engine.serverTime();
engine['now'] = () => t + 11000;
engine.tick(); 

engine.command(hostSession, { action: "scoreboard", revision: 2, sessionId: hostSession.sessionId });

const p2 = engine.join(hostSession.code, "P2", randomUUID());

engine.command(hostSession, { action: "next", revision: 3, sessionId: hostSession.sessionId }); 

t = engine.serverTime();
engine['now'] = () => t + 11000;
engine.tick();

engine.command(hostSession, { action: "scoreboard", revision: 4, sessionId: hostSession.sessionId });

const view = engine.view(hostSession);
console.log("P1 time:", view.players[p1.playerId!].totalResponseTimeMs);
console.log("P2 time:", view.players[p2.playerId!].totalResponseTimeMs);
console.log("Ranks:", view.rankings.map(r => `${r.name}: ${r.totalResponseTimeMs}ms`));
