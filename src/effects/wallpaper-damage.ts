/**
 * WallpaperDamage — 6 background damage types that accumulate on the
 * wallpaper as chaos increases. Each draw function creates a temporary
 * Graphics object, adds it to the provided Container, and leaves it in
 * place (persistent accumulation is the intended behaviour).
 *
 * All draw calls use the PixiJS v8 chained Graphics API:
 *   new Graphics().rect().fill() / .circle().fill() / .moveTo().lineTo().stroke()
 *
 * Performance budget: each call adds one Graphics child to the wallpaper
 * Container. Caller is responsible for capping total accumulated marks.
 */
import { Graphics } from 'pixi.js';
import type { Container } from 'pixi.js';
import type { WallpaperDamageType } from '../types';

/**
 * Draw a crack mark at (x, y) on the wallpaper Container.
 * Renders 5–7 jagged line segments radiating from the impact point.
 */
function drawCrack(x: number, y: number, container: Container): void {
  const g = new Graphics();
  const numLines = 5 + Math.floor(Math.random() * 3);
  for (let i = 0; i < numLines; i++) {
    const angle = (Math.PI * 2 * i) / numLines + (Math.random() - 0.5) * 0.4;
    const len = 20 + Math.random() * 30;
    const midX = x + Math.cos(angle) * len * 0.4 + (Math.random() - 0.5) * 6;
    const midY = y + Math.sin(angle) * len * 0.4 + (Math.random() - 0.5) * 6;
    const endX = x + Math.cos(angle) * len;
    const endY = y + Math.sin(angle) * len;
    g.moveTo(x, y)
      .lineTo(midX, midY)
      .lineTo(endX, endY)
      .stroke({ color: 0x222222, width: 1, alpha: 0.7 });
  }
  container.addChild(g);
}

/**
 * Draw a burn scorch mark at (x, y) on the wallpaper Container.
 * Renders a dark ellipse with a semi-transparent orange inner glow.
 */
function drawBurn(x: number, y: number, container: Container): void {
  const g = new Graphics();
  const rx = 18 + Math.random() * 14;
  const ry = 12 + Math.random() * 10;
  // Outer char ring
  g.ellipse(x, y, rx, ry).fill({ color: 0x1a0a00, alpha: 0.85 });
  // Inner ember glow
  g.ellipse(x, y, rx * 0.5, ry * 0.5).fill({ color: 0xff6600, alpha: 0.3 });
  container.addChild(g);
}

/**
 * Draw a dent mark at (x, y) on the wallpaper Container.
 * Renders a dark concave oval with a highlight arc suggesting depth.
 */
function drawDent(x: number, y: number, container: Container): void {
  const g = new Graphics();
  const r = 10 + Math.random() * 10;
  // Shadow bowl
  g.ellipse(x, y, r, r * 0.6).fill({ color: 0x000000, alpha: 0.4 });
  // Highlight edge — small arc offset upward
  g.ellipse(x, y - r * 0.2, r * 0.7, r * 0.25).fill({ color: 0xffffff, alpha: 0.15 });
  container.addChild(g);
}

/**
 * Draw a splat mark at (x, y) on the wallpaper Container.
 * Renders an irregular blob with scattered droplet satellites.
 */
function drawSplat(x: number, y: number, container: Container): void {
  const g = new Graphics();
  const color = 0x1a3300 + Math.floor(Math.random() * 0x003300); // Dark green-grey range
  // Main blob
  const blobR = 14 + Math.random() * 10;
  g.circle(x, y, blobR).fill({ color, alpha: 0.75 });
  // Satellite droplets
  const drops = 4 + Math.floor(Math.random() * 5);
  for (let i = 0; i < drops; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = blobR * (0.8 + Math.random() * 1.2);
    const dr = 2 + Math.random() * 5;
    g.circle(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist, dr).fill({
      color,
      alpha: 0.55,
    });
  }
  container.addChild(g);
}

/**
 * Draw a pixel-corruption mark at (x, y) on the wallpaper Container.
 * Renders a 3×3 grid of randomly coloured small squares simulating
 * a display glitch or bitrot artefact.
 */
function drawPixel(x: number, y: number, container: Container): void {
  const g = new Graphics();
  const size = 6;
  const cols = 3 + Math.floor(Math.random() * 3);
  const rows = 3 + Math.floor(Math.random() * 3);
  const startX = x - (cols * size) / 2;
  const startY = y - (rows * size) / 2;
  const palette = [0xff00ff, 0x00ffff, 0xffff00, 0xff0000, 0x00ff00, 0x0000ff];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (Math.random() > 0.4) {
        const color = palette[Math.floor(Math.random() * palette.length)];
        g.rect(startX + col * size, startY + row * size, size - 1, size - 1).fill({
          color,
          alpha: 0.6 + Math.random() * 0.4,
        });
      }
    }
  }
  container.addChild(g);
}

/**
 * Draw a scratch mark at (x, y) on the wallpaper Container.
 * Renders 2–4 fine parallel diagonal lines simulating surface scratches.
 */
function drawScratch(x: number, y: number, container: Container): void {
  const g = new Graphics();
  const numScratches = 2 + Math.floor(Math.random() * 3);
  const baseAngle = Math.random() * Math.PI; // Random dominant direction
  for (let i = 0; i < numScratches; i++) {
    const angle = baseAngle + (Math.random() - 0.5) * 0.15;
    const len = 25 + Math.random() * 40;
    const offset = (i - numScratches / 2) * 3 + (Math.random() - 0.5) * 2;
    const perpX = Math.cos(baseAngle + Math.PI / 2) * offset;
    const perpY = Math.sin(baseAngle + Math.PI / 2) * offset;
    const sx = x + perpX - Math.cos(angle) * len * 0.5;
    const sy = y + perpY - Math.sin(angle) * len * 0.5;
    const ex = x + perpX + Math.cos(angle) * len * 0.5;
    const ey = y + perpY + Math.sin(angle) * len * 0.5;
    g.moveTo(sx, sy)
      .lineTo(ex, ey)
      .stroke({ color: 0xffffff, width: 0.5 + Math.random() * 0.5, alpha: 0.35 });
  }
  container.addChild(g);
}

/** Dispatch table mapping WallpaperDamageType to its draw function. */
const WALLPAPER_DRAW_FNS: Record<
  WallpaperDamageType,
  (x: number, y: number, container: Container) => void
> = {
  crack: drawCrack,
  burn: drawBurn,
  dent: drawDent,
  splat: drawSplat,
  pixel: drawPixel,
  scratch: drawScratch,
};

/**
 * Apply a wallpaper damage mark of the given type at world position (x, y).
 * Adds a persistent Graphics child to the Container — marks accumulate.
 *
 * If an unknown damage type is passed, the call is silently skipped.
 *
 * @param type - Which damage visual to render.
 * @param x - World X position of the impact.
 * @param y - World Y position of the impact.
 * @param container - The PixiJS Container representing the wallpaper layer.
 */
export function applyWallpaperDamage(
  type: WallpaperDamageType,
  x: number,
  y: number,
  container: Container,
): void {
  const drawFn = WALLPAPER_DRAW_FNS[type];
  if (!drawFn) return;
  drawFn(x, y, container);
}
