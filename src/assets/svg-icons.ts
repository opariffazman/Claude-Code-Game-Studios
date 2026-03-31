/**
 * Icon drawing definitions for desktop elements.
 * Each icon is drawn using PixiJS v8 Graphics API — no external assets or emojis.
 *
 * Coordinate system: all shapes are relative to (cx, cy) and scaled by `size`.
 * The `color` param fills the primary shape; accents use 0xffffff at reduced alpha.
 *
 * PixiJS v8 API used here:
 *   g.rect(x,y,w,h).fill(color)
 *   g.roundRect(x,y,w,h,r).fill(color)
 *   g.circle(x,y,r).fill(color)
 *   g.poly([...]).fill(color)
 *   g.moveTo(x,y).lineTo(x,y).stroke({color,width,alpha?})
 *   g.arc(x,y,r,start,end).stroke({color,width})
 */
import { Graphics } from 'pixi.js';

// ---------------------------------------------------------------------------
// IconDef interface
// ---------------------------------------------------------------------------

/** Contract for all icon drawing functions. */
export interface IconDef {
  /**
   * Draws the icon into `g` centred at (cx, cy).
   *
   * @param g     - Target Graphics instance (PixiJS v8).
   * @param cx    - Centre x in the Graphics's local space.
   * @param cy    - Centre y in the Graphics's local space.
   * @param size  - Bounding diameter — shapes should fit within this radius.
   * @param color - Primary fill colour (hex number).
   */
  draw(g: Graphics, cx: number, cy: number, size: number, color: number): void;
}

// ---------------------------------------------------------------------------
// Helper: half-size shorthand used throughout
// ---------------------------------------------------------------------------
// All shapes use `h = size / 2` as their working radius so every icon
// fits inside a circle of radius `size`.

// ---------------------------------------------------------------------------
// 16 Desktop Icons
// ---------------------------------------------------------------------------

/** Paper sheet with folded top-right corner + 3 horizontal text lines. */
const Docs: IconDef = {
  draw(g, cx, cy, size, color) {
    const h = size / 2;
    const fold = h * 0.3;
    // Sheet body (clipped top-right by fold)
    g.poly([
      cx - h, cy - h,
      cx + h - fold, cy - h,
      cx + h, cy - h + fold,
      cx + h, cy + h,
      cx - h, cy + h,
    ]).fill(color);
    // Fold crease triangle
    g.poly([cx + h - fold, cy - h, cx + h, cy - h + fold, cx + h - fold, cy - h + fold])
      .fill({ color: 0xffffff, alpha: 0.4 });
    // Text lines
    const lx = cx - h + h * 0.2;
    const lw = size - size * 0.4;
    g.rect(lx, cy - h * 0.2, lw, h * 0.12).fill({ color: 0xffffff, alpha: 0.7 });
    g.rect(lx, cy + h * 0.05, lw, h * 0.12).fill({ color: 0xffffff, alpha: 0.7 });
    g.rect(lx, cy + h * 0.3, lw * 0.65, h * 0.12).fill({ color: 0xffffff, alpha: 0.7 });
  },
};

/** Quarter note: filled circle + vertical stem + flag curve. */
const Music: IconDef = {
  draw(g, cx, cy, size, color) {
    const h = size / 2;
    // Note head (oval approximated as a slightly squashed circle)
    g.circle(cx - h * 0.15, cy + h * 0.55, h * 0.28).fill(color);
    // Stem
    g.rect(cx + h * 0.1, cy - h * 0.65, h * 0.15, h * 1.2).fill(color);
    // Flag — two arcs approximated as a thick bezier-like poly
    g.poly([
      cx + h * 0.1, cy - h * 0.65,
      cx + h * 0.75, cy - h * 0.3,
      cx + h * 0.55, cy + h * 0.0,
      cx + h * 0.25, cy - h * 0.1,
      cx + h * 0.62, cy - h * 0.4,
      cx + h * 0.25, cy - h * 0.65,
    ]).fill(color);
  },
};

