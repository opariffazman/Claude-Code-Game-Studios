/**
 * AdventureClock — minimap-style compass clock widget.
 *
 * Uses minimap_ring_brown_detail.svg as the outer ring (has built-in NSEW arrows),
 * round_brown.svg as the inner face, minimap_compass_future_n/s/e/w.svg as
 * cardinal direction labels, and real-time HH:MM centered in the middle.
 *
 * Positioned bottom-left of the screen above the taskbar as a floating widget.
 */
import { Assets, Container, Sprite, Text, TextStyle, Texture } from 'pixi.js';

const SVG_DIR = 'assets/kenney/ui/adventure/svg';

const RING_SRC    = `${SVG_DIR}/minimap_ring_brown_detail.svg`;
const FACE_SRC    = `${SVG_DIR}/round_brown.svg`;
const COMPASS_N   = `${SVG_DIR}/minimap_compass_future_n.svg`;
const COMPASS_S   = `${SVG_DIR}/minimap_compass_future_s.svg`;
const COMPASS_E   = `${SVG_DIR}/minimap_compass_future_e.svg`;
const COMPASS_W   = `${SVG_DIR}/minimap_compass_future_w.svg`;

/** Display size of the widget (3x the original 64px). */
const CLOCK_SIZE = 192;
const TASKBAR_H = 48;
const MARGIN = 8;
/** Size of NSEW letter labels. */
const LABEL_SIZE = 20;
/** Extra padding around the ring for NSEW label overhang. */
const LABEL_PAD = 24;

export class AdventureClock {
  private readonly _root: Container;
  private _timeLabel: Text;
  private _dayLabel: Text;
  private _lastMinute = '';

  // ---------------------------------------------------------------------------
  // Static preload
  // ---------------------------------------------------------------------------

  static async preload(): Promise<void> {
    const assets = [RING_SRC, FACE_SRC, COMPASS_N, COMPASS_S, COMPASS_E, COMPASS_W];
    for (const src of assets) {
      Assets.add({ alias: src, src, data: { resolution: 4 } });
    }
    await Assets.load(assets);
  }

  // ---------------------------------------------------------------------------
  // Constructor
  // ---------------------------------------------------------------------------

  constructor(parent: Container, screenW: number, screenH: number) {
    this._root = new Container();
    this._root.label = 'adventure-clock';

    // All children offset by LABEL_PAD so NSEW labels don't clip outside the container.
    const ox = LABEL_PAD;
    const oy = LABEL_PAD;

    // Outer ring with compass arrows
    const ringTex = Assets.get<Texture>(RING_SRC);
    if (ringTex) {
      const ring = new Sprite(ringTex);
      ring.width = CLOCK_SIZE;
      ring.height = CLOCK_SIZE;
      ring.position.set(ox, oy);
      this._root.addChild(ring);
    }

    // Inner face (parchment circle)
    const faceTex = Assets.get<Texture>(FACE_SRC);
    if (faceTex) {
      const face = new Sprite(faceTex);
      const faceSize = CLOCK_SIZE * 0.68;
      face.width = faceSize;
      face.height = faceSize;
      face.position.set(ox + (CLOCK_SIZE - faceSize) / 2, oy + (CLOCK_SIZE - faceSize) / 2);
      this._root.addChild(face);
    }

    // Compass direction labels (N/S/E/W) positioned outside the ring
    const center = CLOCK_SIZE / 2;
    const labelOffset = CLOCK_SIZE * 0.55;

    const compassPairs: [string, number, number][] = [
      [COMPASS_N, ox + center - LABEL_SIZE / 2, oy + center - labelOffset - LABEL_SIZE / 2],
      [COMPASS_S, ox + center - LABEL_SIZE / 2, oy + center + labelOffset - LABEL_SIZE / 2],
      [COMPASS_E, ox + center + labelOffset - LABEL_SIZE / 2, oy + center - LABEL_SIZE / 2],
      [COMPASS_W, ox + center - labelOffset - LABEL_SIZE / 2, oy + center - LABEL_SIZE / 2],
    ];
    for (const [src, x, y] of compassPairs) {
      const tex = Assets.get<Texture>(src);
      if (tex) {
        const spr = new Sprite(tex);
        spr.width = LABEL_SIZE;
        spr.height = LABEL_SIZE;
        spr.position.set(x, y);
        this._root.addChild(spr);
      }
    }

    // Time text — centered
    const timeStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 24,
      fill: 0x3b2006,
      fontWeight: 'bold',
    });
    this._timeLabel = new Text({ text: '', style: timeStyle });
    this._timeLabel.anchor.set(0.5);
    this._timeLabel.position.set(ox + center, oy + center - 8);
    this._root.addChild(this._timeLabel);

    // Day of week — below the time
    const dayStyle = new TextStyle({
      fontFamily: 'sans-serif',
      fontSize: 13,
      fill: 0x6d4b27,
    });
    this._dayLabel = new Text({ text: '', style: dayStyle });
    this._dayLabel.anchor.set(0.5);
    this._dayLabel.position.set(ox + center, oy + center + 16);
    this._root.addChild(this._dayLabel);

    parent.addChild(this._root);
    this._position(screenW, screenH);
    this._refresh();
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  update(): void {
    const timeStr = this._currentTimeString();
    if (timeStr !== this._lastMinute) {
      this._refresh();
    }
  }

  resize(screenW: number, screenH: number): void {
    this._position(screenW, screenH);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private _position(_screenW: number, screenH: number): void {
    const totalSize = CLOCK_SIZE + LABEL_PAD * 2;
    this._root.position.set(MARGIN * 10, screenH - TASKBAR_H - totalSize - MARGIN * 10);
  }

  private _refresh(): void {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hh}:${mm}`;
    this._timeLabel.text = timeStr;
    this._lastMinute = timeStr;

    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    this._dayLabel.text = DAYS[now.getDay()] ?? '';
  }

  private _currentTimeString(): string {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
}
