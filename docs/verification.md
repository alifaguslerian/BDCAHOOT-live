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

## 1 October 2026 — penyelesaian verifikasi lokal 8C

### Production browser and longer match

`npm run test:endurance -- --browser --players=100 --questions=40 --seconds=15 --report=reports/endurance-ui-100x40.json`

Started 11:03:01 WIB. Exit 0 after 885.35 seconds (14 minutes 45 seconds).
This run loads the production Next.js build and Socket.io in the measured server
process. It uses 99 socket bots plus one actual headless Chrome player page, a Chrome
Host page, and one extra Host observer socket. There are 100 registered players,
not 100 browser tabs or phones. Chrome 154.0.8037.58 runs on the same Windows laptop;
player viewport is 390×844 with 4× renderer CPU throttling, Host viewport 1440×900.
Background throttling is disabled for these active-page rendering measurements.

The Host clicks Start and all Continue/Podium buttons through the UI. The browser
player clicks answer B on every question and waits for the confirmed-answer text.
All 40 scoreboards and final state are reached, 3,960 bot answers plus 40 browser
answers are accepted, and all player histories/totals are checked. The browser
player's final screenshot shows 40/40 correct answers and 78,198 points. There are
zero unexpected observer/bot disconnects, JavaScript page errors, console errors,
or horizontal overflow in the sampled scoreboards. No concurrent build/test command
ran during this full measurement.

| Measurement | Host | Player (CPU 4×) |
| --- | --- | --- |
| Long tasks (>50 ms), count / maximum | 0 / none observed | 5 / 114 ms |
| Frame interval p95 / maximum | 16.80 / 83.30 ms | 16.80 / 133.40 ms |
| Observed Event Timing entries p95 / maximum | 32 / 48 ms | 48 / 112 ms |
| Sampled scoreboard JS heap range | 5.39–8.81 MiB | 4.90–6.03 MiB |
| Post-game heap after diagnostic GC | 5.80 MiB | 5.26 MiB |
| Post-game DOM nodes / JS event listeners after diagnostic GC | 241 / 311 | 130 / 312 |

Player automation action-to-confirmed-DOM time: p95 100.47 ms, maximum 146.94 ms
over 40 actions. It includes Playwright driver/actionability/polling overhead and is
not network RTT or INP. Event Timing only records qualifying observed entries; it
is not a page-level INP assessment. Frame/long-task probes start after lobby setup.
There were measurable short stalls, so this does not establish zero lag.

Server during the game: average CPU 0.75% of one core, peak sampled RSS 229.23 MiB,
peak sampled heap 79.08 MiB, bot ACK p95/p99 4.10/7.30 ms, event-loop maximum delay
45.74 ms. Server heap after reset was 69.41 MiB versus 57.03 MiB baseline; room/socket
counts were zero. These numbers include Next.js and use longer idle periods between
answers, so they are not an optimization comparison with the earlier engine-only run.
No server GC was forced. Browser GC was forced only after the match/timing capture,
as a separate retention diagnostic. The raw report's scope shorthand "no forced GC"
refers to server/match execution; its browserReport explicitly records that diagnostic.

Browser reports and screenshots are under `reports/`, ignored by Git. Initial
screenshots captured entry animations before completion; the harness now waits for
those animations and explicitly checks the Host podium page before capture. This is
a test-evidence correction, not a production rendering change.
The subsequent three-player/two-question visual check passed, and the captured
Host screenshot after the wait shows all three podium places. Browser heap figures
include the lightweight measurement probes themselves.

### Repeated room lifecycle

`npm run test:endurance -- --players=100 --questions=2 --rounds=5 --report=reports/endurance-lifecycle.json`

Exit 0 after 132.36 seconds. Five distinct room lifecycles run in one engine/Socket.io
process, with 100 players and two real-duration questions per room: 1,000 answers
total, no unexpected disconnects, and zero rooms/sockets after every reset/disconnect.
This complements the 40-question runs; each lifecycle round is not a 40-question match.

| Cleanup after round | Heap MiB | Rooms | Sockets |
| --- | --- | --- | --- |
| 1 | 19.52 | 0 | 0 |
| 2 | 14.34 | 0 | 0 |
| 3 | 14.45 | 0 | 0 |
| 4 | 27.96 | 0 | 0 |
| 5 | 18.14 | 0 | 0 |

Heap was not monotonically increasing across these cleanup samples; RSS still grew
overall. No forced server GC or heap-snapshot retainer analysis was performed, so
this is bounded evidence of cleanup, not proof that every leak is absent.

