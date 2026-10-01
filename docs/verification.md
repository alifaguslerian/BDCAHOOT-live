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
