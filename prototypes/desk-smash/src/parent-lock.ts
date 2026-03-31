// PROTOTYPE - NOT FOR PRODUCTION
// Question: Is keyboard-mashing a fake desktop with destruction effects fun?
// Date: 2026-03-28

import { Graphics } from 'pixi.js';
import type { Container } from 'pixi.js';

const UNLOCK_KEYWORD = 'exit';
const COMBO_HOLD_MS = 3000;
const KEYWORD_TIMEOUT_MS = 3000;

export class ParentLock {
  private keywordBuffer = '';
  private keywordTimer: ReturnType<typeof setTimeout> | null = null;
  private comboHeldSince: number | null = null;
  private dot: Graphics;
  private onUnlock: () => void;
  private progress = 0;

  constructor(parent: Container, screenW: number, screenH: number, onUnlock: () => void) {
    this.onUnlock = onUnlock;

    // Subtle indicator dot
    this.dot = new Graphics()
      .circle(0, 0, 4)
      .fill(0xffffff);
    this.dot.position.set(screenW - 12, screenH - 12);
    this.dot.alpha = 0.08;
    parent.addChild(this.dot);
  }

  handleKey(key: string): void {
    this.checkKeyword(key);
  }

  private checkKeyword(key: string): void {
    if (key.length !== 1) return;

    const lowerKey = key.toLowerCase();
    const expectedChar = UNLOCK_KEYWORD[this.keywordBuffer.length];

    if (lowerKey === expectedChar) {
      this.keywordBuffer += lowerKey;

      if (this.keywordTimer) clearTimeout(this.keywordTimer);
      this.keywordTimer = setTimeout(() => {
        this.keywordBuffer = '';
        this.updateDot();
      }, KEYWORD_TIMEOUT_MS);

      if (this.keywordBuffer === UNLOCK_KEYWORD) {
        this.triggerUnlock();
        return;
      }
    } else {
      this.keywordBuffer = '';
      if (this.keywordTimer) {
        clearTimeout(this.keywordTimer);
        this.keywordTimer = null;
      }
    }

    this.updateDot();
  }

  startComboHold(): void {
    if (this.comboHeldSince === null) {
      this.comboHeldSince = performance.now();
    }
  }

  endComboHold(): void {
    this.comboHeldSince = null;
    this.updateDot();
  }

  update(): void {
    if (this.comboHeldSince !== null) {
      const held = performance.now() - this.comboHeldSince;
      this.progress = Math.min(1, held / COMBO_HOLD_MS);
      this.updateDot();

      if (held >= COMBO_HOLD_MS) {
        this.triggerUnlock();
      }
    } else {
      this.progress = this.keywordBuffer.length / UNLOCK_KEYWORD.length;
    }
  }

  private updateDot(): void {
    const keywordProgress = this.keywordBuffer.length / UNLOCK_KEYWORD.length;
    const comboProgress = this.comboHeldSince
      ? Math.min(1, (performance.now() - this.comboHeldSince) / COMBO_HOLD_MS)
      : 0;
    const p = Math.max(keywordProgress, comboProgress);
    this.dot.alpha = 0.08 + p * 0.92;
  }

  private triggerUnlock(): void {
    this.onUnlock();
  }
}
