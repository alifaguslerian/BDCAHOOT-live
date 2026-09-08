# BDCAHOOT Live Arena — Design System Specification

> Comprehensive design system, visual token guidelines, and UI ergonomics for stage projections and mobile viewports.

---

## 1. Visual Archetype: "Stage & Arena Energy"

BDCAHOOT Live Arena is styled to evoke the excitement, anticipation, and focus of a premier stage competition or esport arena. It avoids:
- Corporate SaaS monotony (white cards, generic pastel gradients, subdued gray palettes).
- AI-generated clichés (purple-to-blue neon gradients, arbitrary glassmorphism glow, floating pill tabs).
- Hyperactive gamer aesthetics (unreadable decorative cyber fonts, flashing strobes).

The goal is high-contrast, confident stage legibility that can be read effortlessly from the last row of a brightly lit university auditorium, paired with a tactile, tap-friendly mobile controller.

---

## 2. Color Palette & Semantic Tokens

### Base & Surface Colors

| Token | Hex Value | Usage | Rationale |
| :--- | :--- | :--- | :--- |
| `bg-base` | `#0B0E14` | Primary viewport background | Deep near-black navy. Prevents harsh projector glare while maintaining deep black levels. |
| `bg-surface` | `#151A22` | Card, container, and dialog panels | Subtle 5% lift above base for depth without relying on drop shadows. |
| `bg-surface-elevated` | `#1E2530` | Interactive card hover, input surfaces | Clear contrast boundary for interactive zones. |
| `accent-primary` | `#F5A623` | Main CTA buttons, timer highlights, podium 1st | High-energy golden amber. Commands immediate visual hierarchy. |
| `text-primary` | `#F5F7FA` | Primary display headings and labels | Crisp off-white (>14:1 contrast ratio against `#0B0E14`). |
| `text-secondary` | `#E1E2EB` | Question prompts and body text | High readability neutral text. |
| `text-muted` | `#8B93A1` | Metadata, subtitles, helper text | Subdued label text passing WCAG AA requirements (>4.5:1). |
| `state-correct` | `#3ECF8E` | Correct answer highlight, success states | Vibrant emerald green. |
| `state-disconnected`| `#8B93A1` | Disconnected player status indicator | Muted gray rather than alarming red (disconnects are normal on venue Wi-Fi). |

---

## 3. Four-Option Accessibility Mapping (Color + Geometry)

> **Critical Invariant**: Color alone must NEVER be the sole differentiator between answer choices. Every choice is permanently bound to a geometric shape.

```
       [ ▲ OPSI A ]                    [ ◆ OPSI B ]
  Color: Merah (#F04438)          Color: Biru (#3B82F6)
  Shape: Segitiga (Triangle)      Shape: Berlian (Diamond)

       [ ● OPSI C ]                    [ ■ OPSI D ]
  Color: Kuning (#EAB308)         Color: Hijau (#22C55E)
  Shape: Lingkaran (Circle)       Shape: Kotak (Square)
```

### Technical Token Specifications

```typescript
export const OPTION_CONFIGS = {
  A: {
    key: 'A',
    name: 'Merah',
    hex: '#F04438',
    bgTint: 'rgba(240, 68, 56, 0.15)',
    symbol: '▲',
    shape: 'triangle',
  },
  B: {
    key: 'B',
    name: 'Biru',
    hex: '#3B82F6',
    bgTint: 'rgba(59, 130, 246, 0.15)',
    symbol: '◆',
    shape: 'diamond',
  },
  C: {
    key: 'C',
    name: 'Kuning',
    hex: '#EAB308',
    bgTint: 'rgba(234, 179, 8, 0.15)',
    symbol: '●',
    shape: 'circle',
  },
  D: {
    key: 'D',
    name: 'Hijau',
    hex: '#22C55E',
    bgTint: 'rgba(34, 197, 94, 0.15)',
    symbol: '■',
    shape: 'square',
  },
};
```

---

## 4. Typography Hierarchy

Fonts are loaded locally through `next/font/google` with zero layout shift (`display: swap`).

### 1. Display & Timer: `Anybody`
- **Subsets**: Latin
- **Weights**: 700 (Bold), 800 (ExtraBold), 900 (Black)
- **Application**: Host Question prompts, Countdown clock, Big Podium badges, Room codes.
- **Characteristics**: Punchy, geometric, condensed proportions. Ensures long question statements remain within the top half of projector viewports.

### 2. UI & Body: `Space Grotesk`
- **Subsets**: Latin
- **Weights**: 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold)
- **Application**: Option labels, mobile buttons, scoreboard entries, player names, form inputs.
- **Characteristics**: Crisp monospaced-inspired geometric sans-serif that conveys technical authority.

### Tabular Numbers Requirement
All dynamic numeric counters (timer seconds, player scores, rank deltas) must utilize `.tabular-nums` (`font-variant-numeric: tabular-nums`) to prevent layout flickering as numbers increment or decrement.

---

## 5. Viewport Density & Ergonomics

### Host Projector Viewport (`/host/room/:code`)
- **Single-Focus Layout**: Only one primary activity is emphasized at any time (e.g. Question and Options, or Reveal Chart, or Top 10 Scoreboard). Never split the projector into cluttered multi-column widgets.
- **Reading Distance Calibration**: Questions are styled at `text-3xl` to `text-5xl` with line-height of 1.25. Options span a balanced 2x2 grid with high-contrast borders.
- **Embedded Host Controls**: Action buttons ("LANJUT", "LIHAT HASIL", "KEMBALI KE LIBRARY") occupy a discrete header or bottom bar. They are distinct, high-contrast, and keyboard-accessible (`Space` / `Enter`), without obstructing spectator view.

### Mobile Player Viewport (`/player/room/:code`)
- **Touch Targets**: All interactive option buttons (`OptionTapCard`) enforce a **minimum height of 64px** and width of 100%, comfortably exceeding the 44px WCAG mobile benchmark.
  - *Note on Component Roles*: `OptionBadge` is a compact, display-only badge used for inline labels and preview chips (`py-1` to `py-2`), whereas `OptionTapCard` (implemented in Phase 6) is the full-sized interactive touch button with `min-h-[64px]`.
- **Corner Radii**: 
  - Host Stage Elements: `4px–8px` (sharp, athletic, confident).
  - Mobile Option Buttons (`OptionTapCard`): `16px–20px` (comfortable tactile surface for rapid thumb taps).
- **Instant Haptic Visuals**: On tap, the selected choice highlights instantly (`active:scale-[0.98]`), non-selected options dim to 30% opacity, and secondary taps are silently ignored.

---

## 6. Animation & Motion Standards

1. **Host Display**:
   - Reveal: Bar distribution charts expand via smooth spring physics (`scaleX` / `width` transition).
   - Scoreboard: Climbing players animate upward with a distinct badge highlight (`↑3 NAIK`).
   - Podium: Top 3 rise sequentially (3rd place first, then 2nd place, and grand climax for 1st place).
2. **Player Mobile**:
   - Strictly minimalist transitions (subtle opacity fades).
   - Zero heavy canvas loops or physics particles on mobile to preserve battery life and prevent CPU throttling on low-spec student smartphones.
