# Operator guide

[Back to README](../README.md)

This guide describes the current SQLite-based application. Earlier phase documents
may refer to browser-only quiz storage or an in-memory game server.

## Prepare and start

Install dependencies and create the production build while internet is available:

```sh
npm ci
npm run build
npm start
```

Use the Node versions listed in the README. Keep the terminal open and prevent the
server laptop from sleeping during the event. Run only one server per database.
Do not run builds or load tests alongside a live match.

The terminal prints the local URL, LAN addresses, operator key, database path, and
number of recovered rooms. Open `/host/library` on the host laptop and enter the
operator key. A new database has an empty quiz library. Create a quiz, wait for
**Tersimpan otomatis**, review the answers/timers, then create a room.

Players use the laptop's reachable LAN address, not `localhost`. Share the room
code, wait for players to join, then start. The participant count represents
registered players; it is not a live count of healthy phone connections.

Use the event Wi-Fi and a few actual phones to check joining and answering before
the session. Firewall rules should allow the application on the private network.
Guest/client isolation may prevent phones from reaching the laptop.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | Port shared by Next.js and Socket.io. Set it in the process environment. |
| `HOST_KEY` | Random key printed at startup | Optional fixed operator key of at least 12 characters. Keep it private. |
| `DATABASE_PATH` | `data/game.sqlite` | Private local database for quizzes and matches. |
| `NODE_ENV` | Depends on the command/environment | Use `production` for the event and `npm run dev` during development. |

For example, in PowerShell:

```powershell
$env:NODE_ENV = 'production'
$env:PORT = '3000'
npm start
```

Optional persistent configuration can go in `.env.local`; use [.env.example](../.env.example)
as a reference. Do not copy its `NODE_ENV=development` setting into an event setup.
`PORT` is read before Next.js loads environment files, so use the process environment
when changing it. Never use a `NEXT_PUBLIC_` variable for the operator key.

## Quizzes and backups

Quizzes and editor drafts live in the SQLite `quizzes` table. No manual SQL setup
is needed. Changing Wi-Fi, IP address, or browser does not replace the library as
long as the server uses the same database. Moving to another server laptop requires
moving the database too.

Autosave is debounced for 400 ms. The editor reports saved status after the server
confirms persistence. Navigation through the editor's controls waits for saving.
Offline edits and stale-tab conflicts show an error; they do not silently overwrite
another version. Wait for **Tersimpan otomatis** before closing the tab.

To back up both the library and matches:

1. Stop the server normally with Ctrl+C and wait for it to exit.
2. Copy the database to a private backup location outside the repository.
3. Restore only while the server is stopped, preserving the current file first.
4. Start with the intended database path and verify the library and recovered rooms.

The database contains unencrypted answer keys and session tokens. Restrict access;
do not put it in `public/`, share it with players, or store it on a network/cloud-sync
drive. After a crash, preserve any SQLite journal/WAL/SHM sidecars with the database
for diagnosis instead of deleting them. A backup can only restore data it contains.

Older installations may have quizzes in browser localStorage. Opening the library
from the original browser/origin imports them after operator authentication. The
client retains a backup under `bdcahoot_quiz_library_v1_backup` once imports succeed.
It cannot read a different origin's storage. Imports do not overwrite existing quiz
IDs or resurrect deleted quizzes.

## Match history and CSV results

Open **Riwayat Pertandingan** from the operator library to browse completed games,
newest first, with 20 matches per page. Open an entry for its quiz title, start/end
times, participant count, question count, and every participant's final rank and
score. Players who leave after the game starts remain in the results.

The server archives a result when it closes the last question and fixes the final
ranking. This does not wait for the operator to reveal the podium. **Download Hasil**
appears on the podium after all places are revealed and is also available in the
history detail. Both produce the same UTF-8 CSV, including correct, wrong, and
unanswered counts. CSV times are labeled UTC; the history screen uses the browser's
local time. A missing download or network error can be retried without changing scores.
Response-time totals include the existing full-timer penalty for unanswered questions.