/** Gamepad: rounded rect body + d-pad cross + 2 face buttons. */
const Games: IconDef = {
  draw(g, cx, cy, size, color) {
    const h = size / 2;
    // Body
    g.roundRect(cx - h, cy - h * 0.55, size, h * 1.1, h * 0.3).fill(color);
    // D-pad cross (left side)
    const dx = cx - h * 0.45;
    const dy = cy;
    const arm = h * 0.15;
    const len = h * 0.2;
    g.rect(dx - arm, dy - arm - len, arm * 2, len).fill({ color: 0xffffff, alpha: 0.8 });
    g.rect(dx - arm, dy + arm, arm * 2, len).fill({ color: 0xffffff, alpha: 0.8 });
    g.rect(dx - arm - len, dy - arm, len, arm * 2).fill({ color: 0xffffff, alpha: 0.8 });
    g.rect(dx + arm, dy - arm, len, arm * 2).fill({ color: 0xffffff, alpha: 0.8 });
    // Face buttons (right side)
    g.circle(cx + h * 0.35, cy - h * 0.15, h * 0.13).fill({ color: 0xffffff, alpha: 0.8 });
    g.circle(cx + h * 0.6, cy + h * 0.1, h * 0.13).fill({ color: 0xffffff, alpha: 0.8 });
  },
};

/** Landscape: rect frame + triangle mountain + circle sun. */
const Photos: IconDef = {
  draw(g, cx, cy, size, color) {
    const h = size / 2;
    // Frame
    g.rect(cx - h, cy - h * 0.75, size, h * 1.5).fill(color);
    g.rect(cx - h, cy - h * 0.75, size, h * 1.5)
      .stroke({ color: 0xffffff, width: h * 0.08, alpha: 0.5 });
    // Mountain (filled triangle)
    g.poly([cx - h * 0.1, cy - h * 0.35, cx - h * 0.7, cy + h * 0.55, cx + h * 0.5, cy + h * 0.55])
      .fill({ color: 0xffffff, alpha: 0.6 });
    // Sun
    g.circle(cx + h * 0.5, cy - h * 0.35, h * 0.2).fill({ color: 0xffee88, alpha: 0.9 });
  },
};

/** Envelope: rect body + V-shape flap. */
const Mail: IconDef = {
  draw(g, cx, cy, size, color) {
    const h = size / 2;
    // Envelope body
    g.rect(cx - h, cy - h * 0.65, size, h * 1.3).fill(color);
    // Flap (V pointing down from top edge)
    g.poly([cx - h, cy - h * 0.65, cx, cy + h * 0.05, cx + h, cy - h * 0.65])
      .fill({ color: 0xffffff, alpha: 0.35 });
    // Flap border line
    g.moveTo(cx - h, cy - h * 0.65).lineTo(cx, cy + h * 0.05).lineTo(cx + h, cy - h * 0.65)
      .stroke({ color: 0xffffff, width: h * 0.08, alpha: 0.7 });
  },
};

/** Speech bubble: rounded rect + small triangle tail at bottom-left. */
const Chat: IconDef = {
  draw(g, cx, cy, size, color) {
    const h = size / 2;
    // Bubble body
    g.roundRect(cx - h, cy - h * 0.75, size, h * 1.3, h * 0.25).fill(color);
    // Tail triangle
    g.poly([cx - h * 0.55, cy + h * 0.55, cx - h * 0.2, cy + h * 0.55, cx - h * 0.55, cy + h])
      .fill(color);
    // Bubble dots (3 ellipses)
    g.circle(cx - h * 0.3, cy - h * 0.05, h * 0.1).fill({ color: 0xffffff, alpha: 0.8 });
    g.circle(cx, cy - h * 0.05, h * 0.1).fill({ color: 0xffffff, alpha: 0.8 });
    g.circle(cx + h * 0.3, cy - h * 0.05, h * 0.1).fill({ color: 0xffffff, alpha: 0.8 });
  },
};

