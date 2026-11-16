# Testing guide

[Back to README](../README.md)

## Regression checks

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

Tests import the production engine, Socket.io server, and client recovery code.
They cover scoring, deadlines, duplicate answers, authorization, malformed packets,
session recovery, SQLite commits, and process termination. The socket test uses
100 real connections across 40 questions, with accelerated game time and 4,000
submissions. This is not 100 rendered browser pages.

For a dependency advisory check, run `npm audit` when network access is available.
Its output is time-dependent and does not audit application logic.

## Browser checks

Install Python, Google Chrome, and the isolated Playwright dependency, then build:

```sh
python -m pip install --target reports/python playwright==1.63.0
npm run build
python scripts/check-player-layout.py reports/player-layout.json
python scripts/check-network-recovery.py
python scripts/check-quiz-library.py
python scripts/check-podium-transition.py --faults
python scripts/check-match-history.py
```

Run these individually. Each script starts and stops its own production server
with a temporary SQLite database. Ports are 3137 for layout, 3133 for network
recovery, 3127 for the library, 3138 for the podium, and 3142 for match history. Results go in `reports/`,
which Git ignores.

The podium check exercises a missing command, lost ACK, rapid clicks, offline host,
player reconnect, refresh, and the 3 → 2 → 1 reveal. Network fault injection operates
on protocol messages and browser connectivity; it does not reproduce radio loss.
Phone-sized viewports do not reproduce the CPU or operating system of a real phone.

The history check seeds 21 completed demo matches through the actual engine and
SQLite worker, then checks pagination, all ranking rows, matching CSV downloads
from podium/history, offline download retry, refresh, mobile layout, room closure,
quiz deletion, and restart with a fresh browser. Its fixture never uses event data.
The history unit/integration tests cover live Socket.io archival, same-quiz replay,
operator authorization, closure races, recovery, schema migration, and atomic rollback
when either result insertion or snapshot writing fails.

## Endurance with real timers

```sh
npm run test:endurance
npm run test:endurance -- --players=100 --questions=40 --seconds=15 --report=reports/endurance-15s.json
npm run test:endurance -- --players=100 --questions=2 --rounds=5 --report=reports/endurance-lifecycle.json
npm run test:endurance -- --players=100 --questions=40 --database=reports/durable-test.sqlite --report=reports/durable-test.json
```

The default run uses 100 players plus a host, 40 questions, five seconds to answer,
four seconds of reveal, and a one-second scoreboard pause, taking about seven
minutes. The 15-second question run takes about 14 minutes. The harness launches a
separate Node process on a random loopback port; you do not start the app manually.

Each round sends a burst of answers, waits for all clients to receive the stage,
and checks histories and independently calculated final scores. Room and socket
counts must return to zero after cleanup. Errors, unexpected disconnects, timeouts,
or inconsistent results produce a nonzero exit status.

By default, the harness uses memory instead of SQLite. Pass `--database` to measure
persistence, using a separate test file. **Never point a benchmark at event data.**

## Include rendered browsers

After installing the browser prerequisites and building:

```sh
npm run test:endurance -- --browser --players=100 --questions=40 --seconds=15 --report=reports/endurance-ui.json
npm run test:endurance -- --players=80 --browser-players=10 --questions=40 --seconds=5 --database=reports/browser-fleet.sqlite --report=reports/browser-fleet.json
```

`--browser` runs a real host page, one player page, and 99 socket bots for a total of
100 players. The player renderer uses 4× CPU throttling by default, configurable
through `ENDURANCE_CPU_RATE`. Background timer/render throttling is disabled to
exercise active UI. Browser GC is forced only after gameplay for retention
diagnostics, not during the match; the server does not force GC.

`--browser-players=10` uses ten separate player browser contexts plus 70 socket bots
in the example above. Players join through the UI in batches of ten. Fleet mode
uses neither the 4× CPU throttle nor forced GC. Browser tests support one match per
run; use the non-browser lifecycle command for `--rounds`.

More full browsers consume more RAM on the load-generator machine. Start small,
especially when the generator and server share one laptop. Both modes operate the
host's actual Start/Continue/Podium controls and the players' answer controls.

## Reading the measurements

- CPU percentages use **100% = one fully occupied core**, not the entire machine.
- Server reports sample RSS, heap, external memory, event-loop delay, ACK latency,
  and persistence timings. Brief peaks between samples can be missed.
- The summary's event-loop p99 is the highest sample-window p99, not a combined
  p99 over the entire run. Monitor resolution is 10 ms.
- A successful report means the scenario and consistency checks passed. It does
  not establish a universal latency threshold or guarantee there are no leaks.
- Browser click-to-confirm measurements include Playwright scheduling. Fleet ACK
  observations include CDP scheduling. Neither is pure network latency or INP.
- Browser reports include JavaScript errors, disconnects, and UI/memory observations.
  Long tasks/frame gaps in single-browser mode and samples from two fleet players
  have different scopes; do not treat them as measurements of every physical phone.

Run performance measurements without other builds or tests in parallel. Processes
still share CPU and memory on the same machine. Validate the intended Wi-Fi and
devices separately.

## Recorded results

| Record | What it establishes |
| --- | --- |
| First event, reported by the project owner | 67 participants completed a 20-question session with no observed errors or freezes. This is a field report, not instrumented telemetry. |
| [11 October podium audit](podium-audit-2026-10-11.md) | 63 tests passed; production browser checks covered podium recovery and lost ACKs. |
| [7 October audit follow-up](audit-follow-up-2026-10-07.md) | A passing 70-bot + 10-browser run completed 40 questions and 3,200 answers with SQLite and real timers. |
| [Verification history](verification.md) | Earlier engine, endurance, persistence, and recovery results, with their original scope and dates. |

The 7 October record also includes an unsuccessful 80-full-browser attempt and a
mixed run with browser disconnects whose cause was unresolved. A later passing run
does not erase those results. These reports are dated evidence, not a current CI
status or a guarantee for every network/device combination.
