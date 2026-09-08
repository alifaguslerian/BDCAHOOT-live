# Security & Anti-Cheating Architecture

> Security controls, threat modeling, and anti-cheating policies for BDCAHOOT Live Arena.

---

## 1. Threat Model & Operational Context

In competitive arena environments (e.g. campus hackathons, student assemblies), participants may attempt to exploit network latency, manipulate client payloads, or inject malicious strings to gain an unfair advantage or disrupt the live event.

### Key Threats Addressed

| Threat | Vector | Mitigation Strategy |
| :--- | :--- | :--- |
| **Clock Manipulation** | Tampering with local system time on mobile phones to artificially simulate an instant answer. | **Server-Authoritative Clock**: The client clock is ignored. Speed bonus is derived strictly from server arrival timestamp ($t = T_{\text{server\_received}} - T_{\text{server\_started}}$). |
| **Double-Submission & Tap Spamming** | Sending multiple socket packets with different options to hedge bets. | **Single-Answer Invariant**: The server accepts only the first valid answer packet per question index per player. Subsequent packets for that question are silently discarded. |
| **Late Packet Injection** | Sending an answer after the question timer has elapsed on the projector. | **Strict Deadline Barrier**: Packets received after $T_{\text{endsAt}} + \epsilon_{\text{grace}}$ (200ms network jitter buffer) are permanently rejected. |
| **Name Spoofing & Duplicate Hijacking** | Attempting to impersonate another player or break ranking displays with identical names. | **Case-Insensitive Uniqueness**: Player names are strictly checked against active participants. Collisions are rejected at registration with an explicit inline message. |
| **Script Injection & XSS** | Injecting `<script>` tags, emojis, or control characters into player names or custom questions. | **Strict Alphabet Sanitization**: Player names are restricted via regex `^[a-zA-Z]+$`. All HTML strings in question bodies and choices are escaped by default in React 19 JSX rendering. |
| **Host Control Hijacking** | A participant attempting to send fake host transition events ("NEXT_QUESTION", "FINISH_GAME"). | **Session Token Isolation**: Host actions require an authoritative `hostSessionId` generated during room creation. Only sockets authenticated as the host room creator can dispatch stage transitions. |
| **Network Denial of Service (LAN Flooding)** | Hundreds of rapid clicks overloading the host machine's event loop. | **Debouncing & Rate-Limiting**: The host transition buttons are disabled into a loading state immediately upon click. Rapid client socket submissions are throttled at the network gateway. |

---

## 2. Secrets Management & Repository Hygiene

To ensure no sensitive configuration, API keys, or local database files are accidentally pushed to public or team Git repositories:

### `.gitignore` Enforcement
- **Environment Files**: `.env`, `.env*.local`, `.env.development`, `.env.production` are strictly blocked.
- **Embedded Databases**: Local SQLite database files (`*.db`, `*.sqlite`, `*.sqlite3`, `*-wal`, `*-shm`) are blocked to prevent leaking private event data.
- **Build Artifacts**: `.next/`, `dist/`, `out/`, `node_modules/` are excluded.
- **Single Permitted Template**: Only `.env.example` (containing empty parameter placeholders) is tracked in version control.

### Client-Side Variable Policy
- The Gemini AI API key (if activated for AI quiz generation) is strictly restricted to server-side Node.js routes (`process.env.GEMINI_API_KEY`).
- **NEVER** expose administrative tokens or API keys with the `NEXT_PUBLIC_` prefix.

---

## 3. Reporting a Vulnerability

If you discover a potential security flaw, denial-of-service vulnerability, or anti-cheating bypass within BDCAHOOT Live Arena:

1. **Do not create a public GitHub Issue.**
2. Send a detailed report directly to the security maintainers at: `alifaguslerian512@gmail.com`.
3. Include reproducible steps, network traces, and environment details.
4. We aim to acknowledge reports within 48 hours and provide patches within 7 days.
