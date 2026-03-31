// PROTOTYPE - NOT FOR PRODUCTION
// Question: Is keyboard-mashing a fake desktop with destruction effects fun?
// Date: 2026-03-28

import { Container, Graphics, Text, TextStyle } from 'pixi.js';

export interface DesktopElement {
  container: Container;
  gfx: Graphics;
  type: 'icon' | 'window' | 'taskbar' | 'sticky' | 'notification' | 'widget';
  health: number;
  maxHealth: number;
  destroyed: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  vx: number;
  vy: number;
  rotSpeed: number;
}

// --- Data pools ---

const ICON_SIZE = 64;

const ICON_LABELS = [
  'Docs', 'Music', 'Games', 'Photos', 'Mail', 'Chat', 'Code', 'Trash',
  'Video', 'Shop', 'Maps', 'Clock', 'Notes', 'Cloud', 'Bank', 'Wifi',
];

const WINDOW_TITLES = [
  'Cat Videos.mp4', 'homework_FINAL_v3.docx', 'definitely_not_virus.exe',
  'todo_list_2019.txt', 'meeting_notes.pptx', 'vacation_photos',
  'budget_DONT_OPEN.xlsx', 'my_novel_ch1.docx', 'moms_recipe.pdf',
  'game_highscores.txt', 'shopping_list.txt', 'funny_memes',
  'workout_plan.pdf', 'tax_returns_2024', 'secret_diary.txt',
  'baby_photos', 'playlist.m3u', 'grandmas_cookies.doc',
  'school_project.pptx', 'birthday_ideas.txt',
];

const STICKY_TEXTS = [
  'Buy milk!', 'Call Mom', 'Fix bug #42', 'Pizza tonight!', 'Feed the cat',
  'Water plants', 'Pick up kids', 'Dentist Tues', 'Clean desk LOL',
  'Gym maybe?', 'Netflix pw?', 'Birthday gift!!', 'Return package',
  'Walk the dog', 'Nap time!',
];

const NOTIF_TEXTS = [
  { text: 'New email from Boss', icon: '📧' },
  { text: 'Update available!', icon: '🔄' },
  { text: 'Meeting in 5 min', icon: '📅' },
  { text: 'Low battery!', icon: '🔋' },
  { text: 'Download complete', icon: '✅' },
  { text: 'Reminder: Lunch', icon: '🍕' },
  { text: 'New message!', icon: '💬' },
  { text: 'Screenshot saved', icon: '📸' },
  { text: 'Printer ready', icon: '🖨️' },
  { text: 'WiFi connected', icon: '📶' },
];

const WALLPAPER_PALETTES = [
  { bg: 0x2b5797, overlay: 0x0a1628 }, // Classic blue
  { bg: 0x1a6b3c, overlay: 0x0a2818 }, // Forest green
  { bg: 0x7b2d8e, overlay: 0x2a1030 }, // Purple
  { bg: 0xcc5533, overlay: 0x401510 }, // Sunset orange
  { bg: 0x2288aa, overlay: 0x0a2830 }, // Teal
  { bg: 0x444466, overlay: 0x1a1a2e }, // Dark slate
  { bg: 0xaa3366, overlay: 0x301020 }, // Hot pink
  { bg: 0x336644, overlay: 0x102218 }, // Emerald
];

const ICON_COLORS = [
  0x4488ff, 0xff6644, 0x44cc44, 0xffaa00, 0xcc44cc, 0x44cccc,
  0xff4488, 0x88ff44, 0x6644ff, 0xff8844, 0x44ff88, 0xffdd00,
];

const TITLEBAR_COLORS = [
  0x3366cc, 0xcc3333, 0x33aa33, 0x9944cc, 0xcc6633, 0x3399cc, 0xcc6699, 0x336644,
];

const STICKY_COLORS = [
  0xffff88, 0xff88cc, 0x88ffcc, 0x88ccff, 0xffcc88, 0xddffaa,
];

// --- Helpers ---

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Draw a random generic inner symbol into a Graphics at (cx, cy)
const SYMBOL_TYPES = ['lines', 'circle', 'triangle', 'dotgrid', 'square', 'star'] as const;
type SymbolType = typeof SYMBOL_TYPES[number];

