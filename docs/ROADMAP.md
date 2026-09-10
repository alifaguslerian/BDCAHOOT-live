# Implementation Roadmap & Milestone Tracker

> Modular 9-Phase Engineering Plan for BDCAHOOT Live Arena. Updated continuously per phase release.
> **Last Updated**: 2026-09-08 | **Current Phase**: Phase 2 (Design System & UI Atoms)

---

## Progress Overview

| Phase | Milestone Name | Focus Area | Status |
| :---: | :--- | :--- | :---: |
| **Phase 1** | **Foundations & Invariants** | Types, scoring formulas, tie-breakers, validation, mock store | **COMPLETED ✅** |
| **Phase 2** | **Design System & UI Tokens** | Typography, Stitch tokens, option badges, arena datasets | **IN PROGRESS ⏳** |
| **Phase 3** | **Host Quiz Management** | Quiz Library, Quiz Editor, Soal Editor, Game Settings | *PLANNED* |
| **Phase 4** | **Player Onboarding** | Room Code entry, strict Name validation, error boundaries | *PLANNED* |
| **Phase 5** | **Host Arena Engine** | State-driven Lobby, Question, Reveal, Scoreboard, Podium | *PLANNED* |
| **Phase 6** | **Player Mobile Controller** | Minimalist Question view, tap lock, private reveal, rank view | *PLANNED* |
| **Phase 7** | **Multi-Tab Simulation** | Concurrency verification, tie-break verification, load test | *PLANNED* |
| **Phase 8** | **Socket.io LAN Engine** | Real local WebSockets, authoritative server clock, LAN setup | *PLANNED* |
| **Phase 9** | **SQLite Persistence & Hardening** | Local DB persistence, crash recovery, auto-cleanup | *PLANNED* |

---

## Phase Details & Verification Gates

### Phase 1: Foundations & Invariants ✅
- [x] Type definitions for Quiz, Question, Room, and Player (`types/quiz.ts`, `types/game.ts`).
- [x] Locked exponential speed bonus mathematical model (`lib/scoring.ts`).
- [x] Deterministic 3-tier tie-breaking hierarchy (`lib/scoring.ts`).
- [x] Strict name sanitizer: alphabets A-Z only, case-insensitive uniqueness (`lib/validation.ts`).
- [x] Mock Game State Store with full stage progression (`context/MockGameContext.tsx`).
- [x] Strict Git & Security config (`.gitignore` and `.env.example`).
- [x] Production build verification via Next.js compiler (`compile_applet`).
- **Gate Passed**: `compile_applet` passed with zero errors, React 19 hooks purity verified.

---

### Phase 2: Design System & UI Atoms (Stitch Integration) ✅
- [x] Google Fonts integration (`Anybody` 700/800/900 + `Space Grotesk` 400/500/600/700).
- [x] Color theme definitions in `app/globals.css` with `.tabular-nums` numeric alignment.
- [x] Standardized Arena Mock Dataset (`data/arenaData.ts` with canonical types, lobby, top 7, podium).
- [x] Accessible option badges with color + geometric shapes (`components/common/OptionBadge.tsx`).
- [x] Option Button Atoms (`components/common/OptionButton.tsx` with geometric shapes ▲, ◆, ●, ■, WCAG AA contrast, reveal animations, and vote distribution bar charts).
- [x] Host Projector Header & Timer display atom (`components/common/ProjectorHeader.tsx` with giant tabular timer, urgent urgency pulses, live answered count, and room PIN badge).
- [x] Player Tap Pad component (`components/common/PlayerTapPad.tsx` with 96px+ touch targets exceeding 44px WCAG, optimistic lock visual feedback, Web Audio tap triggers, and keyboard shortcuts 1/2/3/4 or A/B/C/D).
- **Verification Gate**: Linter clean (0 errors), color contrast ratio verified for all four options (>4.5:1), Next.js compiler clean build.

---

