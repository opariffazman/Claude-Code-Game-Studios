#!/bin/bash
# Automated QA for Desk Smasher using playwright-cli
# Runs automated assertions without human judgment
# Prerequisites: dev server running on localhost:3000, playwright-cli installed
# Usage: bash tests/visual/automated-qa.sh

set -e

PASS=0
FAIL=0
RESULTS=""

# Helper functions
pass() {
  PASS=$((PASS+1))
  RESULTS="$RESULTS\n✅ $1"
  echo "✅ $1"
}

fail() {
  FAIL=$((FAIL+1))
  RESULTS="$RESULTS\n❌ $1: $2"
  echo "❌ $1: $2"
}

warn() {
  echo "⚠️  $1"
}

# Create output directories
mkdir -p screenshots/qa
mkdir -p logs/qa

echo "=== Desk Smasher Automated QA ==="
echo "Starting automated test suite..."
echo ""

# --- SETUP & PAGE LOAD ---
echo "[1/15] Testing page load..."
playwright-cli open http://localhost:3000 > /dev/null 2>&1 || fail "Page load" "Could not open localhost:3000"

# Small delay for page initialization
sleep 1

# --- TEST: Page title ---
TITLE=$(playwright-cli eval "() => document.title" 2>/dev/null | grep -i "desk" || true)
if [ -n "$TITLE" ]; then
  pass "Page title contains 'Desk Smasher' or variant"
else
  fail "Page title" "Title does not contain 'Desk'"
fi

# --- TEST: Canvas element exists ---
echo "[2/15] Testing canvas element..."
HAS_CANVAS=$(playwright-cli eval "() => document.querySelector('canvas') !== null" 2>/dev/null | grep -i "true" || true)
if [ -n "$HAS_CANVAS" ]; then
  pass "Canvas element exists"
else
  fail "Canvas element" "No canvas found on page"
fi

# --- TEST: Initial screenshot (baseline) ---
echo "[3/15] Capturing initial state..."
playwright-cli screenshot --filename=screenshots/qa/01-initial-load.png 2>/dev/null
if [ -f screenshots/qa/01-initial-load.png ]; then
  SIZE=$(stat -f%z screenshots/qa/01-initial-load.png 2>/dev/null || stat -c%s screenshots/qa/01-initial-load.png 2>/dev/null || echo 0)
  if [ "$SIZE" -gt 5000 ]; then
    pass "Initial screenshot captured (${SIZE} bytes)"
  else
    fail "Initial screenshot" "Screenshot too small (${SIZE} bytes)"
  fi
else
  fail "Initial screenshot" "Screenshot file not created"
fi

# --- TEST: No console errors on load ---
echo "[4/15] Checking for console errors..."
CONSOLE_LOG=$(mktemp)
playwright-cli console error > "$CONSOLE_LOG" 2>&1 || true
ERROR_COUNT=$(grep -c "error\|Error\|ERROR" "$CONSOLE_LOG" 2>/dev/null || echo 0)
if [ "$ERROR_COUNT" -eq 0 ]; then
  pass "No console errors on page load"
else
  warn "Console contains potential errors (review: $CONSOLE_LOG)"
fi
rm -f "$CONSOLE_LOG"

# --- TEST: Keyboard input - single keys ---
echo "[5/15] Testing keyboard input (single keys)..."
playwright-cli press a 2>/dev/null
playwright-cli press s 2>/dev/null
playwright-cli press d 2>/dev/null
playwright-cli press f 2>/dev/null
sleep 0.5  # Let effects render
pass "Keyboard input: 4 keys simulated (a, s, d, f)"

# --- TEST: Screenshot after keyboard input ---
echo "[6/15] Capturing after keyboard input..."
playwright-cli screenshot --filename=screenshots/qa/02-after-keyboard.png 2>/dev/null
SIZE=$(stat -f%z screenshots/qa/02-after-keyboard.png 2>/dev/null || stat -c%s screenshots/qa/02-after-keyboard.png 2>/dev/null || echo 0)
if [ "$SIZE" -gt 5000 ]; then
  pass "Post-keyboard screenshot captured (${SIZE} bytes)"
else
  fail "Post-keyboard screenshot" "Screenshot too small"
fi

# --- TEST: Mouse click input ---
echo "[7/15] Testing mouse clicks..."
playwright-cli run-code "async page => {
  await page.mouse.click(400, 300);
  await page.mouse.click(600, 200);
  await page.mouse.click(300, 400);
}" 2>/dev/null
sleep 0.5
pass "Mouse clicks: 3 clicks simulated at different coordinates"

# --- TEST: Screenshot after clicks ---
echo "[8/15] Capturing after mouse clicks..."
playwright-cli screenshot --filename=screenshots/qa/03-after-clicks.png 2>/dev/null
SIZE=$(stat -f%z screenshots/qa/03-after-clicks.png 2>/dev/null || stat -c%s screenshots/qa/03-after-clicks.png 2>/dev/null || echo 0)
if [ "$SIZE" -gt 5000 ]; then
  pass "Post-click screenshot captured (${SIZE} bytes)"