function drawGenericSymbol(g: Graphics, cx: number, cy: number, type: SymbolType): void {
  switch (type) {
    case 'lines':
      g.rect(cx - 12, cy - 8, 24, 4).fill(0xffffff)
       .rect(cx - 12, cy - 1, 24, 4).fill(0xffffff)
       .rect(cx - 12, cy + 6, 24, 4).fill(0xffffff);
      break;
    case 'circle':
      g.circle(cx, cy, 14).fill({ color: 0xffffff, alpha: 0.8 });
      break;
    case 'triangle':
      g.poly([cx, cy - 14, cx - 13, cy + 10, cx + 13, cy + 10]).fill(0xffffff);
      break;
    case 'dotgrid':
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          g.circle(cx - 8 + col * 8, cy - 8 + row * 8, 3).fill(0xffffff);
        }
      }
      break;
    case 'square':
      g.rect(cx - 11, cy - 11, 22, 22).fill(0xffffff);
      break;
    case 'star': {
      // 5-pointed star via polygon
      const pts: number[] = [];
      for (let p = 0; p < 10; p++) {
        const angle = (p * Math.PI) / 5 - Math.PI / 2;
        const r = p % 2 === 0 ? 14 : 6;
        pts.push(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
      }
      g.poly(pts).fill(0xffffff);
      break;
    }
  }
}

// --- DesktopRenderer ---

export class DesktopRenderer {
  private container: Container;
  elements: DesktopElement[] = [];
  private screenW: number;
  private screenH: number;
  wallpaperColor: number = 0x2b5797;

  constructor(parent: Container, screenW: number, screenH: number) {
    this.container = new Container();
    this.container.label = 'desktop';
    parent.addChild(this.container);
    this.screenW = screenW;
    this.screenH = screenH;
    this.buildDesktop();
  }

  resize(w: number, h: number): void {
    this.screenW = w;
    this.screenH = h;
    this.container.removeChildren();
    this.elements = [];
    this.buildDesktop();
  }

  private buildDesktop(): void {
    const palette = pick(WALLPAPER_PALETTES);
    this.buildWallpaper(palette);
    this.buildTaskbar();
    this.buildIcons(randInt(8, 14));
    this.buildWindows(randInt(4, 7));
    this.buildStickies(randInt(3, 6));
    this.buildNotifications(randInt(2, 4));
    this.buildWidgets(randInt(1, 3));
  }

  private buildWallpaper(palette: { bg: number; overlay: number }): void {
    this.wallpaperColor = palette.bg;
    const bg = new Graphics()
      .rect(-500, -500, this.screenW + 1000, this.screenH + 1000)
      .fill(palette.bg);
    this.container.addChild(bg);
  }

  private buildTaskbar(): void {
    const taskbarH = 48;
    const y = this.screenH - taskbarH;
    const c = new Container();
    c.label = 'taskbar';
    c.position.set(0, y);

    const bar = new Graphics()
      .rect(0, 0, this.screenW + 500, taskbarH + 200)
      .fill({ color: 0x1a1a2e, alpha: 0.9 });
    c.addChild(bar);

    const startBtn = new Graphics()
      .roundRect(4, 4, 40, 40, 6)
      .fill(0x3366cc);
    c.addChild(startBtn);

    const clockStyle = new TextStyle({ fontSize: 14, fill: 0xffffff, fontFamily: 'monospace' });
    const clock = new Text({ text: '12:00', style: clockStyle });
    clock.position.set(this.screenW - 60, 14);
    c.addChild(clock);

    this.container.addChild(c);
    this.elements.push({
      container: c, gfx: bar, type: 'taskbar',
      health: 8, maxHealth: 8, destroyed: false,
      x: 0, y, width: this.screenW, height: taskbarH, label: 'Taskbar',
      vx: 0, vy: 0, rotSpeed: 0,
    });
  }

