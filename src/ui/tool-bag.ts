/**
 * Tool Bag — 1x5 hotbar showing all tools, current highlighted.
 */
import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { TOOL_STATS } from '../mouse/tool-stats';
import type { MouseToolType } from '../types';

const TOOLS: MouseToolType[] = ['hammer', 'laser', 'bomb', 'freeze', 'magnet'];

export class ToolBag {
  private container: Container;
  private _currentTool: MouseToolType = 'hammer';

  constructor() {
    this.container = new Container();
    this.container.label = 'tool-bag-content';
  }

  build(parent: Container, x: number, y: number, w: number, h: number): void {
    this.container.position.set(x, y);
    parent.addChild(this.container);
    this._render(w, h);
  }

  setTool(tool: MouseToolType, w: number, h: number): void {
    this._currentTool = tool;
    this._render(w, h);
  }

  private _render(w: number, h: number): void {
    this.container.removeChildren();

    const cellW = w / TOOLS.length;
    const cellH = h;
    const iconR = Math.min(cellW, cellH) * 0.2;

    for (let i = 0; i < TOOLS.length; i++) {
      const tool = TOOLS[i];
      const stats = TOOL_STATS[tool];
      if (!stats) continue;

      const isActive = tool === this._currentTool;
      const cx = i * cellW + cellW / 2;
      const cy = cellH * 0.4;

      // Cell background
      if (isActive) {
        const highlight = new Graphics()
          .roundRect(i * cellW + 2, 2, cellW - 4, cellH - 4, 4)
          .fill({ color: 0xffcc00, alpha: 0.2 })
          .roundRect(i * cellW + 2, 2, cellW - 4, cellH - 4, 4)
          .stroke({ color: 0xffcc00, width: 2 });
        this.container.addChild(highlight);
      }

      // Tool icon (colored circle)
      const icon = new Graphics().circle(cx, cy, iconR).fill(stats.color);
      icon.alpha = isActive ? 1 : 0.5;
      this.container.addChild(icon);

      // Tool name
      const nameStyle = new TextStyle({
        fontSize: 8,
        fill: isActive ? 0xffffff : 0x888888,
        fontFamily: 'sans-serif',
        align: 'center',
      });
      const name = new Text({ text: stats.displayName, style: nameStyle });
      name.anchor.set(0.5, 0);
      name.position.set(cx, cellH * 0.65);
      this.container.addChild(name);
    }
  }

  get displayContainer(): Container { return this.container; }
}
