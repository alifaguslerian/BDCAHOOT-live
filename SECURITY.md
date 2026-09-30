# Security boundaries

The Node process is the only authority for room state, deadlines, scores and transitions. Room creation requires the operator key printed in the terminal or configured with HOST_KEY. Host commands require a server-issued host token.

Player identity comes from a random session token, not the claimed role/player ID in an answer. Accepted answers are immutable; retrying the same submission returns the original receipt. Room session and revision protect against stale commands. Only the current question is sent, and its key/current points remain hidden until reveal. Other players' answer histories and session tokens are never included.

The transport bounds packets to 256 KiB (quiz payloads to 200 KiB), connections, rooms, participants and request rates. Browser handshakes must use the same origin host. Failed operator authentication is rate limited by address. These controls do not prevent network-level denial of service or radio interference.

Use a trusted private LAN or TLS. Plain HTTP cannot protect tokens against interception. Never expose HOST_KEY through NEXT_PUBLIC variables or share it with players. Do not expose this service directly to the Internet.

State is in memory. Browser refresh/reconnect survive while the process runs. No claim of crash durability, SQLite persistence, exactly-once network delivery or comprehensive penetration testing is made.

Report vulnerabilities privately to maintainers with a minimal reproduction and affected revision. Do not put live tokens or personal data in public issues.
