# System Architecture & Technical Specifications

> In-depth architectural blueprint for BDCAHOOT Live Arena's LAN-first, server-authoritative engine.

---

## 1. Architectural Philosophy: LAN-First Resiliency

Traditional interactive quiz platforms depend entirely on cloud WebSocket services (e.g. Firebase, Pusher, AWS AppSync). In real-world campus arenas, auditoriums, and convention centers, this creates critical failure vectors:

1. **Venue Cellular & WAN Saturation**: When hundreds of attendees gather in one hall, cellular towers saturate and venue uplink bandwidth degrades rapidly.
2. **DNS & Packet Dropping**: Requests to public cloud endpoints encounter variable latency spikes (500ms–4000ms), desynchronizing timer deadlines.
3. **Cold Starts & Billing Caps**: Serverless container restarts can drop active game sessions mid-competition.

**BDCAHOOT's Solution**: The entire runtime environment lives and executes on the Host's machine on the local Wi-Fi / Ethernet router. Mobile devices communicate directly with the host's local IP address over low-latency LAN subnets (typical ping: `< 5ms`).

---

## 2. High-Level System Topology

```
                   ┌────────────────────────────────────────────────────────┐
                   │                     HOST COMPUTER                      │
                   │                                                        │
                   │   ┌────────────────────────────────────────────────┐   │
                   │   │         Next.js App Router (Port 3000)         │   │
                   │   │   - Host Projector View                        │   │
                   │   │   - Player Web Controller Client               │   │
                   │   │   - Quiz Creator & Manager Admin               │   │
                   │   └───────────────────────┬────────────────────────┘   │
                   │                           │                            │
                   │   ┌───────────────────────▼────────────────────────┐   │
                   │   │         Node.js WebSocket Gateway              │   │
                   │   │   - Room Orchestrator & State Machine          │   │
                   │   │   - Authoritative Master Clock                 │   │
                   │   │   - Exponential Speed Bonus Engine             │   │
                   │   └───────────────────────┬────────────────────────┘   │
                   │                           │                            │
                   │   ┌───────────────────────▼────────────────────────┐   │
                   │   │             Embedded SQLite DB                 │   │
                   │   │   - Question Banks & Draft Autosaves           │   │
                   │   │   - Historical Room Logs & Top Leaderboards    │   │
                   │   └────────────────────────────────────────────────┘   │
                   └───────────────────────────▲────────────────────────────┘
                                               │
                                 Local Wi-Fi Subnet (192.168.x.x)
                                               │
                       ┌───────────────────────┴───────────────────────┐
                       │                                               │
            ┌──────────▼──────────┐                         ┌──────────▼──────────┐
            │   Mobile Client 1   │                         │   Mobile Client N   │
            │   (HTML5 / Canvas)  │                         │   (HTML5 / Canvas)  │
            └─────────────────────┘                         └─────────────────────┘
```

---

## 3. Finite State Machine (FSM)

Both Host and Player viewports operate as a **Single State-Driven Route**. The active viewport never triggers browser URL reloads during a live game, eliminating route desynchronization during network jitters.

### Host State Transitions

```
[ LOBBY ] 
   │
   ▼ (Host clicks "START" — min 1 player enforced)
[ QUESTION ]
   │
   ▼ (Server timer hits 0 — strictly non-skippable)
[ REVEAL ]
   │
   ▼ (Auto-advance after 3–5 seconds)
[ SCOREBOARD ]
   │
   ├── (Host clicks "LANJUT" — questions remaining) ──► [ QUESTION (next) ]
   │
   └── (Host clicks "LIHAT HASIL" — after final question)
         │
         ▼
      [ FINAL RESULT (PODIUM) ] 
         │ (Remains frozen indefinitely until Host manually exits)
         ▼ (Host clicks "KEMBALI KE LIBRARY")
      [ QUIZ LIBRARY ]
```

### Player State Transitions

