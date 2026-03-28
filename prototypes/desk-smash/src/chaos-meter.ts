// PROTOTYPE - NOT FOR PRODUCTION
// Question: Is keyboard-mashing a fake desktop with destruction effects fun?
// Date: 2026-03-28

const WINDOW_MS = 2000;

export class ChaosMeter {
  private events: number[] = [];
  private _level = 0;

  recordInput(): void {
    this.events.push(performance.now());
  }

  get level(): number {
    return this._level;
  }

  update(): void {
    const now = performance.now();
    this.events = this.events.filter(t => now - t < WINDOW_MS);
    const eps = this.events.length / (WINDOW_MS / 1000); // events per second

    if (eps >= 13) this._level = 3;
    else if (eps >= 8) this._level = 2;
    else if (eps >= 4) this._level = 1;
    else this._level = 0;
  }
}
