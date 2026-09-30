# LAN engine implementation

The user authorized taking over implementation after reviewing the audit and the six-part remediation proposal. Preserve the current quiz editor and presentation; replace the shared-tab simulation with one authoritative Node process and Socket.io on the same HTTP origin.

## Requirements and decisions

- Support 100 players and at least 40 questions in automated tests of the real engine and transport.
- Server owns identity, deadlines, scoring, stage transitions, first-answer lock and join sequence. Client timestamps never decide acceptance.
- Room creation requires a server operator key printed on startup (or HOST_KEY environment variable). Room codes are not host credentials.
- Player payloads contain only the active question; the correct option is revealed after submission closes. Private answer history belongs only to its player.
- Answer retry is idempotent. Refresh/reconnect restores server state and player credentials from sessionStorage. Unknown transport outcome retains the submission for retry.
- Question close and reveal timers run independently of the browser Host. Host advances from scoreboard; last scoreboard leads to final podium.
- In-memory server state survives browser refresh but not process restart. Do not claim crash durability. Expire inactive rooms and bound payloads, participants, requests and session data.
- Keep work on codex/lan-engine. No publish, merge or deployment is part of this task.

## Implementation checklist

- [x] Domain engine (`server/gameEngine.ts`): failing production tests first, atomic answer acceptance, projection, clock, lifecycle and rankings.
- [x] Transport (`server/socketServer.ts`, `server/index.ts`): same-origin sockets, operator key, session binding, rate/size limits, lifecycle cleanup, real socket tests.
- [x] Client (`context/GameContext.tsx`, existing pages): asynchronous ACKs, reconnect, room join by code, server-driven stages, remove simulation controls.
- [x] Replace self-contained mock test scripts with imports of production engine and 100-client/40-question transport endurance tests.
- [x] Run typecheck, lint, production build, browser flow and security/reconnect tests; review the final implementation and fix findings.
- [x] Remove unused bus/contracts/demo paths and obsolete dependencies only after checking references. Document startup and measured limitations.

Shared contract: `types/network.ts`. Engine implementation and UI integration are independent against that contract; root owns transport, dependency changes, integration and final verification.