  private buildIcons(count: number): void {
    const labels = shuffle(ICON_LABELS).slice(0, count);

    const cols = 2;
    const spacingX = Math.round(this.screenW * 0.06);
    const spacingY = Math.round(this.screenH * 0.12);
    const startX = Math.round(this.screenW * 0.02);
    const startY = Math.round(this.screenH * 0.04);

    labels.forEach((label, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const jitterX = rand(-15, 15);
      const jitterY = rand(-15, 15);
      const x = Math.round(startX + col * spacingX + jitterX);
      const y = Math.round(startY + row * spacingY + jitterY);
      const color = pick(ICON_COLORS);
      const symbolType = SYMBOL_TYPES[i % SYMBOL_TYPES.length];

      const c = new Container();
      c.label = `icon-${label}`;
      c.position.set(x, y);

      const iconGfx = new Graphics()
        .roundRect(0, 0, ICON_SIZE, ICON_SIZE, 10)
        .fill(color)
        .roundRect(0, 0, ICON_SIZE, ICON_SIZE, 10)
        .stroke({ color: 0xffffff, width: 2, alpha: 0.5 });
      c.addChild(iconGfx);

      const sym = new Graphics();
      sym.alpha = 0.8;
      drawGenericSymbol(sym, ICON_SIZE / 2, ICON_SIZE / 2, symbolType);
      c.addChild(sym);

      const labelStyle = new TextStyle({ fontSize: 11, fill: 0xffffff, fontFamily: 'sans-serif', align: 'center' });
      const labelTxt = new Text({ text: label, style: labelStyle });
      labelTxt.anchor.set(0.5, 0);
      labelTxt.position.set(ICON_SIZE / 2, ICON_SIZE + 4);
      c.addChild(labelTxt);

      this.container.addChild(c);
      this.elements.push({
        container: c, gfx: iconGfx, type: 'icon',
        health: 3, maxHealth: 3, destroyed: false,
        x, y, width: ICON_SIZE, height: ICON_SIZE, label,
        vx: 0, vy: 0, rotSpeed: 0,
      });
    });
  }

  private buildWindows(count: number): void {
    const titles = shuffle(WINDOW_TITLES).slice(0, count);

    titles.forEach((title, i) => {
      const w = Math.round(rand(0.15, 0.32) * this.screenW);
      const h = Math.round(rand(0.20, 0.40) * this.screenH);
      const x = Math.round(rand(0.18, 0.65) * this.screenW);
      const y = Math.round(rand(0.05, 0.55) * this.screenH);
      const titleColor = TITLEBAR_COLORS[i % TITLEBAR_COLORS.length];
      const titleBarH = 32;

      const c = new Container();
      c.label = `window-${title}`;
      c.position.set(x, y);

      const shadow = new Graphics()
        .roundRect(3, 3, w, h, 8)
        .fill({ color: 0x000000, alpha: 0.2 });
      c.addChild(shadow);

      const bodyColor = 0xf0f4ff;
      const body = new Graphics()
        .roundRect(0, 0, w, h, 8)
        .fill(bodyColor)
        .roundRect(0, 0, w, h, 8)
        .stroke({ color: 0xcccccc, width: 1 });
      c.addChild(body);

      const titleBar = new Graphics()
        .roundRect(0, 0, w, titleBarH, 8)
        .fill(titleColor)
        .rect(0, titleBarH - 8, w, 8)
        .fill(titleColor);
      c.addChild(titleBar);

      const titleStyle = new TextStyle({ fontSize: 13, fill: 0xffffff, fontFamily: 'sans-serif' });
      const titleText = new Text({ text: title, style: titleStyle });
      titleText.position.set(10, 7);
      c.addChild(titleText);

      const closeBtn = new Graphics()
        .circle(w - 18, titleBarH / 2, 8)
        .fill(0xff4444);
      c.addChild(closeBtn);

      const contentGfx = new Graphics();
      for (let line = 0; line < 6; line++) {
        const lineW = 60 + Math.random() * (w - 100);
        contentGfx.rect(15, titleBarH + 15 + line * 22, lineW, 10)
          .fill({ color: 0x000000, alpha: 0.15 });
      }
      c.addChild(contentGfx);

      this.container.addChild(c);
      this.elements.push({
        container: c, gfx: body, type: 'window',
        health: 5, maxHealth: 5, destroyed: false,
        x, y, width: w, height: h, label: title,
        vx: 0, vy: 0, rotSpeed: 0,
      });
    });
  }