```
[ LOBBY ] 
   │
   ▼ (Server broadcasts "GAME_STARTED")
[ QUESTION ]
   │
   ▼ (Player taps option — instant optimistic lock)
[ ANSWER LOCKED / WAITING ]
   │
   ▼ (Server broadcasts timer completion)
[ REVEAL ] (Private: Correct/Incorrect status + points earned)
   │
   ▼ (Auto-transition)
[ PERSONAL RANK ] (Private: #Rank, delta shift, accumulated score)
   │
   ├── (Server broadcasts next question) ──► [ QUESTION ]
   │
   └── (Server broadcasts quiz completion)
         │
         ▼
      [ FINAL (GAME OVER) ] (Private: Final standing + total points)
```

---

## 4. Clock Synchronization & Time-Critical Invariants

### 1. The Server-Authoritative Clock
- The client timer is purely visual (interpolated via `requestAnimationFrame` or CSS transitions).
- When a question begins, the server registers `startedAtMs` and broadcasts `endsAtMs = startedAtMs + (T * 1000)`.
- When a player submits an answer, the response duration $t$ is calculated purely from server reception time:
  $$t = \text{Date.now()}_{\text{server}} - \text{startedAtMs}$$
- Any submission arriving after $\text{endsAtMs} + \epsilon_{\text{grace}}$ (where $\epsilon_{\text{grace}} \approx 200\text{ms}$ network jitter buffer) is discarded.

### 2. The Strict Timer Invariant (Section 14 & 40)
The host projector screen **must never skip or truncate the question timer early**, even if 100% of participants have answered. This maintains event rhythm, prevents audience panic, and gives spectators in the back rows sufficient time to absorb the options.

### 3. Batched Live Counter Updates
To prevent DOM thrashing when 50+ participants tap their screens in the first 2 seconds, the Host Display's `"X/Y Participants Answered"` counter is throttled via a 300ms–500ms buffer rather than re-rendering on every incoming socket packet.

---

## 5. Scoring & Tie-Breaking Engine

### Exponential Curve Rationale
Linear scoring models create narrow spreads between fast and slow answers. BDCAHOOT utilizes a steep negative exponential decay curve:

$$B_{\text{raw}} = 1000 \cdot e^{-4 \cdot (t / T)}$$

- Fast answers ($t \to 0$): Yield nearly **+1,000 bonus points**.
- Mid-range answers ($t = 0.5 \cdot T$): Yield $\approx 1000 \cdot e^{-2} \approx 135$ bonus points.
- Late answers ($t \to T$): Yield $\approx 1000 \cdot e^{-4} \approx 18$ bonus points.
- The `max(1, round(B_raw))` floor ensures every valid correct answer receives at least +1 bonus point.

### Deterministic Tie-Breaker Pipeline
```typescript
playerList.sort((a, b) => {
  // Level 1: Highest Total Score
  if (b.score !== a.score) return b.score - a.score;

  // Level 2: Lowest Total Server-Measured Response Time (including full T penalty for skipped questions)
  if (a.totalResponseTimeMs !== b.totalResponseTimeMs) {
    return a.totalResponseTimeMs - b.totalResponseTimeMs;
  }

  // Level 3: Deterministic Player ID / Join Sequence
  return a.id.localeCompare(b.id);
});
```

---

## 6. Disconnection & Fault Recovery Matrix

> **Implementation Note**: This matrix defines the authoritative specification implemented in Phase 8 (Socket.io LAN Engine) and Phase 9 (SQLite Persistence & Recovery). During development Phases 1–7, in-memory local state simulation via `MockGameContext` handles the lifecycle.

| Fault Scenario | System Behavior | Data Integrity |
| :--- | :--- | :--- |
| **Player transient disconnect** | Player socket marks `connected: false`. Existing score and submitted answers remain intact. | 100% Preserved |
| **Player reconnects mid-question (unanswered)** | Reconnects with session token, receives active question with remaining server time. | Can still answer |
| **Player reconnects mid-question (already answered)** | Reconnects straight into `ANSWER_LOCKED` state. Cannot alter chosen option. | Single-tap invariant preserved |
| **Host browser refresh** | Host auto-resumes to active room state from memory/database via session token. | No room loss |
| **Player browser refresh** | Client fetches current authoritative state from server; renders active phase seamlessly. | No desync |
| **Host crash / power failure** | Room data is checkpointed to local SQLite. Host can restart process and recover state. | Crash-safe |
