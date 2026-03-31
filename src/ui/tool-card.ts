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

    // --- Top-down flow layout ---
    // Each element's y is derived from the element above it, not from h percentages.

    // 1. Title — anchored top-center at y=4
    const titleStyle = new TextStyle({ fontSize: 13, fill: 0x333333, fontFamily: 'sans-serif', fontWeight: 'bold' });
    const title = new Text({ text: stats.displayName, style: titleStyle });
    title.anchor.set(0.5, 0);
    title.position.set(w / 2, 4);
    this.container.addChild(title);

    // 2. Icon circle — radius capped at 16px so it doesn't balloon at large sizes
    const iconRadius = Math.min(16, Math.min(w, h) * 0.15);
    const iconCenterY = 4 + titleStyle.fontSize + 4 + iconRadius;
    const icon = new Graphics().circle(w / 2, iconCenterY, iconRadius).fill(stats.color);
    this.container.addChild(icon);

    // 3. Stats — three lines flowing from the icon bottom, 14px line height
    const STAT_LINE_HEIGHT = 14;
    const statStyle = new TextStyle({ fontSize: 10, fill: 0x444444, fontFamily: 'monospace' });
    const statsText = [
      `DMG: ${stats.damage}`,
      `AoE: ${stats.aoe}`,
      `Type: ${stats.type}`,
    ];
    const statsStartY = iconCenterY + iconRadius + 4;
    for (let i = 0; i < statsText.length; i++) {
      const t = new Text({ text: statsText[i], style: statStyle });
      t.position.set(8, statsStartY + i * STAT_LINE_HEIGHT);
      this.container.addChild(t);
    }

    // 4. Description — positioned below the last stats line, not anchored to h-20
    const descStartY = statsStartY + statsText.length * STAT_LINE_HEIGHT + 4;
    const descStyle = new TextStyle({ fontSize: 9, fill: 0x666666, fontFamily: 'sans-serif', fontStyle: 'italic' });
    const desc = new Text({ text: stats.description, style: descStyle });
    desc.position.set(8, descStartY);
    this.container.addChild(desc);
  }

  get displayContainer(): Container { return this.container; }
}