  private buildStickies(count: number): void {
    const texts = shuffle(STICKY_TEXTS).slice(0, count);

    texts.forEach((text, i) => {
      const w = 100;
      const h = 80;
      const x = Math.round(rand(0.65, 0.88) * this.screenW);
      const y = Math.round(rand(0.05, 0.55) * this.screenH);
      const color = STICKY_COLORS[i % STICKY_COLORS.length];

      const c = new Container();
      c.label = `sticky-${text}`;
      c.position.set(x, y);
      c.rotation = rand(-0.1, 0.1);

      const bg = new Graphics()
        .rect(0, 0, w, h)
        .fill(color)
        .rect(0, 0, w, h)
        .stroke({ color: 0x000000, width: 1, alpha: 0.1 });
      c.addChild(bg);

      const fold = new Graphics()
        .poly([w - 15, 0, w, 0, w, 15])
        .fill({ color: 0x000000, alpha: 0.1 });
      c.addChild(fold);

      const textStyle = new TextStyle({ fontSize: 12, fill: 0x333333, fontFamily: 'sans-serif', wordWrap: true, wordWrapWidth: w - 16 });
      const txt = new Text({ text, style: textStyle });
      txt.position.set(8, 10);
      c.addChild(txt);

      this.container.addChild(c);
      this.elements.push({
        container: c, gfx: bg, type: 'sticky',
        health: 2, maxHealth: 2, destroyed: false,
        x, y, width: w, height: h, label: text,
        vx: 0, vy: 0, rotSpeed: 0,
      });
    });
  }

  private buildNotifications(count: number): void {
    const notifs = shuffle(NOTIF_TEXTS).slice(0, count);
    const w = 220;
    const h = 50;

    notifs.forEach((notif, i) => {
      const x = Math.round(this.screenW - w - 10);
      const y = Math.round(this.screenH * 0.08) + i * 55;

      const c = new Container();
      c.label = `notif-${notif.text}`;
      c.position.set(x, y);

      const bgColor = pick([0x4488ff, 0x44cc44, 0xff8844, 0xcc44cc]);
      const bg = new Graphics()
        .roundRect(0, 0, w, h, 12)
        .fill({ color: bgColor, alpha: 0.95 })
        .roundRect(0, 0, w, h, 12)
        .stroke({ color: 0xffffff, width: 1, alpha: 0.3 });
      c.addChild(bg);

      const iconStyle = new TextStyle({ fontSize: 20, fontFamily: 'sans-serif' });
      const iconTxt = new Text({ text: notif.icon, style: iconStyle });
      iconTxt.position.set(10, 12);
      c.addChild(iconTxt);

      const textStyle = new TextStyle({ fontSize: 12, fill: 0xffffff, fontFamily: 'sans-serif' });
      const txt = new Text({ text: notif.text, style: textStyle });
      txt.position.set(40, 16);
      c.addChild(txt);

      this.container.addChild(c);
      this.elements.push({
        container: c, gfx: bg, type: 'notification',
        health: 2, maxHealth: 2, destroyed: false,
        x, y, width: w, height: h, label: notif.text,
        vx: 0, vy: 0, rotSpeed: 0,
      });
    });
  }

  private buildWidgets(count: number): void {
    type WidgetBuilder = () => void;
    const builders: WidgetBuilder[] = [
      () => this.buildClockWidget(),
      () => this.buildWeatherWidget(),
      () => this.buildMusicWidget(),
    ];
    const chosen = shuffle(builders).slice(0, count);
    chosen.forEach(b => b());
  }

