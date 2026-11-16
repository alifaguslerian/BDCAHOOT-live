# Match history and CSV verification — 16 November 2026

## Delivered behavior

- A completed game creates one immutable archive, keyed by the server's unique
  match/session ID. Quiz IDs, titles, and room codes can be reused without replacing
  earlier results. Repeated persistence requests do not duplicate an archive.
- The engine captures results after scoring the final question. The SQLite worker
  inserts the archive and updates the recovery snapshot in the same transaction.
  Pending results survive room removal while a commit is being prepared.
- The operator library links to a paginated history list and full-ranking detail.
  The podium offers a CSV download after all podium places are revealed. Both
  download paths use the persisted result, rather than recalculating points.
- Archived records contain quiz identity/title, timestamps, participant/question
  counts, ranks, points, response-time totals, and correct/wrong/unanswered counts.
  Tokens, answer keys, and per-question answer payloads are excluded.
- History reads use existing operator authentication and request limits. A current
  room host can retrieve only that room's result using its existing host session.
  Players cannot use that endpoint or browse history without operator credentials.
- SQLite schema 1 migrates to 2 automatically. Existing quizzes and room snapshots
  are preserved. Legacy rooms without history metadata do not gain invented results.

The scoring formula, tie-break order, answer deadlines, question flow, and podium
reveal sequence were not changed. Cancelled and partially played matches are outside
the archive scope. See [operations](OPERATIONS.md#match-history-and-csv-results) for
backup, upgrade, and recovery details.

## Automated regression evidence

Environment: Windows, Node.js 26.10.0, Next.js 15.5.25. Tests use disposable databases
or explicitly named files under ignored `reports/`; the event database is not used.

| Check | Result |
| --- | --- |
| Baseline `npm test`, before implementation | 63 passed |
| Final `npm test` | 73 passed, 0 failed |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `NODE_ENV=production npm run build` | Passed, including both history routes |
| `git diff --check` | Passed |

The ten new tests cover exact rankings and answer counts, repeated quiz/room codes,
early cancellation, recovery, immutable/idempotent archives, cursor pagination with
timestamp ties, quiz deletion, migration, operator authorization, a same-turn room
closure race, and CSV escaping/filename safety. Fault-injection triggers reject
either the result insert or snapshot update; both paths roll back the entire write.

The existing socket regression still exercises 100 real Socket.io clients across
40 accelerated questions and 4,000 answer submissions. Its timing is not a standalone
performance benchmark because the test suite can execute other tests concurrently.

## Production Chrome evidence

| Script | Observed result |
| --- | --- |
| `check-match-history.py` | 21 seeded matches; 20/1 pagination; missing-result state; full rankings; identical CSV from history/podium; offline download retry; refresh; mobile layout; room closure; quiz deletion; restart and fresh browser. No page errors. |
| `check-podium-transition.py --faults` | One- and two-question games; missing command, lost ACK, rapid clicks, reconnect, refresh, and podium order passed. No page errors. |
| `check-network-recovery.py` | Countdown/question refresh, confirmed-answer recovery, asymmetric delay/jitter, and late-answer rejection passed. No page errors. |
| `check-quiz-library.py` | Create/edit/save, navigation before debounce, stale-tab rejection, offline retry, restart/different origin, and room creation passed. No page errors. |
| `check-player-layout.py` | Desktop and phone-sized checks passed; no horizontal overflow or page errors. |

The history browser fixture constructs completed matches through the real engine
and SQLite worker. Live Socket.io archival is tested separately by the integration
tests and endurance harness. Screenshots and raw reports stay in ignored `reports/`.

## Endurance verification

The production endurance run uses 100 participants (99 Socket.io bots plus one
Chrome player), a Chrome host, 40 questions, real five-second question timers,
SQLite persistence, and 4× CPU throttling on the player renderer. The harness also
compares the stored archive with the authoritative final rankings and retrieves
the identical archive after room closure. The final run **passed**, with no other
build or test process running alongside it.

| Measurement | Final run |
| --- | --- |
| Duration | 499.34 seconds (about 8 minutes 19 seconds) |
| Questions completed | 40/40 |
| Accepted answers | 4,000: 3,960 socket-bot answers and 40 browser answers |
| Unexpected client disconnects | 0 |
| Chrome page/console errors | 0 / 0 |
| Archives checked after room closure | 1, with all 100 participants and exact rankings/statistics |
| Active rooms / sockets after cleanup | 0 / 0 |
| Bot answer ACK p50 / p95 / p99 / max | 36.56 / 56.14 / 58.79 / 59.30 ms |
| Server game CPU, average / peak | 4.19% / 29.66% of one core |
| Server peak RSS / heap during game | 329.25 / 85.02 MiB |
| Highest sampled event-loop p99 / max delay | 28.56 / 113.25 ms |
| Browser click-to-confirmed-DOM p95 / max | 230.31 / 258.13 ms, including Playwright and 4× player CPU throttling |

After shutdown, a read-only SQLite check confirmed database integrity and the same
single 100-participant archive. A preceding two-participant, two-question browser
run also passed the corrected harness, including archive retrieval after closure.

Raw local evidence: `reports/history-endurance-2026-11-16-ef4f9388.json`, its
`.browser.json` companion, and matching `.sqlite` file. These are test artifacts in
the ignored reports directory, not event data. Server CPU measurements exclude the
Chrome processes. Server GC was not forced; browser GC ran only after gameplay as
a diagnostic. The run establishes these measured outcomes, not an indefinite
memory-leak guarantee or a comparison against identical pre-change conditions.

## Test maintenance and limits

- The old single-browser endurance script expected `Klasemen` on the last round.
  A short two-question reproduction failed because the correct application screen
  was `Menunggu podium juara`. The harness now checks that final waiting screen and
  a rank-independent scoreboard label on earlier rounds. Gameplay was not changed
  to satisfy the outdated test. The initial full run was stopped before continuing.
- The offline download check initially selected both the application alert and
  Next.js's route announcer. Its selector was narrowed to the application's alert;
  the corrected browser check passed, including reconnect and retry.
- The first completed 100-participant run reached all 40 questions, 4,000 accepted
  answers, and a passing Chrome report, but the new archive comparator incorrectly
  read per-question answers from the host view. That view intentionally redacts
  answer details. The run therefore failed its final assertion and is not counted
  as a passing endurance run. Read-only inspection of its SQLite archive confirmed
  one record, 100 participants, 40 questions, and the expected answer counts (99 bots
  with 30 correct/10 wrong; one browser player with 40 correct). The comparator was
  corrected to use the test's submitted-answer pattern and independently verified
  player receipts. No application scoring or archive behavior was changed for this.
- The initial sandboxed test attempt could not complete local socket checks. The
  baseline and final suite were run outside the sandbox with the required access.
- Browser viewports and localhost clients do not reproduce 100 physical phones,
  radio interference, or all mobile background restrictions. Passing these scenarios
  does not prove zero possible defects or unlimited history capacity.
- No application dependencies, HTTP transport policy, Git branches, commits, or
  pushes were changed as part of this implementation.
