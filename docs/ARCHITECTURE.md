# LAN architecture

One Node process serves Next.js and Socket.io. Each room has a synchronous state machine. React displays authoritative state; it is not the game database.

LOBBY -> QUESTION -> REVEAL -> SCOREBOARD -> QUESTION ... -> FINAL

Server ticks every 100 ms to close rounds and end reveals. Every submit also checks deadline synchronously. Time is anchored to performance.now plus startup epoch. Client clock changes cannot alter acceptance. Only authorized Host commands start/advance rounds.

Accepted answers and scores are stored immediately. Counter notifications go only to Host at most 10 Hz; roster/stage changes produce snapshots. No full-room broadcast per answer. Ranking is calculated on round close. Scoring uses server response duration and join sequence.

Every game has a session ID, every participant a random token, every answer a client-generated 128-bit submission ID. A repeated accepted submission returns its original receipt. Conflicting answers cannot overwrite it. Host commands use expected revision. Creation retries use an idempotency ID.

The client keeps pending submissions in sessionStorage. Missing ACK means unknown outcome. Reconnect resumes identity, obtains current state and retries the same answer when needed. Own receipts restore locks. Snapshots omit future questions, secrets, current-round points before reveal and other players' histories.

One interval handles all rooms. Reset deletes room credentials; kick invalidates a player in lobby. Inactive rooms expire after six hours. Client unmount removes listeners. State survives browser refresh but not process restart. Multi-process hosting and persistent recovery are outside this implementation.

Tests import production modules; socket tests use real connections with accelerated game time. Run npm test and rehearse on event Wi-Fi before use.