  private buildClockWidget(): void {
    const w = 120;
    const h = 120;
    const x = Math.round(rand(0.55, 0.80) * this.screenW);
    const y = Math.round(rand(0.60, 0.85) * this.screenH);

    const c = new Container();
    c.label = 'widget-clock';
    c.position.set(x, y);

    const cx = w / 2;
    const cy = h / 2;

    const bg = new Graphics()
      .circle(cx, cy, w / 2)
      .fill({ color: 0x222244, alpha: 0.85 })
      .circle(cx, cy, w / 2)
      .stroke({ color: 0x4466aa, width: 2 });
    c.addChild(bg);

    const hands = new Graphics();
    hands.moveTo(cx, cy).lineTo(cx + 15, cy - 25).stroke({ color: 0xffffff, width: 3 });
    hands.moveTo(cx, cy).lineTo(cx - 10, cy - 35).stroke({ color: 0xffffff, width: 2 });
    hands.circle(cx, cy, 4).fill(0xff4444);
    c.addChild(hands);

    const twelveStyle = new TextStyle({ fontSize: 14, fill: 0xffffff, fontFamily: 'monospace' });
    const twelve = new Text({ text: '12', style: twelveStyle });
    twelve.anchor.set(0.5);
    twelve.position.set(cx, 10);
    c.addChild(twelve);

    this.container.addChild(c);
    this.elements.push({
      container: c, gfx: bg, type: 'widget',
      health: 4, maxHealth: 4, destroyed: false,
      x, y, width: w, height: h, label: 'Clock Widget',
      vx: 0, vy: 0, rotSpeed: 0,
    });
  }

  private buildWeatherWidget(): void {
    const w = 140;
    const h = 60;
    const x = Math.round(rand(0.55, 0.80) * this.screenW);
    const y = Math.round(rand(0.60, 0.85) * this.screenH);

    const c = new Container();
    c.label = 'widget-weather';
    c.position.set(x, y);

    const bg = new Graphics()
      .roundRect(0, 0, w, h, 14)
      .fill({ color: 0x2288cc, alpha: 0.85 })
      .roundRect(0, 0, w, h, 14)
      .stroke({ color: 0x44aaff, width: 1 });
    c.addChild(bg);

    const sun = new Graphics()
      .circle(25, 30, 14)
      .fill(0xffcc00);
    c.addChild(sun);

    const tempStyle = new TextStyle({ fontSize: 22, fill: 0xffffff, fontFamily: 'sans-serif', fontWeight: 'bold' });
    const temp = new Text({ text: '72°F', style: tempStyle });
    temp.position.set(50, 8);
    c.addChild(temp);

    const descStyle = new TextStyle({ fontSize: 11, fill: 0xccddff, fontFamily: 'sans-serif' });
    const desc = new Text({ text: 'Sunny', style: descStyle });
    desc.position.set(50, 36);
    c.addChild(desc);

    this.container.addChild(c);
    this.elements.push({
      container: c, gfx: bg, type: 'widget',
      health: 3, maxHealth: 3, destroyed: false,
      x, y, width: w, height: h, label: 'Weather Widget',
      vx: 0, vy: 0, rotSpeed: 0,
    });
  }

  private buildMusicWidget(): void {
    const w = 160;
    const h = 55;
    const x = Math.round(rand(0.55, 0.80) * this.screenW);
    const y = Math.round(rand(0.60, 0.85) * this.screenH);

    const c = new Container();
    c.label = 'widget-music';
    c.position.set(x, y);

    const bg = new Graphics()
      .roundRect(0, 0, w, h, 10)
      .fill({ color: 0x332255, alpha: 0.90 })
      .roundRect(0, 0, w, h, 10)
      .stroke({ color: 0xaa66ff, width: 1 });
    c.addChild(bg);

    // Play button triangle
    const playBtn = new Graphics()
      .poly([14, 14, 14, 40, 36, 27])
      .fill(0xaa66ff);
    c.addChild(playBtn);

    const trackStyle = new TextStyle({ fontSize: 11, fill: 0xffffff, fontFamily: 'sans-serif' });
    const track = new Text({ text: 'Lo-fi Beats', style: trackStyle });
    track.position.set(44, 10);
    c.addChild(track);

    // Progress bar
    const barBg = new Graphics()
      .rect(44, 30, w - 54, 6)
      .fill({ color: 0xffffff, alpha: 0.2 });
    c.addChild(barBg);

    const progress = new Graphics()
      .rect(44, 30, Math.round((w - 54) * rand(0.1, 0.9)), 6)
      .fill(0xaa66ff);
    c.addChild(progress);

    this.container.addChild(c);
    this.elements.push({
      container: c, gfx: bg, type: 'widget',
      health: 3, maxHealth: 3, destroyed: false,
      x, y, width: w, height: h, label: 'Music Widget',
      vx: 0, vy: 0, rotSpeed: 0,
    });
  }

