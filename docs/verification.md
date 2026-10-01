# Verification — 29 September 2026

- npm test: 16/16 tests passed against the production engine and Socket.io transport.
- Transport run: 100 sockets, 40 questions, 4,000 submissions. Latest run ACK p95 33.79 ms and p99 38.09 ms on loopback. Question clock is accelerated; this is not a 100-phone rendering or Wi-Fi benchmark.
- npm run typecheck and npm run lint: passed.
- npm audit: zero reported dependency vulnerabilities at verification time. This is not a guarantee against application vulnerabilities.
- Browser: production build on port 3101, Host through localhost and player through the machine LAN HTTP address. Created room, joined player, started question, submitted answer, refreshed player during active question and retained confirmed selection; refreshed Host and retained scoreboard and score.
- Earlier browser pass in this implementation also exercised all three seed questions through final podium.
- Fixed hydration mismatch in settings; browser console showed no new hydration error after reload. Library and editor now defer localStorage reads until mount as well.

Not yet verified: 50–100 physical phones, long wall-clock memory profiling, Wi-Fi interference/background suspension on target mobile browsers, and process-crash recovery. Server state is in memory and does not survive process restart.

## 30 September 2026 — tahap 8A

- 19/19 automated tests passed, including the existing 100-socket/40-question run.
- New regression tests failed before the fixes: lobby leave had no handler; the sound service had no global mute control.
- Transport tests now cover freeing a lobby name, rejecting old credentials, repeated leave requests, rejecting Host misuse and mid-game leave, and retaining final rankings when a player leaves.
- Audio tests use a stub AudioContext to verify all effects respect mute, the output is silenced, the tab preference is restored, and completed oscillator/gain nodes disconnect. They do not measure physical speaker output.
- Typecheck, lint and production build passed after the navigation fix. Build emits a Node module.register deprecation warning; startup emits an experimental localStorage warning. Neither failed execution.
- Production browser test on localhost:3102: create room, join ALDI, mute, refresh (mute remains selected), leave lobby (Host count becomes zero), return to the code-entry page, and rejoin the same room as ALDI successfully.
- Browser testing exposed a race between intentional leave and the missing-session redirect. After the fix, explicit leave reaches /player/join.
- Stopping the test server changed the lobby indicator to "Server belum terhubung" instead of retaining the old connected label.
- No commit, push, branch or GitHub mutation performed in this stage.

Pending: broader fault injection in 8B, real-duration resource profiling in 8C, and mobile/router rehearsal. No claim of full readiness or zero memory leaks.

## 1 October 2026 — tahap 8B

- 26/26 automated tests passed, including seven new recovery tests using the production React GameProvider in JSDOM connected to the production Socket.io server. Existing engine and 100-socket/40-question tests also passed.
- Reproduced two failures before fixing them: a lost join ACK followed by refresh prevented retrying with the same player name; a delayed session-ended event could clear an unrelated current session.
- Join request IDs now survive refresh through sessionStorage. Session-ended events carry room/player identity and the client ignores events for other sessions. Reconnect synchronization discards stale completions from an earlier connection attempt.
- Recovery tests cover lost join ACK plus refresh, stale session-ended events and a real kick, lost resume ACK plus automatic retry and repeated reconnects, answer delivery after the deadline, lost answer ACK plus reconnect, an old question ACK arriving after the next answer, and visibilitychange recovering missed question updates.
- Deadline transitions use an accelerated authoritative game clock. ACK timeouts and socket reconnects run through the real transport. The visibility test dispatches a DOM event and suppresses room updates; it does not reproduce operating-system suspension or a physically locked phone.
- npm run typecheck, npm run lint and the production build passed. The build still reports the Node module.register deprecation warning. npm audit --omit=dev reported zero vulnerabilities at verification time.
- JSDOM and its types are development dependencies, not part of the client bundle. Supported Node versions are now ^22.22.2, ^24.15.0 or >=26.0.0 to meet the DOM test environment requirements; package metadata and README agree.
- No commit, push, branch or GitHub mutation performed in this stage.

Pending: 8C real-duration CPU/memory/latency profiling, physical mobile background/lock and router rehearsal, and server restart recovery. These tests do not establish readiness for 100 physical phones or guarantee zero memory leaks. Server room state remains in memory.

## 1 October 2026 — tahap 8C, endurance server lokal

Command: `npm run test:endurance -- --report=reports/endurance-100x40.json`.
Run started 06:32:21 WIB (2026-09-30 23:32:21 UTC), Windows, Node v26.10.0,
Intel Core i5-12450HX, 12 logical CPUs. Exit code 0. Report contains 423 samples;
the reports directory is local and ignored by Git.

The harness runs production Socket.io and GameEngine in a separate Node process
from the clients, with the real authoritative clock. It does not start Next.js or
render React. The server and generator still share the same machine. No other
build/test command was run concurrently with the full endurance run.

| Measurement | Result |
| --- | --- |
| Players / live connections during game | 100 players + 1 Host / 101 throughout sampled game |
| Questions / accepted answers | 40 / 4,000 |
| Timing per question | 5 s answering + 4 s reveal + 1 s scoreboard, plus actual scheduling/transport overhead |
| Total wall-clock duration | 419.79 s (about 7 minutes), including baseline and cleanup |
| Unexpected disconnects | 0 |
| ACK p50 / p95 / p99 / maximum | 3.96 / 5.98 / 9.93 / 13.09 ms |
| Game CPU average / peak sampled | 1.65% / 22.43% of one core |
| Join burst CPU | 89.72% of one core over a 261 ms joining phase |
| Game sampled peak RSS / heap | 158.10 / 45.11 MiB |
| Final game heap / post-reset heap | 42.46 / 19.02 MiB |
| Baseline heap | 10.90 MiB |
| Game event-loop maximum delay | 66.72 ms |
| Largest sample-window event-loop p99 | 24.66 ms (10 ms monitor resolution) |
| Room / socket count after reset and disconnect | 0 / 0 |

Every question waits for all clients to receive QUESTION and SCOREBOARD; all clients
must receive FINAL. The run checks that correct answers are hidden while active,
all answers were counted, each player has 40 answer records, individual points match
the specified scoring formula, and player totals agree with the Host. A small
3-player/1-question smoke run passed before the full run. Its first attempt caught
a harness mistake: answer history must be checked through each player's own view,
not the Host's deliberately redacted view. No production privacy rule was changed.

Interpretation: this workload completed with low average server CPU and short
loopback ACK times. Joining caused a brief CPU burst, and event-loop delay was not
zero. Memory is sampled once per second plus phase boundaries, so brief peaks can
be missed. Heap fell after cleanup without forced GC, but remained above baseline;
one match and five seconds of cleanup do not prove absence of leaks. RSS did not
return to baseline. Longer sessions and repeated room lifecycles are still useful.
`passed` confirms the functional assertions, not a universal performance threshold.

26/26 regression tests, typecheck, lint and production build passed. The build still
emits the Node module.register deprecation warning. The harness adds no runtime
dependencies and does not change game behavior. No commit, push, branch or GitHub
mutation was performed.

Still pending in 8C: browser/UI profiling and longer representative match durations.
Physical-phone Wi-Fi/background rehearsal and process-crash recovery also remain
pending. This is not a 100-phone benchmark or a deployment-readiness certification.
