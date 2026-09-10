# Changelog
All notable changes to the **BDCAHOOT Live Arena** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Comprehensive enterprise-grade project documentation:
  - `README.md`: High-level overview, ASCII network diagrams, mathematical speed bonus specification, and getting started guide.
  - `docs/ARCHITECTURE.md`: LAN-first topology, finite state machines (Host & Player), clock synchronization invariants, and fault recovery matrix.
  - `docs/DESIGN_SYSTEM.md`: Stage & Arena energy design tokens, Google Fonts (`Anybody` & `Space Grotesk`), accessible color+glyph option mapping, and touch target standards.
  - `docs/ROADMAP.md`: 9-phase milestone tracking with verification gates and acceptance criteria.
  - `SECURITY.md`: Threat model analysis, input sanitization rules, anti-cheating measures, and vulnerability disclosure policies.
  - `CONTRIBUTING.md`: Conventional commits specification, architectural guidelines, and PR checklists.
- `data/arenaData.ts`: Standardized arena dataset (`INITIAL_QUESTIONS`, `SAMPLE_QUESTION`, `LOBBY_PARTICIPANTS`, `SCOREBOARD_TOP7`, `FINAL_PODIUM`).
- `OptionBadge.tsx`: Reusable geometric + color option badge component for accessible option rendering.
- `OptionButton.tsx`: Full-featured accessible option button atom (▲, ◆, ●, ■) with WCAG AA contrast, reveal state animations, and vote share bar charts.
- `ProjectorHeader.tsx`: Large projector countdown timer display with tabular numbers, dynamic progress bar, urgency state indicator, live answered count, and room PIN badge.
- `PlayerTapPad.tsx`: Ergonomic mobile controller tap pad exceeding 44px touch targets (96px+), optimistic lock feedback, Web Audio tap triggers, and keyboard shortcuts (1/2/3/4 or A/B/C/D).
- Strict security configuration in `.gitignore` protecting local SQLite databases and environment files.

### Changed
- Refactored `hooks/use-mobile.ts` to utilize `React.useSyncExternalStore` for SSR-safe, hydration-safe responsive viewport detection.
- Unified canonical type system: eliminated duplicate `Player` and `Question` interfaces by introducing `ArenaDisplayQuestion` and `ArenaScoreboardPlayer` extending canonical models in `types/`.
- Updated `package.json` project name to `bdcahoot-live-arena` and removed unused `firebase-tools`.
- Reorganized documentation structure: centralized technical blueprints into the `docs/` directory (`docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, `docs/ROADMAP.md`).

---

## [0.2.0] - 2026-09-10

### Added
- **Phase 3 Complete: Host Quiz Management (Pre-Game) & Performance Hardening**
  - `components/host/HostLanding.tsx`: High-contrast dual CTA hero with 6-digit PIN modal, interactive sound effects, and stage routing.
  - `app/host/library/page.tsx`: Quiz Library dashboard with persistent storage, ready vs draft indicators, duration calculator, incomplete question warning banner, and delete safeguard modal.
  - `components/host/QuizEditorView.tsx` & `app/host/quiz/[id]/edit/page.tsx`: Full interactive quiz & question editor supporting dynamic reordering (Up/Down), add/delete questions with 1-question minimum guard, timer presets (10s/15s/20s/30s), 4-option geometry badges (▲, ◆, ●, ■), and instant autosave.
  - `components/host/GameSettingsView.tsx` & `app/host/quiz/[id]/settings/page.tsx`: Pre-game configuration screen with question shuffling toggle, reveal duration presets (3s/4s/5s), dynamic room PIN generator, and room launch engine.
  - `components/host/HostQuizManagement.tsx`: Unified host quiz management studio integrating Quiz Library (D2), Quiz/Question Editor (D3/D4), and Game Settings (D5).
  - `lib/quizStore.ts`: Persistent local quiz store with pre-seeded competition quizzes (`BDCAHOOT Championship 2026`, `Web Architecture Trivia`, draft template).
  - `lib/soundFX.ts`: Non-blocking browser Web Audio synthesizer for tactile UI clicks, success chimes, and validation alerts.
  - `lib/constants.ts`: Added `generateRoomCode()` (unambiguous 6-char PIN generator `BDA...`), `ANSWER_GRACE_PERIOD_MS` (200ms anti-cheat grace), and `BATCH_FLUSH_INTERVAL_MS` (300ms batching interval).
  - High-Concurrency Batching Buffer (`MockGameContext.tsx`): 300ms buffered state flush queue eliminating 55+ concurrent React re-render bursts during rapid answer taps.
  - Anti-Cheat Guards: Stage validation (`room.stage === 'QUESTION'`) and late packet deadline enforcement (`endsAtMs + 200ms`).
  - Lazy Calculations: Deferred answer distribution and leaderboard sorting until `REVEAL` and `SCOREBOARD` stages.
  - `scripts/verify-phase3.mjs`: Automated regression test suite covering quiz validation, name sanitization, question shuffling, and timer bounds.
  - `scripts/verify-stress-performance.mjs`: Automated benchmark & stress test suite simulating 55 players across 30 questions (1,650 answers in ~1ms).

---

## [0.1.0] - 2026-09-07

### Added
- **Phase 1 Complete: Foundations & Core Invariants**
  - Canonical game and quiz types (`types/game.ts`, `types/quiz.ts`).
  - Mathematical exponential speed bonus engine with guaranteed `max(1, round(B_raw))` floor (`lib/scoring.ts`).
  - Deterministic 3-tier tie-breaking calculation hierarchy (`lib/scoring.ts`).
  - Strict player name validation (alphabets A-Z only, case-insensitive uniqueness check) and quiz validation (`lib/validation.ts`).
  - State-driven `MockGameContext` store supporting full stage progression (`LOBBY` → `QUESTION` → `REVEAL` → `SCOREBOARD` → `FINAL`).
  - Route skeletons: Landing (`/`), Host library (`/host/library`), Player join (`/player/join`), Player name (`/player/name`), Host room (`/host/room/[code]`), and Player room (`/player/room/[code]`).