  update(dt: number, speedMultiplier: number = 1): void {
    const FRICTION = 0.92; // Velocity decays each frame
    const MIN_VELOCITY = 0.5; // Below this, snap to zero

    for (const el of this.elements) {
      if (el.destroyed) continue;
      if (el.type === 'taskbar') continue;

      // Skip if not moving
      if (Math.abs(el.vx) < MIN_VELOCITY && Math.abs(el.vy) < MIN_VELOCITY) {
        el.vx = 0;
        el.vy = 0;
        continue;
      }

      // Apply velocity with friction
      el.container.x += el.vx * dt * speedMultiplier;
      el.container.y += el.vy * dt * speedMultiplier;
      el.container.rotation += el.rotSpeed * dt;

      // Friction decay
      el.vx *= FRICTION;
      el.vy *= FRICTION;
      el.rotSpeed *= FRICTION;

      // Update stored position
      el.x = el.container.x;
      el.y = el.container.y;

      // Bounce off edges
      if (el.x < 0) { el.x = 0; el.container.x = 0; el.vx *= -0.7; }
      if (el.x + el.width > this.screenW) { el.x = this.screenW - el.width; el.container.x = el.x; el.vx *= -0.7; }
      if (el.y < 0) { el.y = 0; el.container.y = 0; el.vy *= -0.7; }
      if (el.y + el.height > this.screenH - 48) { el.y = this.screenH - 48 - el.height; el.container.y = el.y; el.vy *= -0.7; }
    }
  }

  /** Apply a velocity impulse to an element (called when hit) */
  applyImpulse(el: DesktopElement, strength: number = 1): void {
    const angle = Math.random() * Math.PI * 2;
    const force = (80 + Math.random() * 120) * strength;
    el.vx += Math.cos(angle) * force;
    el.vy += Math.sin(angle) * force;
    el.rotSpeed += (Math.random() - 0.5) * 2 * strength;
  }

  /** Find the topmost alive element containing the point */
  getElementAt(x: number, y: number): DesktopElement | null {
    for (let i = this.elements.length - 1; i >= 0; i--) {
      const el = this.elements[i];
      if (el.destroyed) continue;
      if (x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height) {
        return el;
      }
    }
    return null;
  }

  /** Get a random alive element */
  getRandomAlive(): DesktopElement | null {
    const alive = this.elements.filter(e => !e.destroyed);
    if (alive.length === 0) return null;
    return alive[Math.floor(Math.random() * alive.length)];
  }