Local 8C coverage is complete for the documented scenarios. Next implementation phase
is 9A persistence. Physical 50–100 phone/router rehearsal, real mobile suspension,
different hardware/browsers and process-crash recovery remain separate unverified
acceptance conditions. No Git mutation was performed.

Final checks after these harness changes: 26/26 regression tests, typecheck, lint,
and production build passed. Lint initially scanned third-party Playwright files in
reports/python; reports is now excluded from both ESLint and TypeScript project
inputs, and both checks were rerun successfully. The existing Node module.register
deprecation and localStorage experimental warnings remain non-fatal.

## 2 October 2026 — phase 9A persistence

Normal server startup now opens a private SQLite database before listening. A worker
owns the database, uses synchronous=FULL transactions and exclusive ownership, and
stores versioned engine snapshots plus room-creation retry records. Success ACKs and
state broadcasts wait for commit. Concurrent writes are coalesced; the prepared
write statement is reused. No extra runtime npm dependency was introduced; this uses
the Node SQLite API in the supported runtime. See [Node SQLite documentation](https://nodejs.org/api/sqlite.html).

Recovery preserves credentials, shuffled question order, players, scores, join
sequence and answer receipts. Nonexpired QUESTION/REVEAL rooms become SCOREBOARD,
retaining accepted answers and applying unanswered time penalties only once. Other
stages are retained. The normalized recovery snapshot is committed before listening.
Reset/deletion is durable. Corrupt/unsupported storage fails startup; write failure
disconnects clients and rejects new gameplay instead of confirming uncommitted data.

Verification:

- Tests initially failed because persistence did not exist. Seven new test cases now
  cover stage recovery/expiry, receipts and score preservation, exclusive database
  ownership, corrupt-file preservation, unsupported snapshot versions, durable reset,
  creation/join retries, commit-gated ACK/broadcast, write failure, and shutdown.
- A real child server accepted 100 simultaneous player answers and returned successful
  ACKs. The test forcibly killed its process without graceful close, restarted against
  the same database, and verified all 100 answers and identical receipts/scores on retry.
- A concurrent-close regression initially timed out: two close calls raced while the
  worker was stopping. Sharing one close promise fixed it; the test now passes.
- The complete regression suite has 33 tests. Typecheck, lint and production build
  also passed. The storage-failure log in the test output is intentional fault injection.
- Production-browser smoke with SQLite enabled: three players (two bots + browser),
  two questions, six accepted answers, scoreboard and podium reached, no JavaScript
  or console errors. Report: reports/9a-ui-smoke.json. This smoke is not a browser
  crash/restart rehearsal or a repeat of the full 8C browser profile.

### Durable-write endurance

Command for the final run:
`npm run test:endurance -- --players=100 --questions=40 --seconds=5 --database=reports/phase9a-final.sqlite --report=reports/endurance-9a-durable-final.json`

Windows / Node v26.10.0 / i5-12450HX, same local machine as 8C. Started 10:05:13 WIB.
No other build/test ran concurrently. These are real socket bots on loopback with
actual SQLite commits and real clocks, not physical phones. CPU covers the process
including its storage worker; RSS includes workers/native allocations, while the
reported JS heap is the sampling thread's heap, not all worker heaps combined.

| Measurement | Final run |
| --- | --- |
| Duration / questions / accepted answers | 421.17 s / 40 / 4,000 |
| Unexpected disconnects | 0 |
| ACK p50 / p95 / p99 / maximum | 35.98 / 57.61 / 266.17 / 268.48 ms |
| Game CPU average / peak sampled (one-core scale) | 3.40% / 37.79% |
| Game sampled peak RSS / sampling-thread heap | 254.36 / 45.10 MiB |
| Game event-loop maximum | 116.13 ms |
| Cleanup room / socket count | 0 / 0 |

The earlier durable run (reports/endurance-9a-durable.json) also passed 4,000 answers,
but prepared a new statement for each write: peak sampled RSS 296.27 MiB, ACK p95
57.73 ms and p99 248.25 ms. Reusing the statement lowered the observed peak in the
second run; p99 and average CPU did not improve. One run per version is not a robust
causal benchmark or evidence of a universal speedup. Memory fell during both runs,
so the earlier growth was not established as a permanent leak.

Persistence has a measurable ACK cost compared with the memory-only 8C run. The
optimistic client UI remains immediate, but durable confirmation is not zero-delay.
Both runs used five-second questions plus reveal/scoreboard and no forced server GC.
No claim is made about performance on slower disks, a full 100-phone LAN, or absence
of all memory leaks.

Phase 9A local acceptance is complete. Phase 9B still needs broader in-flight crash,
storage-stall/failure and malicious-input testing; physical router/phone rehearsal
and hardware power-loss testing remain unverified. Default database path is
data/game.sqlite; protect its tokens/answer keys and backups. Operations and recovery
policy are documented in README and SECURITY. No commit, push or branch mutation.

## Phase 9B — recovery and adversarial transport (2 October 2026)

Found and reproduced: while persistence was stalled, valid requests accumulated
waiting for flush with no deadline or in-flight limit. The regression test initially
failed with zero rejected requests out of a 40-request burst behind a stalled write.
The server now caps pending handlers at eight per connection and 1,000 globally,
rejects excess before mutation, and stops transports after a five-second commit timeout.
No successful ACK is emitted for the timed-out pending operation.

Verification: `npm test` passed 39/39; `npm run typecheck`, `npm run lint`, and
`npm run build` passed. Expected injected storage-failure logs appear in tests.
Node emitted its existing module.register deprecation warning during build.

New cases:
- A held persistence write plus 40 requests triggers backpressure, then disconnects
  with no successful ACK. Fault injection uses the production Persistence interface.
- A real child server is killed after a join reaches persistence but before it is
  written. Restart preserves the previous committed room and omits that unconfirmed join.
- A separate SQLite writer changes the real snapshot row in an open transaction
  using DELETE journal/FULL sync and a small cache, then is killed. Production
  SnapshotStore reopens the database and retrieves the previous committed bytes.
  This exercises hot-journal rollback, not every timing point inside COMMIT itself.
- Two connections sharing one player token submit conflicting answers: exactly one
  succeeds. Kick revokes the token on both connections; reconnect cannot restore it.
- A burst of 400 malformed resume packets is rejected/rate-limited while another
  connection can create and resume a room.
- A foreign Origin handshake is rejected; a 300 KiB packet disconnects its sender
  while another connection remains usable.

Existing tests also reran: injected write rejection (disk-full equivalent at the
interface), 100 confirmed answers surviving process kill, idempotent receipt retries,
and 100 sockets × 40 questions with accelerated clock. These runs are correctness
checks, not a new wall-clock performance benchmark. The 9A performance numbers remain
historical measurements of that version.

Local 9B acceptance is complete for these scenarios. Physical disk exhaustion,
hardware power loss, a filesystem call that never returns, coordinated reconnect
floods, and physical 50–100-phone/router behavior remain outside this verification.
A late write can commit after its timeout; recovery uses persisted state, not an
assumption that missing ACK means lost data. No Git mutations were performed.

## Self-audit follow-up — entry recovery, question clock, resume, sample keys

The four findings were reproduced before changes:
- Real join/name page components under Next router contexts did not route a recovered
  player to the active arena. Both entry pages now use ResumePlayerSession; active
  player identity, ready state, requested room code and explicit leave are checked.
- A five-second question with a simulated 1.5-second opening commit had only 3.5 seconds
  remaining at confirmation. Persistence-enabled engines now commit a QUESTION intent
  with null start/end, reject answers/advancement while preparing, then activate the
  runtime clock after commit. The active clock is saved with subsequent mutations or
  checkpoints. A crash before then closes the durable intent to scoreboard as before.
  Tests cover first/next question, rejecting early submissions, full duration, scoring,
  and recovery of a prepared intent. Network/publication delay is not eliminated.
- A player resume caused an unrelated Host to receive a full room broadcast. Binding
  now flags only that socket for state delivery, while genuine room changes still
  broadcast normally. Resume ACK reads the view after commit/clock activation.
- New browser storage was populated with public sample questions and answers. Removed
  the sample arrays from quizStore and the separate Host management screen. Empty
  libraries stay empty, and existing local Host quizzes remain intact. Production
  browser chunks were searched for sample question/title markers with no matches.
  This does not make previously published sample material secret again.

Verification: 51/51 tests passed; production build, lint and typecheck passed.
The entry-page tests use React/JSDOM with actual page components and a router test
adapter, not a physical Android/iOS browser. Existing 100-socket/40-question regression
and SQLite crash tests also passed. No claim of universal event readiness or zero lag.

Production browser smoke: `npm run test:endurance -- --browser --players=100
--questions=3 --seconds=5 --database=reports/self-audit-fixes-smoke.sqlite
--report=reports/self-audit-fixes-smoke.json` passed in 52.84 seconds. This used 99 bots,
one Chromium player and a Chromium Host with SQLite enabled; 300 accepted answers,
zero unexpected disconnects, no page/console errors, and zero rooms/sockets after cleanup.
Player CPU was throttled 4×. This is a three-question functional smoke test, not a
repeat of the 40-question duration benchmark or proof of 100 physical-phone capacity.
