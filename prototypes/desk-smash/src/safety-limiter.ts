// PROTOTYPE - NOT FOR PRODUCTION
// Question: Is keyboard-mashing a fake desktop with destruction effects fun?
// Date: 2026-03-28

const MAX_FLASHES_PER_SECOND = 3;
const MAX_VOLUME = 0.7;
const WINDOW_MS = 1000;

export class SafetyLimiter {
  private flashTimestamps: number[] = [];

  canFlash(): boolean {
    const now = performance.now();
    this.flashTimestamps = this.flashTimestamps.filter(t => now - t < WINDOW_MS);
    return this.flashTimestamps.length < MAX_FLASHES_PER_SECOND;
  }

  recordFlash(): void {
    this.flashTimestamps.push(performance.now());
  }

  get maxVolume(): number {
    return MAX_VOLUME;
  }
}