  /** Add a damage mark on the wallpaper at the given position — random style each time */
  crackWallpaper(x: number, y: number): void {
    const damageType = Math.floor(Math.random() * 6);
    const mark = new Graphics();
    mark.position.set(x, y);

    switch (damageType) {
      case 0: {
        // CRACKS: Spider-web fracture lines
        const numLines = 3 + Math.floor(Math.random() * 4);
        for (let i = 0; i < numLines; i++) {
          const angle = Math.random() * Math.PI * 2;
          const len = 20 + Math.random() * 50;
          const midX = Math.cos(angle) * len * 0.4 + (Math.random() - 0.5) * 12;
          const midY = Math.sin(angle) * len * 0.4 + (Math.random() - 0.5) * 12;
          mark.moveTo(0, 0).lineTo(midX, midY)
            .lineTo(Math.cos(angle) * len, Math.sin(angle) * len)
            .stroke({ color: 0x000000, width: 1.5 + Math.random() * 1.5, alpha: 0.35 + Math.random() * 0.15 });
        }
        break;
      }
      case 1: {
        // BURN MARK: Dark circle with scorched edges
        const radius = 15 + Math.random() * 25;
        mark.circle(0, 0, radius).fill({ color: 0x1a0a00, alpha: 0.5 });
        mark.circle(0, 0, radius * 0.6).fill({ color: 0x000000, alpha: 0.4 });
        // Scorched ring
        mark.circle(0, 0, radius * 1.1).stroke({ color: 0x332200, width: 3, alpha: 0.3 });
        // Small orange embers around edge
        for (let i = 0; i < 5; i++) {
          const a = Math.random() * Math.PI * 2;
          const r = radius * (0.7 + Math.random() * 0.4);
          mark.circle(Math.cos(a) * r, Math.sin(a) * r, 2 + Math.random() * 2)
            .fill({ color: 0xff6600, alpha: 0.4 + Math.random() * 0.3 });
        }
        break;
      }
      case 2: {
        // DENT/CRATER: Concentric rings suggesting depth
        const size = 12 + Math.random() * 20;
        mark.circle(0, 0, size).fill({ color: 0x000000, alpha: 0.15 });
        mark.circle(0, 0, size * 0.7).fill({ color: 0x000000, alpha: 0.12 });
        mark.circle(0, 0, size * 0.4).fill({ color: 0x000000, alpha: 0.1 });
        // Highlight on one edge (light source effect)
        mark.circle(size * -0.2, size * -0.2, size * 0.3)
          .fill({ color: 0xffffff, alpha: 0.08 });
        break;
      }
      case 3: {
        // PAINT SPLAT: Colorful splash mark
        const colors = [0xff4444, 0x44aaff, 0xffcc00, 0xff69b4, 0x44ff44, 0xff8800, 0xaa44ff];
        const splatColor = colors[Math.floor(Math.random() * colors.length)];
        // Main blob
        const blobR = 12 + Math.random() * 18;
        mark.circle(0, 0, blobR).fill({ color: splatColor, alpha: 0.7 });
        // Smaller satellite blobs
        for (let i = 0; i < 4 + Math.floor(Math.random() * 4); i++) {
          const a = Math.random() * Math.PI * 2;
          const dist = blobR * (0.8 + Math.random() * 1.2);
          const r = 3 + Math.random() * 6;
          mark.circle(Math.cos(a) * dist, Math.sin(a) * dist, r)
            .fill({ color: splatColor, alpha: 0.5 + Math.random() * 0.3 });
        }
        break;
      }
      case 4: {
        // PIXEL CORRUPTION: Grid of small squares like digital glitch
        const cellSize = 5 + Math.random() * 3;
        const spread = 3 + Math.floor(Math.random() * 3);
        for (let gx = -spread; gx <= spread; gx++) {
          for (let gy = -spread; gy <= spread; gy++) {
            if (Math.random() > 0.5) continue; // Sparse fill
            const brightness = Math.random();
            const color = brightness > 0.5 ? 0xffffff : 0x000000;
            mark.rect(gx * cellSize, gy * cellSize, cellSize - 1, cellSize - 1)
              .fill({ color, alpha: 0.15 + Math.random() * 0.2 });
          }
        }
        break;
      }
      case 5: {
        // SCRATCH MARKS: Diagonal claw/scratch lines
        const numScratches = 3 + Math.floor(Math.random() * 2);
        const angle = -0.3 + Math.random() * 0.6; // Roughly diagonal
        for (let i = 0; i < numScratches; i++) {
          const offsetX = (i - numScratches / 2) * (6 + Math.random() * 3);
          const len = 30 + Math.random() * 40;
          const startX = offsetX - Math.cos(angle) * len / 2;
          const startY = -Math.sin(angle) * len / 2;
          const endX = offsetX + Math.cos(angle) * len / 2;
          const endY = Math.sin(angle) * len / 2;
          mark.moveTo(startX, startY).lineTo(endX, endY)
            .stroke({ color: 0x000000, width: 1.5 + Math.random(), alpha: 0.3 + Math.random() * 0.15 });
        }
        break;
      }
    }

    // Insert above wallpaper (index 0) but below desktop elements
    if (this.container.children.length > 1) {
      this.container.addChildAt(mark, 1);
    } else {
      this.container.addChild(mark);
    }
  }

  /** Destruction progress 0-1 */
  get destructionProgress(): number {
    const totalHealth = this.elements.reduce((sum, e) => sum + e.maxHealth, 0);
    const currentHealth = this.elements.reduce((sum, e) => sum + e.health, 0);
    return 1 - currentHealth / totalHealth;
  }

  get allDestroyed(): boolean {
    return this.elements.every(e => e.destroyed);
  }

  /** Tear down and rebuild a fresh desktop */
  reset(): void {
    this.container.removeChildren();
    this.elements = [];
    this.buildDesktop();
  }
}
