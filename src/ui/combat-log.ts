/**
 * Combat Log — live scrolling log of hits inside a window panel.
 * Green = damage, Red = destroyed, Yellow = wallpaper hit.
 */
import { Container, Text, TextStyle, Graphics } from 'pixi.js';

const MAX_ENTRIES = 8;
const COLORS = {
  damage: 0x44dd44,
  destroyed: 0xdd4444,
  wallpaper: 0xddcc44,
};

export class CombatLog {
  private container: Container;
  private entries: Text[] = [];
  private _entryData: string[] = [];

  constructor() {
    this.container = new Container();
    this.container.label = 'combat-log-content';
  }

  /** Build the log display inside a parent container at given bounds */
  build(parent: Container, x: number, y: number, w: number, h: number): void {
    this.container.position.set(x, y);
    parent.addChild(this.container);
    // Mask to clip overflow
    const mask = new Graphics().rect(0, 0, w, h).fill(0xffffff);
    this.container.addChild(mask);
    this.container.mask = mask;
  }

  /** Add a new log entry */
  addEntry(toolName: string, targetName: string, type: 'damage' | 'destroyed' | 'wallpaper'): void {
    const color = COLORS[type];
    const prefix = type === 'destroyed' ? 'DESTROYED' : type === 'wallpaper' ? 'CRACKED' : 'HIT';
    const text = `${toolName} ${prefix} ${targetName}`;

    this._entryData.push(text);
    if (this._entryData.length > MAX_ENTRIES) {
      this._entryData.shift();
    }

    // Rebuild text display
    this._rebuild(color);
  }

  private _rebuild(latestColor: number): void {
    // Remove old texts
    for (const t of this.entries) t.destroy();
    this.entries = [];

    const lineH = 16;
    for (let i = 0; i < this._entryData.length; i++) {
      const isLatest = i === this._entryData.length - 1;
      const style = new TextStyle({
        fontSize: 11,
        fill: isLatest ? latestColor : 0xaaaaaa,
        fontFamily: 'monospace',
      });
      const t = new Text({ text: this._entryData[i], style });
      t.position.set(4, i * lineH);
      this.container.addChild(t);
      this.entries.push(t);
    }
  }

  get displayContainer(): Container { return this.container; }
}
