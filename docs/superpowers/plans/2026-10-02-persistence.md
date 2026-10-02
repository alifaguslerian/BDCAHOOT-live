# 9A: durable local matches

Scope authorized by the user: implement the persistence milestone; no Git mutations.

- Store a versioned private engine snapshot and creation retry records in a local
  SQLite database. SQLite FULL synchronous transactions run in a worker; coalesce
  overlapping changes and acknowledge only after commit. One server owns a database.
- Persist credentials, shuffled question order, answer receipts, scores, revisions,
  join order and room deletion. Never expose private snapshots through HTTP/socket.
- Restore nonexpired rooms before listening. Recover QUESTION/REVEAL to SCOREBOARD;
  keep accepted points and receipts, apply unanswered penalty once, require Host to
  continue. LOBBY/SCOREBOARD/FINAL retain their stage. No replay of an interrupted question.
- Suppress broadcasts of uncommitted state. Storage failure is fail-closed: no success
  ACK, disconnect clients, reject new traffic, log a generic operator error. Corrupt
  or unsupported storage fails startup without replacing the database.
- Tests first: recovery of all phases, idempotency and ties, durable reset/expiry,
  ACK commit barrier, failed writes, exclusive ownership, malformed snapshots, real
  process termination after successful ACK and restart. Use temporary databases.
- Wire persistence into normal startup and endurance harness; measure a persistent
  100-client workload. Run regressions/typecheck/lint/build. Document disk location,
  permissions, recovery policy, operator procedure and remaining 9B/physical tests.

Files: engine snapshot/recovery in server/gameEngine.ts; worker/storage adapter in
server/persistenceWorker.mjs and server/persistence.ts; transport commit barriers in
server/socketServer.ts; bootstrap in server/index.ts; tests and operational docs.
