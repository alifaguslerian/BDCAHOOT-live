# Contributing Guidelines

Thank you for contributing to **BDCAHOOT Live Arena**! To maintain code quality, architectural consistency, and event reliability, please review these engineering guidelines before submitting contributions.

---

## 1. Development Principles

1. **LAN-First Supremacy**: Never introduce dependencies requiring mandatory external internet connections during gameplay. The core gameplay loop must remain 100% operational on an isolated offline router.
2. **Server-Authoritative Clock**: The host server is the single source of truth for time, scoring, and state. Never delegate scoring or timer termination decisions to client-side code.
3. **Respect Locked Invariants**: Do not alter the locked game rules defined in the project blueprint:
   - Microsecond exponential speed bonus formula: $B_{\text{raw}} = 1000 \cdot e^{-4 \cdot (t/T)}$.
   - Floor guarantee: $\max(1, \text{round}(B_{\text{raw}}))$.
   - Non-skippable question timer on Host display.
   - Combined Host control and projector display (OQ-1 locked).
   - Case-insensitive, alphabet-only player name uniqueness.
4. **Clean Code & Performance**:
   - Zero cascading re-renders in React hooks.
   - Avoid memory leaks: always clean up socket listeners and timer intervals.
   - Keep mobile bundle sizes lightweight: avoid heavy 3D canvas libraries on mobile views.

---

## 2. Commit Message Conventions

We adhere to the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <short description in present tense>

[optional body explaining context and rationale]
```

### Supported Types:
- `feat`: A new user-facing feature or screen state.
- `fix`: A bug fix or timing correction.
- `docs`: Documentation updates (README, ARCHITECTURE, ROADMAP, etc.).
- `style`: Formatting, CSS tokens, or whitespace adjustments with no logic change.
- `refactor`: Code restructuring without changing external behavior.
- `perf`: Performance optimization (memoization, query tuning, throttling).
- `test`: Adding or updating automated test suites.
- `chore`: Maintenance tasks, dependencies, or configuration changes.

*Example*:
```
feat(scoring): apply strict post-round floor to speed bonus calculation
docs(roadmap): update phase 2 progress with Stitch dataset integration
fix(host): throttle answer counter to 300ms to avoid dom thrashing
```

---

## 3. Pull Request & Verification Workflow

Before submitting or requesting a review on a pull request:

1. **Verify TypeScript Compilation**:
   ```bash
   npm run build
   ```
   *Must compile with 0 errors.*

2. **Verify Linter Cleanliness**:
   ```bash
   npm run lint
   ```
   *Must exit with 0 errors and 0 warnings. Ensure React 19 hooks purity rules are satisfied.*

3. **Self-Review Checklist**:
   - [ ] Does this PR touch `.env` or commit any secret credentials? *(Must be NO)*
   - [ ] Does this PR introduce unnecessary dependencies? *(Prefer native utilities)*
   - [ ] Has the corresponding documentation in `ROADMAP.md` or `ARCHITECTURE.md` been updated?
   - [ ] Has manual testing been executed on both desktop and mobile viewports?

---

## 4. Code Style & Architecture Placement

- **Single Route Consistency**: Never create separate Next.js page routes for sub-stages of an active game (e.g. do not create `/host/room/:code/question`). Sub-stages must render dynamically within the single-route orchestrator.
- **Icon Usage**: Import icons strictly from `lucide-react`.
- **CSS Utility Pattern**: Always use Tailwind utility classes directly. Avoid inline style attributes unless calculating dynamic percentage widths (e.g. live distribution bar widths).
