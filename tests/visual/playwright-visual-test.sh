#!/bin/bash
# Visual QA test for Desk Smasher using playwright-cli
# Run: bash tests/visual/playwright-visual-test.sh
# Prerequisites: dev server running on localhost:3000

set -e
mkdir -p screenshots

echo "=== Desk Smasher Visual QA Test ==="

# 1. Open browser and navigate
playwright-cli open http://localhost:3000
echo "✓ Page loaded"

# 2. Take initial screenshot
playwright-cli screenshot --filename=screenshots/qa-01-initial.png
echo "✓ Initial desktop screenshot taken"

# 3. Press keys to trigger destruction effects
playwright-cli press a
playwright-cli press s
playwright-cli press d
playwright-cli press f
playwright-cli press g
playwright-cli press h
playwright-cli press j
playwright-cli press k
echo "✓ Keyboard mashing simulated (8 keys)"

# 4. Screenshot after keyboard mashing
playwright-cli screenshot --filename=screenshots/qa-02-after-mash.png
echo "✓ Post-mash screenshot taken"

# 5. Simulate mouse clicks at different positions
playwright-cli run-code "async page => {
  await page.mouse.click(400, 300);
  await page.mouse.click(600, 200);
  await page.mouse.click(300, 400);
  await page.mouse.click(700, 350);
  await page.mouse.click(500, 250);
}"
echo "✓ 5 mouse clicks simulated"

# 6. Screenshot after clicks
playwright-cli screenshot --filename=screenshots/qa-03-after-clicks.png
echo "✓ Post-click screenshot taken"

# 7. Simulate drag across screen
playwright-cli run-code "async page => {
  await page.mouse.move(100, 300);
  await page.mouse.down();
  for (let x = 150; x <= 900; x += 15) {
    await page.mouse.move(x, 300 + Math.sin((x-100)/80) * 60);
  }
  await page.mouse.up();
}"
echo "✓ Mouse drag simulated"

# 8. Screenshot showing drag trail
playwright-cli screenshot --filename=screenshots/qa-04-drag-trail.png
echo "✓ Drag trail screenshot taken"

# 9. Start video for continuous action test
playwright-cli video-start
echo "✓ Video recording started"

# 10. Rapid keyboard + mouse combo
playwright-cli run-code "async page => {
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press(String.fromCharCode(65 + (i % 26)));
  }
  for (let i = 0; i < 5; i++) {
    await page.mouse.click(200 + i * 150, 200 + (i % 3) * 100);
  }
}"
echo "✓ Rapid combo simulated"

# 11. Stop video
playwright-cli video-stop
echo "✓ Video saved"

# 12. Final screenshot
playwright-cli screenshot --filename=screenshots/qa-05-final.png
echo "✓ Final screenshot taken"

# 13. Check console for errors
playwright-cli console error
echo "✓ Console errors checked"

# 14. Close browser
playwright-cli close
echo ""
echo "=== QA Test Complete ==="
echo "Screenshots saved to screenshots/"
echo "Review: screenshots/qa-01-initial.png through qa-05-final.png"