/** Angle brackets: `< />` drawn as line segments. */
const Code: IconDef = {
  draw(g, cx, cy, size, color) {
    const h = size / 2;
    const tw = h * 0.08;
    // Left angle bracket <
    g.moveTo(cx - h * 0.25, cy - h * 0.5)
      .lineTo(cx - h * 0.65, cy)
      .lineTo(cx - h * 0.25, cy + h * 0.5)
      .stroke({ color, width: tw * 2 });
    // Right angle bracket >
    g.moveTo(cx + h * 0.25, cy - h * 0.5)
      .lineTo(cx + h * 0.65, cy)
      .lineTo(cx + h * 0.25, cy + h * 0.5)
      .stroke({ color, width: tw * 2 });
    // Slash /
    g.moveTo(cx + h * 0.05, cy - h * 0.45)
      .lineTo(cx - h * 0.05, cy + h * 0.45)
      .stroke({ color, width: tw * 1.5 });
  },
};

/** Trash can: rect body + narrow rect lid + 2 vertical lines inside. */
const Trash: IconDef = {
  draw(g, cx, cy, size, color) {
    const h = size / 2;
    // Lid
    g.rect(cx - h * 0.7, cy - h * 0.75, h * 1.4, h * 0.2).fill(color);
    // Handle on lid
    g.rect(cx - h * 0.25, cy - h * 0.95, h * 0.5, h * 0.22).fill(color);
    // Body
    g.rect(cx - h * 0.6, cy - h * 0.52, h * 1.2, h * 1.35).fill(color);
    // Vertical lines inside body
    g.rect(cx - h * 0.2, cy - h * 0.3, h * 0.1, h * 0.9).fill({ color: 0xffffff, alpha: 0.5 });
    g.rect(cx + h * 0.1, cy - h * 0.3, h * 0.1, h * 0.9).fill({ color: 0xffffff, alpha: 0.5 });
  },
};

/** Video: rect screen + play triangle inside. */
const Video: IconDef = {
  draw(g, cx, cy, size, color) {
    const h = size / 2;
    // Screen rect
    g.roundRect(cx - h, cy - h * 0.7, size, h * 1.4, h * 0.1).fill(color);
    // Play triangle
    g.poly([cx - h * 0.2, cy - h * 0.4, cx - h * 0.2, cy + h * 0.4, cx + h * 0.45, cy])
      .fill({ color: 0xffffff, alpha: 0.85 });
  },
};

/** Shopping bag: rect body + curved handle arc on top. */
const Shop: IconDef = {
  draw(g, cx, cy, size, color) {
    const h = size / 2;
    // Bag body
    g.rect(cx - h * 0.75, cy - h * 0.3, h * 1.5, h * 1.2).fill(color);
    // Handle arc
    g.arc(cx, cy - h * 0.3, h * 0.4, Math.PI, 0)
      .stroke({ color, width: h * 0.18 });
  },
};

/** Location pin: teardrop — filled circle top + pointed triangle bottom. */
const Maps: IconDef = {
  draw(g, cx, cy, size, color) {
    const h = size / 2;
    const pinR = h * 0.52;
    const tipY = cy + h * 0.85;
    // Drop body: circle + triangle merged as a poly
    g.circle(cx, cy - h * 0.1, pinR).fill(color);
    g.poly([cx - pinR * 0.85, cy - h * 0.1, cx + pinR * 0.85, cy - h * 0.1, cx, tipY])
      .fill(color);
    // Inner circle highlight
    g.circle(cx, cy - h * 0.1, pinR * 0.42).fill({ color: 0xffffff, alpha: 0.6 });
  },
};

/** Clock: circle face + hour and minute hands from centre. */
const Clock: IconDef = {
  draw(g, cx, cy, size, color) {
    const h = size / 2;
    // Face
    g.circle(cx, cy, h).fill(color);
    g.circle(cx, cy, h).stroke({ color: 0xffffff, width: h * 0.08, alpha: 0.5 });
    // Minute hand (long, pointing up-right)
    g.moveTo(cx, cy).lineTo(cx + h * 0.15, cy - h * 0.65)
      .stroke({ color: 0xffffff, width: h * 0.1 });
    // Hour hand (short, pointing right)
    g.moveTo(cx, cy).lineTo(cx + h * 0.45, cy + h * 0.2)
      .stroke({ color: 0xffffff, width: h * 0.13 });
    // Centre dot
    g.circle(cx, cy, h * 0.1).fill(0xffffff);
  },
};