Each server match ID has one immutable record. Reusing a quiz or room code creates
a new match ID and a separate entry; refreshes, retries and restarts do not create
duplicates. Closing/expiring a room or editing/deleting a quiz does not delete results.
The archive is in the SQLite `match_results` table and is included in database backups.
Only operator-authenticated requests can browse history; a room's host can download
that room's own result with its existing host session. History contains no session
tokens, answer keys, or per-question answer payloads.

This version archives completed games from newly created rooms. Cancelled lobbies,
early finishes before the last question, and legacy rooms restored from a previous
version do not acquire history entries. If a restart closes an active final question,
the archived result follows the existing recovery/scoring rules below. History is
retained until the database is replaced or removed; there is no archive-deletion UI.

On first startup, the server migrates SQLite schema version 1 to 2 automatically,
preserving the existing quiz library and recovery snapshot. Before upgrading an
event installation, stop the server and back up its database using the steps above.
An older server cannot open version 2; a rollback requires the matching pre-upgrade
backup. No manual SQL setup is required. Do not upgrade during an active event.

## Refresh, reconnect, and restart

| Situation | Expected behavior |
| --- | --- |
| Host refreshes the same room URL | Restores the session from tab storage or the room-specific backup on the same browser/origin. The question clock does not restart. |
| Host loses browser storage or changes browser | Use **Pulihkan kendali room** at the room URL, or **Pulihkan room yang masih aktif** in the library, with the current operator key. |
| Player refreshes or reconnects | Restores the identity and accepted-answer receipt when the browser still has valid credentials. |
| Player loses the tab | The last player's local backup can recover on the same browser profile and origin. Use separate profiles for multiple identities on one device. |
| Player explicitly leaves | Revokes the session and clears its matching backup after server confirmation. Recorded scores remain; joining again after the game starts is not allowed. |
| Server restarts in the lobby, scoreboard, or final stage | Restores the saved stage from the same database, provided the room has not expired. |
| Server restarts during the opening countdown | Restarts the five-second preparation countdown. |
| Server restarts during a question or answer preview | Closes that question and recovers to its scoreboard stage. After the last question, the UI shows the podium waiting screen. |

Accepted, persisted answers remain counted after recovery. Unanswered questions
receive zero points and their full duration is applied to the response-time
tie-break once. A server restart does not reopen the interrupted question.

The operator key can recover host control; a room code alone cannot. Server
persistence cannot reconstruct a player's erased browser credentials. Maintain the
same address and port during a match when possible.

## Waiting for the podium

After the final answer preview, **Lihat Podium Juara** waits for the operator.
There is no automatic podium timer on that screen, and waiting does not change scores.
Rooms expire after six hours without authenticated activity. An open tab or clock
ping alone does not extend that deadline.

The waiting screen hides rankings visually. The server still sends ranking data
after reveal, so a participant inspecting network messages can read results early.
See the [podium audit](podium-audit-2026-10-11.md). Reduced-motion preferences show
the podium without the staged animation; otherwise places appear 3, 2, 1 at
five-second intervals, beginning with the last available place for small rooms.

## Storage failures and closing the event

Mutation ACKs wait for SQLite commits. If a write fails or exceeds the five-second
commit deadline, the server stops the game transport and rejects new connections.
Check the disk, permissions, and terminal before restarting. A timeout does not prove
that a delayed write was canceled; inspect recovered state and receipts.

Corrupt or unsupported databases fail startup rather than being silently replaced.
If a worker/disk hang prevents shutdown, stop only the relevant server process and
investigate the storage. Do not delete the database to clear an error.

Closing removes the active match from the recovery snapshot. Completed matches from
new rooms keep their independent history record; unfinished and legacy matches do
not. Result insertion and the corresponding snapshot update commit in one SQLite
transaction, so a failed write cannot falsely confirm a saved result. Stop the server
normally, then take a private backup if needed.
