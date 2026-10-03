import { GameEngine } from '../server/gameEngine';
import { randomUUID } from 'node:crypto';

const engine = new GameEngine();
const hostSession = engine.createRoom({
  title: "Test",
  questions: [
    { id: "q1", question: "Q1", options: [{id: "A", text: "A"}, {id: "B", text: "B"}, {id: "C", text: "C"}, {id: "D", text: "D"}], correctOption: "A", timerSeconds: 10 }
  ]
});

for (let i = 0; i < 1000; i++) {
  const reqId = randomUUID();
  const playerSession = engine.join(hostSession.code, "A", reqId);
  engine.leave(playerSession);
}

try {
  engine.join(hostSession.code, "B", randomUUID());
  console.log("SUCCESS");
} catch (e) {
  console.error("FAILED TO JOIN:", (e as Error).message);
}