/** Notepad: rect + dots at top (spiral) + horizontal content lines. */
const Notes: IconDef = {
  draw(g, cx, cy, size, color) {
    const h = size / 2;
    // Notepad body
    g.rect(cx - h * 0.75, cy - h * 0.85, h * 1.5, h * 1.7).fill(color);
    // Spiral dots along top
    for (let i = 0; i < 4; i++) {
      g.circle(cx - h * 0.45 + i * h * 0.3, cy - h * 0.85, h * 0.1)
        .fill({ color: 0xffffff, alpha: 0.7 });
    }
    // Content lines
    const lx = cx - h * 0.55;
    const lw = h * 1.1;
    g.rect(lx, cy - h * 0.4, lw, h * 0.1).fill({ color: 0xffffff, alpha: 0.6 });
    g.rect(lx, cy - h * 0.15, lw, h * 0.1).fill({ color: 0xffffff, alpha: 0.6 });
    g.rect(lx, cy + h * 0.1, lw, h * 0.1).fill({ color: 0xffffff, alpha: 0.6 });
    g.rect(lx, cy + h * 0.35, lw * 0.6, h * 0.1).fill({ color: 0xffffff, alpha: 0.6 });
  },
};

/** Cloud: three overlapping circles with a flat implied bottom. */
const Cloud: IconDef = {
  draw(g, cx, cy, size, color) {
    const h = size / 2;
    // Three bumps (left, centre-large, right)
    g.circle(cx - h * 0.38, cy + h * 0.05, h * 0.38).fill(color);
    g.circle(cx + h * 0.35, cy + h * 0.1, h * 0.32).fill(color);
    g.circle(cx, cy - h * 0.08, h * 0.5).fill(color);
    // Flat base rect to cap the bottom
    g.rect(cx - h * 0.72, cy + h * 0.08, h * 1.44, h * 0.5).fill(color);
  },
};

/** Bank/building: triangle roof + rect body + 3 column rects. */
const Bank: IconDef = {
  draw(g, cx, cy, size, color) {
    const h = size / 2;
    // Roof triangle
    g.poly([cx, cy - h * 0.9, cx - h * 0.85, cy - h * 0.25, cx + h * 0.85, cy - h * 0.25])
      .fill(color);
    // Body
    g.rect(cx - h * 0.75, cy - h * 0.25, h * 1.5, h * 1.1).fill(color);
    // Columns (3 vertical rects)
    const colW = h * 0.2;
    const colH = h * 0.8;
    const colY = cy - h * 0.15;
    g.rect(cx - h * 0.55, colY, colW, colH).fill({ color: 0xffffff, alpha: 0.35 });
    g.rect(cx - h * 0.1, colY, colW, colH).fill({ color: 0xffffff, alpha: 0.35 });
    g.rect(cx + h * 0.35, colY, colW, colH).fill({ color: 0xffffff, alpha: 0.35 });
    // Base bar
    g.rect(cx - h * 0.75, cy + h * 0.85, h * 1.5, h * 0.15).fill(color);
  },
};

/** Wi-Fi: dot + 3 concentric arcs above it. */
const Wifi: IconDef = {
  draw(g, cx, cy, size, color) {
    const h = size / 2;
    const sw = h * 0.13;
    // Bottom dot
    g.circle(cx, cy + h * 0.55, h * 0.13).fill(color);
    // Arc 1 (smallest, innermost)
    g.arc(cx, cy + h * 0.55, h * 0.32, -Math.PI * 0.75, -Math.PI * 0.25)
      .stroke({ color, width: sw });
    // Arc 2
    g.arc(cx, cy + h * 0.55, h * 0.6, -Math.PI * 0.75, -Math.PI * 0.25)
      .stroke({ color, width: sw });
    // Arc 3 (largest, outermost)
    g.arc(cx, cy + h * 0.55, h * 0.88, -Math.PI * 0.75, -Math.PI * 0.25)
      .stroke({ color, width: sw });
  },
};

// ---------------------------------------------------------------------------
// 10 Notification Icons
// ---------------------------------------------------------------------------

