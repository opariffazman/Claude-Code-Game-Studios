// PROTOTYPE - NOT FOR PRODUCTION
// Question: Is keyboard-mashing a fake desktop with destruction effects fun?
// Date: 2026-03-28

import { Container } from 'pixi.js';

export class ScreenShake {
  private intensity = 0;
  private readonly decay = 0.9;
  private readonly maxIntensity = 15;

  trigger(amount: number): void {
    this.intensity = Math.min(this.maxIntensity, this.intensity + amount);
  }

  update(container: Container): void {
    if (this.intensity < 0.5) {
      container.x = 0;
      container.y = 0;
      this.intensity = 0;
      return;
    }
    container.x = (Math.random() - 0.5) * this.intensity * 2;
    container.y = (Math.random() - 0.5) * this.intensity * 2;
    this.intensity *= this.decay;
  }
}
