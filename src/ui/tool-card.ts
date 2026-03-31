/**
 * Tool Card — displays current equipped tool with icon and stats.
 */
import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { TOOL_STATS } from '../mouse/tool-stats';
import type { MouseToolType } from '../types';

export class ToolCard {
  private container: Container;
  private _currentTool: MouseToolType = 'hammer';

  constructor() {
    this.container = new Container();
    this.container.label = 'tool-card-content';
  }

  build(parent: Container, x: number, y: number, w: number, h: number): void {
    this.container.position.set(x, y);
    parent.addChild(this.container);
    this._render(w, h);
  }

  /** Update when tool changes */
  setTool(tool: MouseToolType, w: number, h: number): void {
    this._currentTool = tool;
    this._render(w, h);
  }

  private _render(w: number, h: number): void {
    this.container.removeChildren();
    const stats = TOOL_STATS[this._currentTool];
    if (!stats) return;

    // Tool name (title)
    const titleStyle = new TextStyle({ fontSize: 14, fill: 0xffffff, fontFamily: 'sans-serif', fontWeight: 'bold' });
    const title = new Text({ text: stats.displayName, style: titleStyle });
    title.anchor.set(0.5, 0);
    title.position.set(w / 2, 8);
    this.container.addChild(title);

    // Tool icon (colored circle as placeholder)
    const icon = new Graphics().circle(w / 2, h * 0.4, Math.min(w, h) * 0.15).fill(stats.color);
    this.container.addChild(icon);

    // Stats
    const statStyle = new TextStyle({ fontSize: 10, fill: 0xcccccc, fontFamily: 'monospace' });
    const statsText = [
      `DMG: ${stats.damage}`,
      `AoE: ${stats.aoe}`,
      `Type: ${stats.type}`,
    ];
    const startY = h * 0.6;
    for (let i = 0; i < statsText.length; i++) {
      const t = new Text({ text: statsText[i], style: statStyle });
      t.position.set(8, startY + i * 16);
      this.container.addChild(t);
    }

    // Description
    const descStyle = new TextStyle({ fontSize: 9, fill: 0x999999, fontFamily: 'sans-serif', fontStyle: 'italic' });
    const desc = new Text({ text: stats.description, style: descStyle });
    desc.position.set(8, h - 20);
    this.container.addChild(desc);
  }

  get displayContainer(): Container { return this.container; }
}
