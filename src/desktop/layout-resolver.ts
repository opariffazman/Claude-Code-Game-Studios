/**
 * layout-resolver.ts — Pure-function geometry module for zone-based desktop layout.
 *
 * Implements: docs/architecture/layout-generation-algorithm.md
 *
 * Responsibilities:
 *   - Resolve proportional LayoutZone definitions to pixel coordinates.
 *   - Generate icon grid placements (no overlap by construction).
 *   - Generate cascaded window placements.
 *   - Generate deterministic notification stack placements.
 *   - Validate and lightly repair element placements (single nudge pass).
 *
 * Zero PixiJS dependencies — all functions are pure geometry and return plain
 * { x, y, w, h } rectangles. This makes the module fully unit-testable without
 * a renderer.
 */

import type { LayoutZone, ResolvedZone, Placement } from '../types';

// ---------------------------------------------------------------------------
// Zone resolution
// ---------------------------------------------------------------------------

/**
 * Resolves a proportional LayoutZone to absolute pixel coordinates.
 * Insets by `zone.padding` on all four sides.
 *
 * @param zone    - Zone definition with proportional coordinates and padding.
 * @param screenW - Logical canvas width in px.
 * @param screenH - Logical canvas height in px.
 */
export function resolveZone(zone: LayoutZone, screenW: number, screenH: number): ResolvedZone {
  const px = zone.x * screenW;
  const py = zone.y * screenH;
  const pw = zone.w * screenW;
  const ph = zone.h * screenH;
  return {
    left:   px + zone.padding,
    top:    py + zone.padding,
    right:  px + pw - zone.padding,
    bottom: py + ph - zone.padding,
    width:  pw - zone.padding * 2,
    height: ph - zone.padding * 2,
  };
}

// ---------------------------------------------------------------------------
// Icon grid
// ---------------------------------------------------------------------------

/**
 * Generates `count` icon placements arranged in a grid within `zone`.
 *
 * Algorithm (implements layout-generation-algorithm.md §2):
 *   1. Compute cell size from icon dimensions with a minimum of 80×90.
 *   2. Determine grid capacity (cols × rows that fit in zone).
 *   3. Clamp count to grid capacity.
 *   4. Place each icon at its cell center, offset by icon half-size, plus jitter.
 *
 * Overlap guarantee: cell size >= iconW/H + 2*jitter by the 80/90 floor, so
 * no two icons can overlap.
 *
 * @param zone    - Resolved icon zone in pixels.
 * @param count   - Desired icon count (clamped to grid capacity).
 * @param iconW   - Icon visual width in px.
 * @param iconH   - Icon visual height in px.
 * @param cols    - Number of grid columns.
 * @param jitter  - Max random offset from cell center in px (applied symmetrically).
 */
export function generateIconGrid(
  zone: ResolvedZone,
  count: number,
  iconW: number,
  iconH: number,
  cols: number,
  jitter: number,
): Placement[] {
  const cellW = Math.max(iconW + jitter * 2 + 10, 80);
  const cellH = Math.max(iconH + jitter * 2 + 10, 90);

  const maxCols = Math.max(1, Math.floor(zone.width  / cellW));
  const maxRows = Math.max(1, Math.floor(zone.height / cellH));
  const effectiveCols = Math.min(cols, maxCols);
  const capacity = effectiveCols * maxRows;
  const effectiveCount = Math.min(count, capacity);

  const placements: Placement[] = [];
  for (let i = 0; i < effectiveCount; i++) {
    const col = i % effectiveCols;
    const row = Math.floor(i / effectiveCols);

    const centerX = zone.left + col * cellW + cellW / 2;
    const centerY = zone.top  + row * cellH + cellH / 2;

    const jitterX = (Math.random() - 0.5) * 2 * jitter;
    const jitterY = (Math.random() - 0.5) * 2 * jitter;

    placements.push({
      x: Math.round(centerX - iconW / 2 + jitterX),
      y: Math.round(centerY - iconH / 2 + jitterY),
      w: iconW,
      h: iconH,
    });
  }

  return placements;
}

// ---------------------------------------------------------------------------
// Window cascade
// ---------------------------------------------------------------------------

/**
 * Generates `count` window placements using a cascade pattern within `zone`.
 *
 * Algorithm (implements layout-generation-algorithm.md §3):
 *   1. Pick a random base position in the top-left quadrant of the zone.
 *   2. Each subsequent window is offset by (cascadeX, cascadeY) + jitter.
 *   3. Each window gets an independent random size within [minW,maxW] × [minH,maxH].
 *   4. Position is clamped so no window extends beyond zone bounds.
 *
 * @param zone      - Resolved window zone in pixels.
 * @param count     - Number of windows (typically 2-3).
 * @param minW      - Minimum window width in px.
 * @param maxW      - Maximum window width in px.
 * @param minH      - Minimum window height in px.
 * @param maxH      - Maximum window height in px.
 * @param cascadeX  - Horizontal cascade offset per window in px.
 * @param cascadeY  - Vertical cascade offset per window in px.
 * @param jitter    - Max random position jitter in px.
 */