/** Small envelope — compact version of Mail. */
const email: IconDef = {
  draw(g, cx, cy, size, color) {
    const h = size / 2;
    g.rect(cx - h, cy - h * 0.65, size, h * 1.3).fill(color);
    g.poly([cx - h, cy - h * 0.65, cx, cy + h * 0.1, cx + h, cy - h * 0.65])
      .fill({ color: 0xffffff, alpha: 0.3 });
    g.moveTo(cx - h, cy - h * 0.65).lineTo(cx, cy + h * 0.1).lineTo(cx + h, cy - h * 0.65)
      .stroke({ color: 0xffffff, width: h * 0.1, alpha: 0.65 });
  },
};

/** Circular arrow with arrowhead — update/refresh. */
const update: IconDef = {
  draw(g, cx, cy, size, color) {
    const h = size / 2;
    const sw = h * 0.18;
    // Arc (about 270 degrees)
    g.arc(cx, cy, h * 0.75, -Math.PI * 0.6, Math.PI * 1.05)
      .stroke({ color, width: sw });
    // Arrowhead at the arc end
    const endAng = Math.PI * 1.05;
    const ex = cx + Math.cos(endAng) * h * 0.75;
    const ey = cy + Math.sin(endAng) * h * 0.75;
    g.poly([
      ex, ey,
      ex - h * 0.28, ey - h * 0.12,
      ex - h * 0.12, ey + h * 0.28,
    ]).fill(color);
  },
};

/** Calendar: rect + darker header bar + 2x3 grid dots. */
const calendar: IconDef = {
  draw(g, cx, cy, size, color) {
    const h = size / 2;
    // Body
    g.rect(cx - h, cy - h * 0.7, size, h * 1.6).fill(color);
    // Header bar
    g.rect(cx - h, cy - h * 0.7, size, h * 0.45).fill({ color: 0xffffff, alpha: 0.3 });
    // Grid dots (2 cols x 3 rows)
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        g.circle(cx - h * 0.45 + col * h * 0.45, cy + h * 0.05 + row * h * 0.38, h * 0.08)
          .fill({ color: 0xffffff, alpha: 0.75 });
      }
    }
  },
};

/** Battery: rect outline + nub + partial fill. */
const battery: IconDef = {
  draw(g, cx, cy, size, color) {
    const h = size / 2;
    // Outer shell
    g.rect(cx - h * 0.9, cy - h * 0.35, h * 1.6, h * 0.7).fill({ color, alpha: 0 });
    g.rect(cx - h * 0.9, cy - h * 0.35, h * 1.6, h * 0.7)
      .stroke({ color, width: h * 0.1 });
    // Nub on right end
    g.rect(cx + h * 0.7, cy - h * 0.18, h * 0.22, h * 0.36).fill(color);
    // Fill at ~60%
    g.rect(cx - h * 0.82, cy - h * 0.25, h * 0.9, h * 0.5).fill(color);
  },
};

/** Checkmark in a circle. */
const check: IconDef = {
  draw(g, cx, cy, size, color) {
    const h = size / 2;
    g.circle(cx, cy, h).fill(color);
    // V-check
    g.moveTo(cx - h * 0.45, cy)
      .lineTo(cx - h * 0.1, cy + h * 0.4)
      .lineTo(cx + h * 0.5, cy - h * 0.35)
      .stroke({ color: 0xffffff, width: h * 0.18 });
  },
};

/** Fork and knife: two parallel vertical lines with details. */
const food: IconDef = {
  draw(g, cx, cy, size, color) {
    const h = size / 2;
    // Knife (right) — straight rect
    g.rect(cx + h * 0.1, cy - h, h * 0.14, h * 2).fill(color);
    // Knife tip bevel
    g.poly([cx + h * 0.1, cy - h, cx + h * 0.24, cy - h, cx + h * 0.24, cy - h * 0.5])
      .fill({ color: 0xffffff, alpha: 0.4 });
    // Fork tines (3 thin rects)
    g.rect(cx - h * 0.5, cy - h, h * 0.1, h * 0.6).fill(color);
    g.rect(cx - h * 0.32, cy - h, h * 0.1, h * 0.6).fill(color);
    g.rect(cx - h * 0.14, cy - h, h * 0.1, h * 0.6).fill(color);
    // Fork handle
    g.rect(cx - h * 0.37, cy - h * 0.4, h * 0.5, h * 1.4).fill(color);
  },
};

