# BDCAHOOT Live Arena

> A resilient, LAN-first interactive stage quiz platform designed for high-density campus arenas, hackathons, and live events.

[![Next.js](https://img.shields.io/badge/Next.js-15.4-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-blue?style=flat-square&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](#license)

---

## Overview

**BDCAHOOT Live Arena** is a real-time multiplayer minigames and quiz platform inspired by Kahoot, engineered specifically for high-stakes offline stage events. 

Standard cloud-based quiz platforms often fail in campus auditoriums and conference halls due to congested venue Wi-Fi, upstream cellular congestion, or fragile Internet uplinks. BDCAHOOT solves this with a **Local Area Network (LAN-First) architecture**, running authoritatively from the host laptop with zero external cloud dependencies during gameplay.

### Core Highlights

- **LAN-First Resiliency (100% Offline Capable)**: Eliminates cloud points of failure during live events via local Node.js + Socket.io orchestration and embedded SQLite persistence.
- **Combined Host Projector Display & Controls (OQ-1 Locked)**: Optimized for big-screen projection with massive typography while keeping subtle, non-intrusive host game controls ("LANJUT", "LIHAT HASIL") accessible directly on the same screen.
- **State-Driven Single Route Architecture**: No page flickering or history route desyncs. Both Host (`/host/room/:code`) and Player (`/player/room/:code`) are rendered within persistent, state-driven views.
- **Microsecond-Precision Exponential Speed Bonus**: Rewards lightning-fast reflexes without unfair scoring jitter, anchored by a deterministic multi-tiered tie-breaking hierarchy.
- **Color-Blind Accessible 4-Option Schema**: Every answer option pairs distinct vibrant colors with unambiguous geometric glyphs (▲ Triangle, ◆ Diamond, ● Circle, ■ Square).
- **Anti-Spam & Race Condition Guards**: Server-authoritative timestamping, optimistic client UI feedback, instant lock on first tap, and debounce guards on transition controls.

---

## Architectural Principles

```
┌────────────────────────────────────────────────────────────────────────┐
│                        HOST LAPTOP (VENUE LAN)                         │
│                                                                        │
│   ┌──────────────────────┐              ┌──────────────────────────┐   │
│   │   Next.js 15 Web     │◄────────────►│     Node.js Server       │   │
│   │   (Host Projector)   │              │   (Local Socket Engine)  │   │
│   └──────────────────────┘              └─────────────┬────────────┘   │
│                                                       │                │
│                                                       ▼                │
│                                          ┌─────────────────────────┐   │
│                                          │  SQLite Local Database  │   │
│                                          │     (Quiz Library)      │   │
│                                          └─────────────────────────┘   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Local Wi-Fi Router (No Internet Needed)
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│  Player 1 Phone  │       │  Player 2 Phone  │       │  Player N Phone  │
│  (Mobile Web UI) │       │  (Mobile Web UI) │       │  (Mobile Web UI) │
└──────────────────┘       └──────────────────┘       └──────────────────┘
```

1. **Server-Authoritative Clock**: The host server measures elapsed time $t$ in milliseconds against question duration $T$. Client timers are purely cosmetic countdown representations.
2. **Zero Polling (Push-Driven)**: Real-time state transitions are broadcast over WebSockets to minimize radio packet congestion across dozens of concurrent mobile clients.
3. **Optimistic Locking**: When a player taps an option, the mobile UI locks immediately to give instant physical feedback, while server validation determines canonical validity.

---

## Locked Scoring & Tie-Breaking Formulation

### Speed Bonus Mathematical Formula

$$\text{Time Ratio: } e = \frac{t}{T} \quad (0 \le e \le 1)$$

$$\text{Raw Bonus: } B_{\text{raw}} = B_{\text{max}} \cdot e^{-k \cdot e} \quad \text{where } B_{\text{max}} = 1000, \, k = 4$$

$$\text{Speed Bonus: } \text{SpeedBonus} = \max(1, \, \text{round}(B_{\text{raw}}))$$

$$\text{Question Score} = \begin{cases} 1000 + \text{SpeedBonus}, & \text{if answer is correct} \\ 0, & \text{if wrong or unanswered} \end{cases}$$

- **Base Reward**: Correct answers always grant **1,000 base points**.
- **Floor Guarantee**: Even an answer submitted on the final millisecond receives at least **+1 speed bonus** (`max(1, ...)` strictly applied post-rounding).
- **Theoretical Peak**: An instantaneous response yields **~2,000 points**.

### Deterministic Tie-Breaking Hierarchy

Scores may collide due to integer rounding. Ties are broken without ambiguous randomness through this strict 3-tier hierarchy:

1. **Total Score (DESC)**: Highest accumulated score.
2. **Total Server-Measured Response Time (ASC)**: Lowest sum of response times across all answered questions. Unanswered questions contribute the full question duration $T$ as a penalty.
3. **Player Sequence / ID (ASC)**: Deterministic unique tie-breaker.

---

## Information Architecture

```
/                              → Landing (START [Host] | MASUK [Player])
├── /host                      → Host Experience
│   ├── /host/library          → Local Quiz Library (Manage drafts & status)
│   ├── /host/quiz/:id/edit    → Quiz Question Editor (Draft autosave, reordering)
│   ├── /host/quiz/:id/settings→ Pre-Game Settings (Question shuffle toggle)
│   └── /host/room/:code       → State-driven Single Route Arena Display:
│                                 [LOBBY] ──► [QUESTION] ──► [REVEAL] ──► [SCOREBOARD] ──► [FINAL]
└── /player                    → Player Experience
    ├── /player/join           → Room Code Entry (Auto-uppercase, active room check)
    ├── /player/name           → Name Picker (Strict A-Z only, case-insensitive uniqueness)
    └── /player/room/:code     → State-driven Single Route Mobile Controller:
                                  [LOBBY] ──► [QUESTION] ──► [LOCKED] ──► [REVEAL] ──► [RANK] ──► [FINAL]
```

---

## Tech Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Framework** | Next.js 15 (App Router) | High-performance server rendering & modern React 19 integration |
| **Language** | TypeScript 5.9 (Strict) | Total type-safety for network contracts and game states |
| **Styling** | Tailwind CSS v4 | Lightweight CSS tokens, modern theme engine, zero runtime overhead |
| **Display Typography** | Anybody (Google Fonts) | High-impact condensed geometric display for stage legibility |
| **Body Typography** | Space Grotesk (Google Fonts) | Clean, technical, non-generic sans-serif for UI clarity |
| **Realtime Engine** | Socket.io (Client & Server) | Resilient duplex communication over local WiFi without cloud lock-in |
| **Persistence** | Embedded SQLite (Local) | Fast, zero-config local storage for question banks and room metrics |
| **Animation** | Motion / CSS Transforms | Smooth hardware-accelerated score counters and rank movement |

---

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm, yarn, or pnpm

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/bdcahoot-minigames.git
   cd bdcahoot-minigames
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   *(Review `.env` — sensible defaults for local development are already populated).*

4. **Run the local development server:**
   ```bash
   npm run dev
   ```

5. **Open the application:**
   - Host Console: `http://localhost:3000`
   - Mobile Test View: Open a separate browser tab or mobile emulator at `http://localhost:3000/player/join`

---

## Verification & Code Quality

The codebase enforces strict verification gates:

```bash
# Type-checking & production compilation
npm run build

# Code linting & React 19 hooks purity checks
npm run lint
```

---

## Documentation Index

- [Architecture & Network Topology](ARCHITECTURE.md)
- [Design System & Visual Tokens](DESIGN_SYSTEM.md)
- [Project Roadmap & Milestones](ROADMAP.md)
- [Security & Anti-Cheating Guidelines](SECURITY.md)
- [Contributing Guidelines](CONTRIBUTING.md)

---

## License

This project is licensed under the [MIT License](LICENSE).
