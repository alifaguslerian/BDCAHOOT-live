# Security boundaries

The Node process is the only authority for room state, deadlines, scores and transitions. Room creation requires the operator key printed in the terminal or configured with HOST_KEY. Host commands require a server-issued host token.

Player identity comes from a random session token, not the claimed role/player ID in an answer. Accepted answers are immutable; retrying the same submission returns the original receipt. Room session and revision protect against stale commands. Only the current question is sent, and its key/current points remain hidden until reveal. Other players' answer histories and session tokens are never included.

The transport bounds packets to 256 KiB (quiz payloads to 200 KiB), connections, rooms, participants and request rates. Browser handshakes must use the same origin host. Failed operator authentication is rate limited by address. These controls do not prevent network-level denial of service or radio interference.

Use a trusted private LAN or TLS. Plain HTTP cannot protect tokens against interception. Never expose HOST_KEY through NEXT_PUBLIC variables or share it with players. Do not expose this service directly to the Internet.

Normal startup enables a private SQLite snapshot database (default data/game.sqlite).
The worker commits with synchronous=FULL before success ACKs; broadcasts wait for
committed changes. Question opening first commits an intent with no running clock;
the runtime clock is activated after that commit and recorded in a subsequent snapshot.
Either representation recovers to scoreboard after a crash. Failed writes stop gameplay
and reject new connections. Corrupt or
unsupported storage fails startup, and one process exclusively owns each database.
Active questions recover to scoreboard after restart; confirmed receipts and scores
remain, and retries do not add points twice. Tests include abrupt process termination
after ACK. This is not a guarantee against hardware failure, power loss on devices
that misreport sync, or exactly-once network delivery.

The database contains unencrypted bearer tokens and answer keys. Restrict filesystem
access and backup access; Windows requires appropriate operator-account ACLs. Default
data and SQLite sidecar files are ignored by Git. Do not place storage in public/,
network shares or cloud-synced folders. No private snapshot import endpoint exists.
Recovery requires the browser's saved session token and the same origin. The last
player token is also saved in localStorage for tab-loss recovery; Host credentials
and pending requests remain tab-local. Explicit leave/revocation clears matching
player recovery data. Shared devices must leave explicitly; anyone using that browser
profile can otherwise resume its last player. Clearing browser storage is not repaired
by server persistence.

Connections are capped at 200 per direct remote address as well as 1,000 globally;
the cap is rechecked after handshakes. It is deliberately above the 100-player target
to accommodate shared addresses. It is not device identity or a Sybil-proof admission
policy: reconnects/multiple devices can still register players. A bound player socket
must leave before registering a different player; idempotent join retries remain valid.
Join history retains at most 1,000 entries, evicting the oldest revoked entry at capacity.
Retries for evicted IDs are treated as new admissions and cannot recover revoked tokens.

Phase 9B adds a five-second commit deadline and bounds in-flight requests to eight
per connection and 1,000 globally. A timeout stops transports; it does not cancel an
underlying filesystem write or prove that the pending mutation was lost. Recovery
must inspect persisted receipts. A physically stuck worker can still require operator
process termination. Connection-level rate limits can be bypassed by reconnecting;
they are resource controls, not protection against a coordinated LAN denial of service.

Local tests cover interrupted SQLite transactions, process death before/after commit,
injected storage rejection/stall, conflicting submissions from two connections,
revoked tokens, malformed-packet floods, foreign origins and oversized packets.
They do not fill a physical disk, cut power, exhaustively test native SQLite commit
crash points, or replace a physical phone/router rehearsal.

Report vulnerabilities privately to maintainers with a minimal reproduction and affected revision. Do not put live tokens or personal data in public issues.
