/**
 * MilestoneTracker — tracks session stats and fires callbacks at milestones.
 * "10 animals smashed!", "First window destroyed!", "Chaos level 3!"
 *
 * Usage:
 * ```ts
 * const tracker = new MilestoneTracker((label) => toast.show(label));
 * tracker.recordHit();
 * tracker.recordIconDestroyed();
 * tracker.recordChaosLevel(chaosMeter.level);
 * ```
 *
 * Thread-safety: Not thread-safe. Must be called from the main game loop only.
 * Zero allocation in check path — all milestone objects are pre-allocated.
 */

/** Snapshot of the current session destruction statistics. */
export interface SessionStats {
  totalHits: number;
  iconsDestroyed: number;
  windowsDestroyed: number;
  notifsDestroyed: number;
  wallpaperCracks: number;
  maxChaosReached: number;
  fullClears: number;
}

/** A single milestone definition with its trigger condition and fire-once guard. */
interface Milestone {
  id: string;
  label: string;
  check: (stats: SessionStats) => boolean;
  fired: boolean;
}

export class MilestoneTracker {
  private stats: SessionStats = {
    totalHits: 0,
    iconsDestroyed: 0,
    windowsDestroyed: 0,
    notifsDestroyed: 0,
    wallpaperCracks: 0,
    maxChaosReached: 0,
    fullClears: 0,
  };

  /** Pre-allocated milestone list — no allocations during gameplay. */
  private readonly milestones: Milestone[] = [
    { id: 'first-hit',    label: 'First Strike!',       check: s => s.totalHits >= 1,         fired: false },
    { id: '10-hits',      label: '10 Hits!',             check: s => s.totalHits >= 10,        fired: false },
    { id: '50-hits',      label: '50 Hit Combo!',        check: s => s.totalHits >= 50,        fired: false },
    { id: '100-hits',     label: '100 Hit Rampage!',     check: s => s.totalHits >= 100,       fired: false },
    { id: 'first-icon',   label: 'First Animal Down!',   check: s => s.iconsDestroyed >= 1,    fired: false },
    { id: '10-icons',     label: '10 Animals Smashed!',  check: s => s.iconsDestroyed >= 10,   fired: false },
    { id: 'first-window', label: 'Window Breaker!',      check: s => s.windowsDestroyed >= 1,  fired: false },
    { id: 'chaos-2',      label: 'Getting Crazy!',       check: s => s.maxChaosReached >= 2,   fired: false },
    { id: 'chaos-3',      label: 'MAX CHAOS!',           check: s => s.maxChaosReached >= 3,   fired: false },
    { id: 'first-clear',  label: 'Total Destruction!',   check: s => s.fullClears >= 1,        fired: false },
    { id: '5-cracks',     label: 'Wallpaper Wrecker!',   check: s => s.wallpaperCracks >= 5,   fired: false },
  ];

  private readonly _onMilestone: (label: string) => void;

  /**
   * @param onMilestone - Callback fired once per milestone when its condition is
   *   first met. Receives the human-readable milestone label.
   */
  constructor(onMilestone: (label: string) => void) {
    this._onMilestone = onMilestone;
  }

  /** Record a single hit (keyboard or mouse) against any element or wallpaper. */
  recordHit(): void {
    this.stats.totalHits++;
    this._check();
  }

  /** Record the destruction of a desktop icon. */
  recordIconDestroyed(): void {
    this.stats.iconsDestroyed++;
    this._check();
  }

  /** Record the destruction of a window element. */
  recordWindowDestroyed(): void {
    this.stats.windowsDestroyed++;
    this._check();
  }

  /** Record the destruction of a notification element. */
  recordNotifDestroyed(): void {
    this.stats.notifsDestroyed++;
    this._check();
  }

  /** Record a wallpaper crack (empty-space click or drag stamp). */
  recordWallpaperCrack(): void {
    this.stats.wallpaperCracks++;
    this._check();
  }

  /**
   * Update the maximum chaos level reached this session.
   * Only advances — passing a lower value than the current max is a no-op.
   *
   * @param level - Current chaos meter level (0–3).
   */
  recordChaosLevel(level: number): void {
    if (level > this.stats.maxChaosReached) {
      this.stats.maxChaosReached = level;
      this._check();
    }
  }

  /** Record a full desktop clear (all damageable elements destroyed). */
  recordFullClear(): void {
    this.stats.fullClears++;
    this._check();
  }

  /**
   * Returns a read-only snapshot of the current session statistics.
   * Useful for debug display or unit testing.
   */
  getStats(): Readonly<SessionStats> {
    return this.stats;
  }

  /**
   * Reset all stats and milestone fire flags to their initial state.
   * Call this when starting a new session, not between desktop rebuilds —
   * stats are cumulative across rebuilds by design.
   */
  reset(): void {
    this.stats = {
      totalHits: 0,
      iconsDestroyed: 0,
      windowsDestroyed: 0,
      notifsDestroyed: 0,
      wallpaperCracks: 0,
      maxChaosReached: 0,
      fullClears: 0,
    };
    for (const m of this.milestones) {
      m.fired = false;
    }
  }

  /** Scan all un-fired milestones and fire any whose condition is now met. */
  private _check(): void {
    for (const m of this.milestones) {
      if (!m.fired && m.check(this.stats)) {
        m.fired = true;
        this._onMilestone(m.label);
      }
    }
  }
}
