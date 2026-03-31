/**
 * Single-line milestone text for a banner.
 * Shows current goal or achieved milestone. Text centered in the banner.
 *
 * Implements: desk-smasher-zh2 — replace CombatLog-based milestones with
 * simple centered single-line Text that advances as milestones fire.
 */
import { Container, Text, TextStyle } from 'pixi.js';

export class MilestoneBannerText {
  private text: Text;
  private containerW: number;
  private containerH: number;

  /**
   * @param parent     - PixiJS Container to attach the text to (banner's content container).
   * @param x          - Left offset within the parent container.
   * @param y          - Top offset within the parent container.
   * @param w          - Width of the content area (used for centering).
   * @param h          - Height of the content area (used for vertical centering).
   * @param initialText - Starting text (the first milestone goal to display).
   */
  constructor(parent: Container, x: number, y: number, w: number, h: number, initialText: string) {
    this.containerW = w;
    this.containerH = h;
    const style = new TextStyle({
      fontSize: 13,
      fill: 0xffffff,
      fontFamily: 'sans-serif',
      fontWeight: 'bold',
      align: 'center',
    });
    this.text = new Text({ text: initialText, style });
    this.text.anchor.set(0.5);
    this.text.position.set(x + w / 2, y + h / 2);
    parent.addChild(this.text);
  }

  /**
   * Swap the displayed text to a new milestone goal or achieved label.
   *
   * @param newText - The replacement milestone string to display.
   */
  setText(newText: string): void {
    this.text.text = newText;
  }
}
