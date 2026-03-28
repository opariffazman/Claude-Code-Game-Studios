/**
 * Tool Indicator — shows the current mouse tool name in the corner.
 * Updates when the tool cycles. Pulses briefly on change.
 */
import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { MouseToolType } from '../types';

const TOOL_COLORS: Record<MouseToolType, number> = {
  hammer: 0xff5500,
  laser: 0x44ff44,
  bomb: 0xff8800,
  freeze: 0x88ccff,
  magnet: 0xcc44ff,
};

const TOOL_LABELS: Record<MouseToolType, string> = {
  hammer: 'HAMMER',
  laser: 'LASER',
  bomb: 'BOMB',
  freeze: 'FREEZE',
  magnet: 'MAGNET',
};

export class ToolIndicator {
  private container: Container;
  private bg: Graphics;
  private label: Text;
  private pulseTimer = 0;

  constructor(parent: Container, screenW: number, screenH: number) {
    this.container = new Container();
    this.container.label = 'tool-indicator';

    // Background pill
    this.bg = new Graphics();
    this.container.addChild(this.bg);

    // Tool name text
    const style = new TextStyle({
      fontSize: 14,
      fill: 0xffffff,
      fontFamily: 'monospace',
      fontWeight: 'bold',
    });
    this.label = new Text({ text: 'HAMMER', style });
    this.label.anchor.set(0.5);
    this.container.addChild(this.label);

    // Position bottom-right, above taskbar
    this.container.position.set(screenW - 80, screenH - 70);
    this.container.alpha = 0.7;

    parent.addChild(this.container);
    this.drawForTool('hammer');
  }

  /** Update the indicator for a new tool. */
  setTool(tool: MouseToolType): void {
    this.drawForTool(tool);
    this.pulseTimer = 0.3; // Trigger pulse animation
  }

  /** Call each frame for pulse animation. */
  update(dt: number): void {
    if (this.pulseTimer > 0) {
      this.pulseTimer -= dt;
      const scale = 1 + Math.sin((0.3 - this.pulseTimer) / 0.3 * Math.PI) * 0.2;
      this.container.scale.set(scale);
      this.container.alpha = 0.9;
    } else {
      this.container.scale.set(1);
      this.container.alpha = 0.6;
    }
  }

  /** Reposition when the viewport is resized. */
  resize(screenW: number, screenH: number): void {
    this.container.position.set(screenW - 80, screenH - 70);
  }

  private drawForTool(tool: MouseToolType): void {
    const color = TOOL_COLORS[tool];
    this.bg.clear();
    this.bg
      .roundRect(-50, -16, 100, 32, 12)
      .fill({ color, alpha: 0.5 })
      .roundRect(-50, -16, 100, 32, 12)
      .stroke({ color: 0xffffff, width: 1.5, alpha: 0.4 });
    this.label.text = TOOL_LABELS[tool];
  }
}
