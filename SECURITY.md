# Security boundaries

The Node process is the only authority for room state, deadlines, scores and transitions. Room creation requires the operator key printed in the terminal or configured with HOST_KEY. Host commands require a server-issued host token.

Player identity comes from a random session token, not the claimed role/player ID in an answer. Accepted answers are immutable; retrying the same submission returns the original receipt. Room session and revision protect against stale commands. Only the current question is sent, and its key/current points remain hidden until reveal. Other players' answer histories and session tokens are never included.

The transport bounds packets to 256 KiB (quiz payloads to 200 KiB), connections, rooms, participants and request rates. Browser handshakes must use the same origin host. Failed operator authentication is rate limited by address. These controls do not prevent network-level denial of service or radio interference.

Use a trusted private LAN or TLS. Plain HTTP cannot protect tokens against interception. Never expose HOST_KEY through NEXT_PUBLIC variables or share it with players. Do not expose this service directly to the Internet.

Normal startup enables a private SQLite snapshot database (default data/game.sqlite).
The worker commits with synchronous=FULL before success ACKs; broadcasts wait for
committed state. Failed writes stop gameplay and reject new connections. Corrupt or
unsupported storage fails startup, and one process exclusively owns each database.
Active questions recover to scoreboard after restart; confirmed receipts and scores
remain, and retries do not add points twice. Tests include abrupt process termination
after ACK. This is not a guarantee against hardware failure, power loss on devices
that misreport sync, or exactly-once network delivery.

The database contains unencrypted bearer tokens and answer keys. Restrict filesystem
access and backup access; Windows requires appropriate operator-account ACLs. Default
data and SQLite sidecar files are ignored by Git. Do not place storage in public/,
network shares or cloud-synced folders. No private snapshot import endpoint exists.
Recovery requires the browser's saved session token and the same origin. Clearing
browser storage is not repaired by server persistence. Comprehensive adversarial
recovery/security testing remains in phase 9B.

Report vulnerabilities privately to maintainers with a minimal reproduction and affected revision. Do not put live tokens or personal data in public issues.