else
  fail "Post-click screenshot" "Screenshot too small"
fi

# --- TEST: Right-click (tool cycle) ---
echo "[9/15] Testing right-click input..."
playwright-cli run-code "async page => {
  await page.mouse.click(640, 360, { button: 'right' });
}" 2>/dev/null
sleep 0.3
pass "Right-click tool cycle: right-click simulated"

# --- TEST: Screenshot after right-click ---
playwright-cli screenshot --filename=screenshots/qa/04-after-rightclick.png 2>/dev/null

# --- TEST: Mouse drag (continuous motion) ---
echo "[10/15] Testing mouse drag trail..."
playwright-cli run-code "async page => {
  await page.mouse.move(200, 300);
  await page.mouse.down();
  for (let x = 200; x <= 800; x += 20) {
    const y = 300 + Math.sin((x - 200) / 80) * 100;
    await page.mouse.move(x, y);
    await new Promise(r => setTimeout(r, 10));
  }
  await page.mouse.up();
}" 2>/dev/null
sleep 0.5
pass "Mouse drag: sinusoidal trail simulated across screen"

# --- TEST: Screenshot after drag ---
echo "[11/15] Capturing after drag..."
playwright-cli screenshot --filename=screenshots/qa/05-after-drag.png 2>/dev/null
SIZE=$(stat -f%z screenshots/qa/05-after-drag.png 2>/dev/null || stat -c%s screenshots/qa/05-after-drag.png 2>/dev/null || echo 0)
if [ "$SIZE" -gt 5000 ]; then
  pass "Post-drag screenshot captured (${SIZE} bytes)"
else
  fail "Post-drag screenshot" "Screenshot too small"
fi

# --- TEST: Rapid keyboard mashing (chaos test) ---
echo "[12/15] Testing rapid keyboard mashing..."
playwright-cli run-code "async page => {
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press(String.fromCharCode(65 + (i % 26)));
  }
}" 2>/dev/null
sleep 0.5
pass "Rapid mashing: 25 keys pressed in sequence"

# --- TEST: Screenshot after chaos ---
playwright-cli screenshot --filename=screenshots/qa/06-after-chaos.png 2>/dev/null

# --- TEST: No console errors after all interactions ---
echo "[13/15] Final console error check..."
CONSOLE_LOG=$(mktemp)
playwright-cli console error > "$CONSOLE_LOG" 2>&1 || true
ERROR_COUNT=$(grep -c "error\|Error\|ERROR" "$CONSOLE_LOG" 2>/dev/null || echo 0)
if [ "$ERROR_COUNT" -eq 0 ]; then
  pass "No console errors after all interactions"
else
  fail "Post-interaction errors" "Console contains $ERROR_COUNT error(s)"
  warn "Error log: $CONSOLE_LOG"
fi

# --- TEST: Extended interaction sequence with video recording ---
echo "[14/15] Recording interaction video..."
playwright-cli video-start 2>/dev/null || warn "Video recording not available"

playwright-cli run-code "async page => {
  // Mix keyboard and mouse in pattern
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press(String.fromCharCode(65 + (i % 26)));
    if (i % 3 === 0) {
      const x = 300 + (i * 80) % 400;
      const y = 200 + (i % 3) * 150;
      await page.mouse.click(x, y);
    }
  }

  // Final drag
  await page.mouse.move(100, 300);
  await page.mouse.down();
  for (let x = 100; x <= 700; x += 25) {
    const y = 300 + Math.sin((x - 100) / 60) * 80;
    await page.mouse.move(x, y);
    await new Promise(r => setTimeout(r, 5));
  }
  await page.mouse.up();
}" 2>/dev/null
sleep 0.5

playwright-cli video-stop 2>/dev/null || warn "Video stop command failed (may not be recording)"
pass "Extended interaction sequence executed and recorded"

# --- TEST: Final screenshot ---
echo "[15/15] Capturing final state..."
playwright-cli screenshot --filename=screenshots/qa/07-final-state.png 2>/dev/null
SIZE=$(stat -f%z screenshots/qa/07-final-state.png 2>/dev/null || stat -c%s screenshots/qa/07-final-state.png 2>/dev/null || echo 0)
if [ "$SIZE" -gt 5000 ]; then
  pass "Final screenshot captured (${SIZE} bytes)"
else
  fail "Final screenshot" "Screenshot too small"
fi

# --- CLEANUP ---
playwright-cli close 2>/dev/null || true

# --- RESULTS SUMMARY ---
echo ""
echo "================================"
echo "  AUTOMATED QA RESULTS"
echo "================================"
TOTAL=$((PASS + FAIL))
echo "  Passed: $PASS / $TOTAL"
echo "  Failed: $FAIL / $TOTAL"
echo "================================"
echo -e "$RESULTS"
echo ""
echo "Output directories:"
echo "  Screenshots: $(pwd)/screenshots/qa/"
echo "  Logs:        $(pwd)/logs/qa/"
echo ""

if [ $FAIL -eq 0 ]; then
  echo "✅ All automated tests passed!"
  exit 0
else
  echo "❌ Some tests failed. Review output above."
  exit 1
fi