### Phase 3: Host Quiz Management (Pre-Game) & High-Concurrency Performance Hardening ✅
- [x] **D1 Landing Page**: High-contrast Hero with dual CTAs (`START (HOST)` and `MASUK (PESERTA)`), integrated PIN modal and Web Audio feedback (`HostLanding.tsx`).
- [x] **D2 Quiz Library**: Persistent stored quiz list, draft vs siap badges, duration metrics, incomplete question indicator, `MAIN` disabled guard (`app/host/library/page.tsx`).
- [x] **D3 Quiz Editor**: Question reordering (Up/Down), add/delete questions with 1-question minimum guard, autosave status indicator (`components/host/QuizEditorView.tsx`).
- [x] **D4 Soal Editor**: Question text, 4 options (▲, ◆, ●, ■), radio-button single correct selection, timer presets (10s/15s/20s/30s) (`components/host/QuizEditorView.tsx`).
- [x] **D5 Game Settings**: Quiz summary, question shuffle toggle, reveal duration presets, dynamic room PIN generation (`generateRoomCode()`) (`components/host/GameSettingsView.tsx`).
- [x] **High-Concurrency Batching Buffer**: 300ms throttled flush queue for `submitAnswer()` preventing React re-render cascade under 55+ simultaneous player taps.
- [x] **Anti-Cheat Deadline & Stage Guards**: Rejection of late packets outside the `+200ms` network grace buffer and out-of-turn submissions outside `QUESTION` stage.
- [x] **Lazy Compute Optimization**: Answer distribution & rankings calculations deferred to `REVEAL` / `SCOREBOARD` phases (zero overhead during question timer).
- **Verification Gate**: Passed `test:phase3` (8/8 unit assertions passed), `test:perf` (7/7 stress assertions passed, 1,650 answers processed in ~1.05ms), and `compile_applet` (100% clean build).

---

### Phase 4: Player Onboarding (Pre-Game) 📋
- [ ] **D12 Join Screen**: 6-digit room code input with auto-formatting and auto-uppercase.
- [ ] **D13 Name Screen**: Single name input, instant validation against regex `^[a-zA-Z]+$`, clear duplicate name rejection.
- [ ] **Blocked State**: Dedicated handler for participants attempting to join an already started game with navigation back.
- **Verification Gate**: Disallows invalid characters, spaces, and duplicate names; successfully registers valid player.

---

### Phase 5: Host Arena Engine (State-Driven Projector) 📋
- [ ] **D6 Lobby View**: Giant room code, live connected player count, dynamic participant list, `MULAI GAME` button (disabled if 0 players).
- [ ] **D7 Question Active**: Massive prompt text, non-skippable absolute countdown timer, throttled answer counter.
- [ ] **D8 Reveal Stage**: Automatic 3–5s transition, correct option highlight, aggregate option distribution bar chart (A/B/C/D counts).
- [ ] **D9 Scoreboard**: Top 10 ranking with animated rank delta badges (`↑2 NAIK`), debounced `LANJUT` button with loading state.
- [ ] **D10 Final Result**: Top 3 Podium (🥇 1st, 🥈 2nd, 🥉 3rd) with graceful degradation if < 3 players, manual "KEMBALI KE LIBRARY" exit.
- **Verification Gate**: Single-route state machine cycles through all questions without URL reloads.

---

### Phase 6: Player Mobile Controller (State-Driven Client) 📋
- [ ] **D14 Mobile Lobby**: Low-power battery-saving waiting view ("Menunggu host memulai game...").
- [ ] **D15 Active Question**: 4 large colored tap cards, optimistic immediate feedback on first touch.
- [ ] **D16 Answer Locked**: Status confirmation ("✓ Jawaban tersimpan"), other choices dimmed, silent tap ignore.
- [ ] **D17 Player Reveal**: Private correct/incorrect notification, breakdown of points and speed bonus.
- [ ] **D18 Personal Rank**: Private standing (`#14 dari 50`), rank delta, total accumulated score.
- [ ] **D19 Player Final**: Game over closure card (`GAME SELESAI / #Rank / Total Point`).
- **Verification Gate**: Mobile view is tactile, responsive, and keeps individual scores strictly confidential.

---

### Phase 7: Multi-Tab Local Simulation & Stress Testing 📋
- [ ] Concurrency test with 1 Host window and 10 simultaneous Player browser tabs.
- [ ] Simultaneous tap collision test: verify millisecond tie-breaker precision.
- [ ] Reconnection resilience test: simulate mid-game page refresh on both host and player.
- [ ] Memory leak audit: ensure no event listener accumulation over 30+ question iterations.
- **Verification Gate**: Smooth performance without CPU spikes or desynchronized game stages.

---

### Phase 8: Socket.io LAN Engine (Local Network WebSocket) 📋
- [ ] Standalone local Node.js WebSocket server script.
- [ ] WebSocket client hook replacing `MockGameContext`.
- [ ] Local IP address discovery helper (e.g. `192.168.1.50:3000`) for player QR code / URL display.
- [ ] Disconnection / Reconnection session token arbitration.
- **Verification Gate**: Functional quiz game playable across two separate physical devices on the same Wi-Fi with internet unplugged.

---

### Phase 9: SQLite Local Persistence & Hardening 📋
- [ ] SQLite database setup (`better-sqlite3` or embedded driver).
- [ ] Quiz library CRUD persistence (drafts survive laptop restart).
- [ ] Game session snapshotting for instant recovery after accidental process termination.
- [ ] Room cleanup cron for stale abandoned rooms.
- **Verification Gate**: Laptop restart test: relaunch app and successfully recover stored quiz drafts.
