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
- Strict security configuration in `.gitignore` protecting local SQLite databases and environment files.

### Changed
- Refactored `hooks/use-mobile.ts` to utilize `React.useSyncExternalStore` for SSR-safe, hydration-safe responsive viewport detection.
- Unified canonical type system: eliminated duplicate `Player` and `Question` interfaces by introducing `ArenaDisplayQuestion` and `ArenaScoreboardPlayer` extending canonical models in `types/`.
- Updated `package.json` project name to `bdcahoot-live-arena` and removed unused `firebase-tools`.
- Reorganized documentation structure: centralized technical blueprints into the `docs/` directory (`docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, `docs/ROADMAP.md`).

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