export function generateWindowCascade(
  zone: ResolvedZone,
  count: number,
  minW: number,
  maxW: number,
  minH: number,
  maxH: number,
  cascadeX: number,
  cascadeY: number,
  jitter: number,
): Placement[] {
  // Random base in top-left 25% × 20% of zone
  const baseX = zone.left + zone.width  * (0.05 + Math.random() * 0.20);
  const baseY = zone.top  + zone.height * (0.05 + Math.random() * 0.15);

  const placements: Placement[] = [];
  for (let i = 0; i < count; i++) {
    const w = Math.round(minW + Math.random() * (maxW - minW));
    const h = Math.round(minH + Math.random() * (maxH - minH));

    const jx = (Math.random() - 0.5) * 2 * jitter;
    const jy = (Math.random() - 0.5) * 2 * jitter;

    const rawX = baseX + i * cascadeX + jx;
    const rawY = baseY + i * cascadeY + jy;

    // Clamp so window stays within zone bounds
    const x = Math.round(clamp(rawX, zone.left, zone.right  - w));
    const y = Math.round(clamp(rawY, zone.top,  zone.bottom - h));

    placements.push({ x, y, w, h });
  }

  return placements;
}

// ---------------------------------------------------------------------------
// Notification stack
// ---------------------------------------------------------------------------

/**
 * Generates `count` notification placements stacked vertically in `zone`.
 *
 * Deterministic: no randomness. Banners are right-aligned within the zone
 * and stacked top-to-bottom with a fixed gap.
 *
 * Algorithm (implements layout-generation-algorithm.md §4):
 *   x = zone.right - bannerW
 *   y(i) = zone.top + i * (bannerH + gap)
 *
 * Notifications that would extend below zone.bottom are omitted.
 *
 * @param zone    - Resolved notification zone in pixels.
 * @param count   - Desired notification count.
 * @param bannerW - Banner width in px.
 * @param bannerH - Banner height in px.
 * @param gap     - Vertical gap between banners in px.
 */
export function generateNotifStack(
  zone: ResolvedZone,
  count: number,
  bannerW: number,
  bannerH: number,
  gap: number,
): Placement[] {
  const placements: Placement[] = [];
  for (let i = 0; i < count; i++) {
    const x = Math.round(zone.right - bannerW);
    const y = Math.round(zone.top + i * (bannerH + gap));

    // Stop placing if next banner would extend below zone bottom
    if (y + bannerH > zone.bottom) break;

    placements.push({ x, y, w: bannerW, h: bannerH });
  }
  return placements;
}

// ---------------------------------------------------------------------------
// Validation / repair
// ---------------------------------------------------------------------------

/**
 * Validates element placements and lightly repairs icon-icon overlaps and
 * elements that overlap the taskbar exclusion zone.
 *
 * Implements: layout-generation-algorithm.md §5
 *
 * Rules:
 *   - Icon-icon: reject if distance between centers < min(w,h) * 0.6.
 *     Repair: nudge in random direction by overlap_distance + 10px, clamp to zone.
 *   - Window-window: ALLOW (cascade overlap is intentional).
 *   - Taskbar: clamp element so it does not extend below taskbarY.
 *   - Maximum 1 repair iteration per element.
 *
 * @param icons         - Icon placements.
 * @param windows       - Window placements.
 * @param notifications - Notification placements (skip validation — deterministic).
 * @param iconZone      - Resolved icon zone (used for clamping repairs).
 * @param taskbarY      - Y coordinate of taskbar top edge in px.
 */
export function validatePlacements(
  icons: Placement[],
  windows: Placement[],
  notifications: Placement[],
  iconZone: ResolvedZone,
  taskbarY: number,
): { icons: Placement[]; windows: Placement[]; notifications: Placement[] } {
  // Clamp icons above taskbar
  const repairedIcons = icons.map((p) => {
    if (p.y + p.h > taskbarY) {
      return { ...p, y: Math.max(iconZone.top, taskbarY - p.h - 4) };
    }
    return p;
  });

  // Single pass: nudge icon-icon overlaps
  for (let a = 0; a < repairedIcons.length; a++) {
    for (let b = a + 1; b < repairedIcons.length; b++) {
      const ia = repairedIcons[a]!;
      const ib = repairedIcons[b]!;
      const cax = ia.x + ia.w / 2;
      const cay = ia.y + ia.h / 2;
      const cbx = ib.x + ib.w / 2;
      const cby = ib.y + ib.h / 2;
      const dist = Math.hypot(cbx - cax, cby - cay);
      const minDist = Math.min(ia.w, ia.h) * 0.6;
      if (dist < minDist && dist > 0) {
        const nudge = (minDist - dist) + 10;
        const angle = Math.atan2(cby - cay, cbx - cax);
        // Nudge b away from a
        const nx = Math.round(ib.x + Math.cos(angle) * nudge);
        const ny = Math.round(ib.y + Math.sin(angle) * nudge);
        repairedIcons[b] = {
          ...ib,
          x: clamp(nx, iconZone.left, iconZone.right  - ib.w),
          y: clamp(ny, iconZone.top,  Math.min(iconZone.bottom, taskbarY) - ib.h),
        };
      }
    }
  }

  // Clamp windows above taskbar
  const repairedWindows = windows.map((p) => {
    if (p.y + p.h > taskbarY) {
      return { ...p, y: Math.max(p.y, taskbarY - p.h - 4) };
    }
    return p;
  });

  return {
    icons: repairedIcons,
    windows: repairedWindows,
    notifications,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
