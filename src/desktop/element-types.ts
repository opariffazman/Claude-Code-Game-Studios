/**
 * Element type definitions — data pools and randomisation helpers for desktop elements.
 *
 * Implements: Desktop Renderer — procedural fake desktop (Desk Smasher design doc)
 *
 * All content pools (labels, titles, palettes, colours) live here so designers
 * can tune without touching factory or manager code. No PixiJS dependency —
 * this file is safe to import in unit tests without a browser environment.
 */
import type { ElementType, WallpaperPalette } from '../types';

// ---------------------------------------------------------------------------
// Content pools
// ---------------------------------------------------------------------------

/** 16 icon labels shown under desktop icons. */
export const ICON_LABELS: readonly string[] = [
  'Docs', 'Music', 'Games', 'Photos', 'Mail', 'Chat', 'Code', 'Trash',
  'Video', 'Shop', 'Maps', 'Clock', 'Notes', 'Cloud', 'Bank', 'Wifi',
];

/** 20 window title-bar strings. */
export const WINDOW_TITLES: readonly string[] = [
  'Cat Videos.mp4', 'homework_FINAL_v3.docx', 'definitely_not_virus.exe',
  'todo_list_2019.txt', 'meeting_notes.pptx', 'vacation_photos',
  'budget_DONT_OPEN.xlsx', 'my_novel_ch1.docx', 'moms_recipe.pdf',
  'game_highscores.txt', 'shopping_list.txt', 'funny_memes',
  'workout_plan.pdf', 'tax_returns_2024', 'secret_diary.txt',
  'baby_photos', 'playlist.m3u', 'grandmas_cookies.doc',
  'school_project.pptx', 'birthday_ideas.txt',
];

/** 15 sticky-note reminder texts. */
export const STICKY_TEXTS: readonly string[] = [
  'Buy milk!', 'Call Mom', 'Fix bug #42', 'Pizza tonight!', 'Feed the cat',
  'Water plants', 'Pick up kids', 'Dentist Tues', 'Clean desk LOL',
  'Gym maybe?', 'Netflix pw?', 'Birthday gift!!', 'Return package',
  'Walk the dog', 'Nap time!',
];

/** 10 notification messages with emoji icons. */
export interface NotifText {
  readonly text: string;
  readonly icon: string;
}
export const NOTIF_TEXTS: readonly NotifText[] = [
  { text: 'New email from Boss', icon: '📧' },
  { text: 'Update available!',   icon: '🔄' },
  { text: 'Meeting in 5 min',    icon: '📅' },
  { text: 'Low battery!',        icon: '🔋' },
  { text: 'Download complete',   icon: '✅' },
  { text: 'Reminder: Lunch',     icon: '🍕' },
  { text: 'New message!',        icon: '💬' },
  { text: 'Screenshot saved',    icon: '📸' },
  { text: 'Printer ready',       icon: '🖨️' },
  { text: 'WiFi connected',      icon: '📶' },
];

/** 8 wallpaper colour palettes (background + overlay). */
export const WALLPAPER_PALETTES: readonly WallpaperPalette[] = [
  { bg: 0x2b5797, overlay: 0x0a1628, name: 'Classic Blue'   },
  { bg: 0x1a6b3c, overlay: 0x0a2818, name: 'Forest Green'   },
  { bg: 0x7b2d8e, overlay: 0x2a1030, name: 'Purple'         },
  { bg: 0xcc5533, overlay: 0x401510, name: 'Sunset Orange'  },
  { bg: 0x2288aa, overlay: 0x0a2830, name: 'Teal'           },
  { bg: 0x444466, overlay: 0x1a1a2e, name: 'Dark Slate'     },
  { bg: 0xaa3366, overlay: 0x301020, name: 'Hot Pink'       },
  { bg: 0x336644, overlay: 0x102218, name: 'Emerald'        },
];

/** 12 icon fill colours. */
export const ICON_COLORS: readonly number[] = [
  0x4488ff, 0xff6644, 0x44cc44, 0xffaa00, 0xcc44cc, 0x44cccc,
  0xff4488, 0x88ff44, 0x6644ff, 0xff8844, 0x44ff88, 0xffdd00,
];

/** 8 window title-bar colours. */
export const TITLEBAR_COLORS: readonly number[] = [
  0x3366cc, 0xcc3333, 0x33aa33, 0x9944cc, 0xcc6633, 0x3399cc, 0xcc6699, 0x336644,
];

/** 6 sticky-note background colours. */
export const STICKY_COLORS: readonly number[] = [
  0xffff88, 0xff88cc, 0x88ffcc, 0x88ccff, 0xffcc88, 0xddffaa,
];

// ---------------------------------------------------------------------------
// Element type metadata (dimensions and label pools per type)
// ---------------------------------------------------------------------------

/** Static metadata the factory uses to size and label elements. */
export interface ElementTypeConfig {
  readonly type: ElementType;
  readonly width: number;
  readonly height: number;
  readonly labels: readonly string[];
}

/** Registry of element type configs keyed by ElementType. */
export const ELEMENT_TYPE_CONFIGS: Record<ElementType, ElementTypeConfig> = {
  icon: {
    type: 'icon',
    width: 64,
    height: 64,
    labels: ICON_LABELS,
  },
  window: {
    type: 'window',
    width: 280,
    height: 180,
    labels: WINDOW_TITLES,
  },
  taskbar: {
    type: 'taskbar',
    width: 0, // Spans full screen width; set by DesktopManager at runtime.
    height: 48,
    labels: ['Taskbar'],
  },
  sticky: {
    type: 'sticky',
    width: 100,
    height: 80,
    labels: STICKY_TEXTS,
  },
  notification: {
    type: 'notification',
    width: 220,
    height: 50,
    labels: NOTIF_TEXTS.map((n) => n.text),
  },
  widget: {
    type: 'widget',
    width: 160,
    height: 100,
    labels: ['Clock Widget', 'Weather Widget', 'Music Widget'],
  },
};

// ---------------------------------------------------------------------------
// Randomisation helpers
// ---------------------------------------------------------------------------

/** Returns a random float in [min, max). */
export function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Returns a random integer in [min, max] (inclusive). */
export function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

/** Picks a random element from an array. Asserts array is non-empty. */
export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Returns a new array with the elements shuffled (Fisher-Yates). */
export function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