/** Small chat bubble — compact version of Chat. */
const message: IconDef = {
  draw(g, cx, cy, size, color) {
    const h = size / 2;
    g.roundRect(cx - h, cy - h * 0.8, size, h * 1.35, h * 0.25).fill(color);
    // Tail
    g.poly([cx - h * 0.5, cy + h * 0.55, cx - h * 0.15, cy + h * 0.55, cx - h * 0.5, cy + h])
      .fill(color);
    // Two content lines
    g.rect(cx - h * 0.65, cy - h * 0.3, h * 1.1, h * 0.12).fill({ color: 0xffffff, alpha: 0.7 });
    g.rect(cx - h * 0.65, cy + h * 0.0, h * 0.7, h * 0.12).fill({ color: 0xffffff, alpha: 0.7 });
  },
};

/** Camera: rect body + circle lens + small rect viewfinder. */
const camera: IconDef = {
  draw(g, cx, cy, size, color) {
    const h = size / 2;
    // Body
    g.roundRect(cx - h, cy - h * 0.55, size, h * 1.1, h * 0.15).fill(color);
    // Viewfinder bump on top
    g.rect(cx - h * 0.25, cy - h * 0.75, h * 0.5, h * 0.22).fill(color);
    // Lens (outer ring + inner)
    g.circle(cx, cy + h * 0.05, h * 0.42).fill({ color: 0xffffff, alpha: 0.35 });
    g.circle(cx, cy + h * 0.05, h * 0.28).fill({ color: 0xffffff, alpha: 0.65 });
  },
};

/** Printer: wide rect body + paper sheet emerging from top. */
const printer: IconDef = {
  draw(g, cx, cy, size, color) {
    const h = size / 2;
    // Paper sheet coming out top
    g.rect(cx - h * 0.45, cy - h * 0.95, h * 0.9, h * 0.65).fill({ color: 0xffffff, alpha: 0.8 });
    // Printer body
    g.roundRect(cx - h, cy - h * 0.45, size, h * 1.0, h * 0.1).fill(color);
    // Paper slot line
    g.rect(cx - h * 0.5, cy - h * 0.35, h * 1.0, h * 0.12).fill({ color: 0xffffff, alpha: 0.4 });
    // Output tray
    g.rect(cx - h * 0.5, cy + h * 0.4, h, h * 0.2).fill({ color: 0xffffff, alpha: 0.25 });
  },
};

/** Signal bars: 3 vertical rects of increasing height. */
const signal: IconDef = {
  draw(g, cx, cy, size, color) {
    const h = size / 2;
    const barW = h * 0.28;
    const gap = h * 0.14;
    const baseY = cy + h * 0.7;
    // Bar 1 (short)
    g.rect(cx - h * 0.7, baseY - h * 0.55, barW, h * 0.55).fill(color);
    // Bar 2 (medium)
    g.rect(cx - h * 0.7 + barW + gap, baseY - h * 0.9, barW, h * 0.9).fill(color);
    // Bar 3 (tall)
    g.rect(cx - h * 0.7 + (barW + gap) * 2, baseY - h * 1.35, barW, h * 1.35).fill(color);
  },
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * 16 desktop icon definitions keyed by ICON_LABELS strings.
 * Fallback to 'Docs' for any unrecognised label.
 */
export const DESKTOP_ICONS: Record<string, IconDef> = {
  Docs,
  Music,
  Games,
  Photos,
  Mail,
  Chat,
  Code,
  Trash,
  Video,
  Shop,
  Maps,
  Clock,
  Notes,
  Cloud,
  Bank,
  Wifi,
};

/**
 * 10 notification icon definitions keyed by NOTIF_TEXTS icon keys.
 * Fallback to 'email' for any unrecognised key.
 */
export const NOTIFICATION_ICONS: Record<string, IconDef> = {
  email,
  update,
  calendar,
  battery,
  check,
  food,
  message,
  camera,
  printer,
  signal,
};
