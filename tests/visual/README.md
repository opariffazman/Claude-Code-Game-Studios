# Visual QA Tests

Run visual tests using Playwright CLI to verify desktop destruction effects, mouse interactions, and UI rendering.

## Prerequisites

- Dev server running on `localhost:3000`
- `playwright-cli` installed globally or available in PATH

## Usage

```bash
# Start dev server in another terminal
npm run dev

# Run visual QA tests
bash tests/visual/playwright-visual-test.sh
```

## Test Coverage

The script performs the following visual checks:

1. **Initial State** — Verifies app loads and renders correctly
2. **Keyboard Input** — Simulates keyboard mashing (a, s, d, f, g, h, j, k) to trigger destruction effects
3. **Mouse Clicks** — Triggers destruction at 5 different screen coordinates
4. **Drag Trail** — Simulates continuous mouse drag with sinusoidal path to verify trail rendering
5. **Rapid Combo** — Tests keyboard + mouse rapid-fire interactions for stability
6. **Console Errors** — Checks browser console for runtime errors

## Output

Screenshots are saved to `screenshots/` (gitignored):

- `qa-01-initial.png` — Initial desktop state
- `qa-02-after-mash.png` — After keyboard input
- `qa-03-after-clicks.png` — After mouse clicks
- `qa-04-drag-trail.png` — Drag trail visualization
- `qa-05-final.png` — Final state after rapid combo

Video recording (if supported) is also captured during rapid combo test.

## Interpreting Results

- All screenshots should show visible destruction effects (particles, screen shake, visual feedback)
- Drag trail should be visible across the screen with smooth motion path
- No console errors should be reported
- Frame rate should remain stable (visually smooth transitions)

## Notes

- Screenshots are gitignored to avoid bloating the repository
- Each screenshot shows cumulative effects (earlier destructive actions persist visually)
- The script uses `set -e` to exit on first error — see output for failure point
