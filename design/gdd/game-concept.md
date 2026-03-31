# Game Concept: Desk Smasher

*Created: 2026-03-28*
*Status: Draft*

---

## Elevator Pitch

> A full-screen web toy where toddlers and young kids smash a fake desktop to
> pieces by mashing the keyboard and clicking the mouse — every input creates
> satisfying destruction effects, cartoon sounds, and colorful chaos. Built for
> WFH parents who want their kid on their lap for 5-10 minutes of safe,
> joyful screen time.

---

## Core Identity

| Aspect | Detail |
| ---- | ---- |
| **Genre** | Interactive toy / sensory play |
| **Platform** | Web (primary), Tauri desktop app, Wallpaper Engine (Steam) |
| **Target Audience** | Kids 1-6 on a WFH parent's lap |
| **Player Count** | Single |
| **Session Length** | 5-10 minutes |
| **Monetization** | Free / open source (or minimal premium for Tauri/Steam) |
| **Estimated Scope** | Small (weekend MVP, ongoing polish) |
| **Comparable Titles** | Baby Smash, Desktop Destroyer, TinyFingers, ToddlerSmash |

---

## Core Fantasy

"I'm smashing the computer and it's FUNNY, not bad!"

The child gets to do the one thing they're never allowed to do — destroy the
desktop — and the result is pure colorful, silly, consequence-free chaos.
Every press and click makes something satisfying happen. The screen is their
playground.

For the parent: "My kid is entertained, safe, and sitting with me while I
finish this email."

---

## Unique Hook

It's like Baby Smash, AND ALSO it looks like a real desktop being hilariously
destroyed — cracks, shattering windows, flying icons, cartoon physics.

The desktop destroyer nostalgia appeals to the millennial/Gen-Z parent, while
the sensory feedback loop delights the child. The Tauri version can overlay
the ACTUAL desktop for a full immersive experience. The Wallpaper Engine
version turns it into an interactive living wallpaper.

---

## Player Experience Analysis (MDA Framework)

### Target Aesthetics (What the player FEELS)

| Aesthetic | Priority | How We Deliver It |
| ---- | ---- | ---- |
| **Sensation** (sensory pleasure) | 1 | Colorful destruction, satisfying sounds, particle effects |
| **Submission** (relaxation, comfort zone) | 2 | Zero pressure, no fail states, pure casual play |
| **Fantasy** (make-believe) | 3 | "Destroying" a desktop — forbidden fun made safe |
| **Discovery** (exploration, secrets) | 4 | Randomized effects and themes keep each session surprising |
| **Expression** (self-expression) | 5 | The destruction pattern is unique each time — emergent chaos art |
| **Challenge** | N/A | No challenge by design |
| **Narrative** | N/A | No story by design |
| **Fellowship** | N/A | Single-player only |

### Key Dynamics (Emergent player behaviors)

- Kids naturally escalate from single presses to rapid mashing as they
  discover cause-and-effect
- Older kids (4-6) may start targeting specific icons or windows intentionally
- The chaos meter rewards sustained input with bigger screen-wide effects,
  naturally creating excitement peaks
- Desktop rebuild cycle creates a rhythm: build tension through destruction,
  release with the rebuild, start fresh

### Core Mechanics (Systems we build)

1. **Input capture** — every keyboard key, mouse click, and mouse movement
   triggers effects; all system shortcuts blocked
2. **Destruction effects system** — randomized pool of visual destruction
   effects applied to desktop elements
3. **Fake desktop renderer** — generates themed desktops with windows, icons,
   taskbar, and wallpaper as destruction targets
4. **Audio feedback engine** — maps inputs to randomized cartoon sounds with
   volume cap
5. **Desktop rebuild cycle** — detects when destruction is "complete" and
   regenerates a fresh themed desktop

---

## Player Motivation Profile

### Primary Psychological Needs Served

| Need | How This Game Satisfies It | Strength |
| ---- | ---- | ---- |
| **Autonomy** (freedom, meaningful choice) | Every part of the screen responds; the child controls the chaos | Core |
| **Competence** (mastery, skill growth) | Immediate feedback validates every action — "I did that!" | Supporting |
| **Relatedness** (connection, belonging) | Sitting on parent's lap, sharing the experience together | Supporting (social context, not in-game) |

### Player Type Appeal

- [x] **Explorers** (discovery, trying different inputs) — "What happens if I press THIS?"
- [x] **Achievers** (completing destruction) — Older kids may try to "destroy everything"
- [ ] **Socializers** — N/A
- [ ] **Killers/Competitors** — N/A

### Flow State Design

- **Onboarding**: None needed. First keypress = instant feedback. The toy teaches itself.
- **Difficulty scaling**: N/A — no difficulty, just variety
- **Feedback clarity**: 1:1 input-to-output. Every single action produces visible + audible result.
- **Recovery from failure**: No failure states exist.

---

## Core Loop

### Moment-to-Moment (every input)
- Keyboard press → random destruction effect on a desktop element + sound
- Mouse click → smash impact at cursor position with crater/debris + sound
- Mouse drag → scratch/crack trail across desktop surface
- Rapid mashing → chaos meter builds, triggers screen-wide effects

### Short-Term Rhythm (1-2 minutes)
- Desktop starts intact (windows, icons, taskbar, wallpaper)
- Child destroys elements progressively
- Chaos meter fills → screen-wide event (earthquake, everything catches fire, disco mode)
- Desktop is mostly destroyed → magical rebuild animation (whoosh!)
- New themed desktop appears → fresh targets to smash

### Session Arc (5-10 minutes)
- 3-5 destruction/rebuild cycles per session
- Each rebuild introduces a different theme (space desktop, ocean desktop, jungle, candy)
- Variety in themes prevents habituation
- No "ending" — parent closes when done

### Long-Term Progression
- None by design. Every session is self-contained.
- Future: unlockable themes could add light long-term interest without creating addictive hooks

### Retention Hooks
- **Curiosity**: "What theme will appear next? What new effects will I see?"
- **Investment**: None — intentionally zero investment/loss psychology
- **Social**: Parent-child bonding moment during the workday
- **Mastery**: N/A

---

## Destruction Effects Catalog

### Surface Effects
- **Cracks** — spider-web fracture patterns spreading from impact point
- **Shatter** — windows/icons break into physics-driven glass shards
- **Melt** — elements drip and puddle downward with gooey animation
- **Pixelate** — elements dissolve into chunky pixels that scatter
- **Inflate & pop** — elements balloon up comically then burst into confetti

### Physics Fun
- **Bounce** — icons ricochet off screen edges like rubber balls
- **Domino chain** — smashing one icon sends it flying into others
- **Gravity flip** — everything falls upward, sticks to top, then rains back down
- **Vortex** — black hole sucks nearby elements in with a satisfying swirl
- **Explosion** — radial blast sends everything flying from impact point

### Silly / Unexpected
- **Wobbly jello** — the whole desktop wobbles like gelatin on impact
- **Shrink ray** — elements get tiny and squeak
- **Clone swarm** — one smashed icon multiplies into a dozen tiny copies
- **Rainbow trail** — smashed elements leave colorful streaks as they fly

### Combo Escalation (Chaos Meter)
Rapid sustained input fills a hidden chaos meter. At thresholds:
- **Level 1**: Screen shake on every hit
- **Level 2**: Elements start auto-chain-reacting
- **Level 3**: Screen-wide event — earthquake, cartoon fire, disco mode, confetti explosion

Each keypress picks a random effect from the available pool, so the child is
constantly surprised by what happens next.

---

## Game Pillars

### Pillar 1: Instant Joy
Every single input produces immediate, visible, audible, satisfying feedback.
Zero delay, zero dead inputs. Feedback must occur within 100ms.

*Design test*: "Should we add a loading screen between themes?" — No. Instant
joy means no waiting, ever. Pre-load the next theme during the current cycle.

### Pillar 2: Safe Chaos
The destruction is silly, colorful, and consequence-free. Nothing scary, nothing
violent, nothing realistic — pure cartoon mischief.

*Design test*: "Should we add realistic glass breaking sounds?" — No. Keep it
playful — boings, pops, and cartoon crashes only.

### Pillar 3: Surprise & Variety
The child should never predict exactly what will happen next. Randomized effects,
themes, sounds, and combinations prevent habituation.

*Design test*: "Should every keypress trigger the same effect?" — No. Randomize
from the effect pool every time.

### Pillar 4: Parent-Friendly
System key lockout, parent unlock mechanism, no addictive hooks, volume cap,
photosensitivity safety. The parent trusts this toy completely.

*Design test*: "Should we add a progression system to keep kids playing longer?"
— No. This is a 5-10 minute toy, not an engagement trap.

### Anti-Pillars (What This Game Is NOT)

- **NOT educational** — No stealth learning, no letter drills, no counting.
  This would compromise pure sensory joy and add scope.
- **NOT a game** — No scores, no levels, no win/lose conditions, no leaderboards.
  This would compromise safe chaos.
- **NOT addictive** — No streaks, daily rewards, unlockable progress, or
  engagement hooks. This would compromise parent trust.
- **NOT multiplayer** — No networking, no accounts, no social features.
  This would compromise weekend scope and privacy.
- **NOT data-collecting** — Zero analytics, zero cookies, zero tracking.
  COPPA compliance by design through collecting nothing.

---

## Parent Lock System

### Blocked Inputs (while toy is active)
- Alt+Tab, Alt+F4, Ctrl+W, Cmd+Q, Cmd+W
- Windows/Super key, Escape
- Right-click context menu
- Browser navigation (back, forward, refresh: Ctrl+R, F5)
- F-keys (F1-F12)
- Ctrl+Alt+Del (OS-level — cannot fully block, but Tauri can recapture focus)

### Parent Unlock Mechanisms

**Method 1 — Typed keyword**: Parent types a word like "exit" or "parent" on
the keyboard. Since the child is mashing randomly, the odds of typing a real
word in sequence are near zero. Each non-matching key resets the sequence
buffer.

**Method 2 — Key combo hold**: Parent holds Ctrl+Shift+Q for 3 seconds. A
toddler cannot sustain a specific three-key combo for 3 seconds.

Both methods available simultaneously. Configurable keyword in parent settings.

### Visual Indicator
A tiny subtle dot in the corner changes color as the parent combo is partially
entered — parent knows progress, child doesn't notice.

### Implementation Notes
- **Web**: `preventDefault()` on all keyboard/mouse events, Fullscreen API,
  `beforeunload` trap
- **Tauri**: Global shortcut interception via Tauri API, window focus
  management, always-on-top mode
- **Wallpaper Engine**: Runs inside WE's container, inherits its input handling

---

## Inspiration and References

| Reference | What We Take From It | What We Do Differently | Why It Matters |
| ---- | ---- | ---- | ---- |
| Baby Smash | Full-screen input capture, every key = feedback, system key lockout | Themed destruction instead of abstract shapes; richer visual variety | Proves the input-capture toy model works; 15+ years of popularity |
| Desktop Destroyer | Desktop as destruction target, satisfying physics, nostalgia factor | Modern web tech, kid-safe cartoon style, rebuild cycle for replayability | Directly validates the "smash a desktop" fantasy |
| TinyFingers | Particle bursts, sparkle trails, web-based simplicity | Desktop theme instead of abstract canvas; more destruction variety | Proves web-based keyboard toy is viable |
| Wallpaper Engine | Interactive web wallpapers, Steam distribution, property API | Our wallpaper is a toy first, wallpaper second | Opens Steam as a distribution channel with minimal extra work |

**Non-game inspirations**: Toddler sensory toys (cause-and-effect boards),
cartoon slapstick physics (Looney Tunes), the forbidden thrill of touching
things you're not supposed to touch.

---

## Target Player Profile

| Attribute | Detail |
| ---- | ---- |
| **Primary user age** | 1-6 years old |
| **Primary user experience** | None — possibly first screen interaction ever |
| **Decision maker** | WFH parent (25-40, millennial/Gen-Z) |
| **Context** | Parent working from home, child on lap or nearby |
| **Session length** | 5-10 minutes |
| **Platform** | Parent's work laptop/desktop (browser or installed app) |
| **What they're looking for** | Safe, self-contained entertainment for a brief moment |
| **What would turn them away** | Ads, data collection, scary content, addictive hooks, requires setup |

---

## Technical Considerations

| Consideration | Assessment |
| ---- | ---- |
| **Engine** | PixiJS (lightweight 2D renderer, excellent particle system, LLM docs at pixijs.com/llms-full.txt) |
| **Language** | TypeScript |
| **Key Technical Challenges** | Input capture + system key blocking; varied destruction effects that feel satisfying; photosensitivity-safe animations |
| **Art Style** | Flat/cartoon desktop elements — simple shapes, bold colors, exaggerated animations |
| **Art Pipeline Complexity** | Low — geometric shapes, CSS-style icons, particle effects. Minimal custom art. |
| **Audio Needs** | Essential — cartoon sound bank (pops, boings, crashes, whooshes, squeaks). Volume-capped. Web Audio API. |
| **Networking** | None |
| **Content Volume** | 5-10 desktop themes, 15+ destruction effects, 20+ sound effects |
| **Procedural Systems** | Randomized desktop layouts, randomized effect selection per input |

### Distribution Targets

| Platform | Technology | Effort | Notes |
| ---- | ---- | ---- | ---- |
| **Web** | Static HTML/JS, hosted anywhere | Base build | Primary platform |
| **Tauri** | Rust + WebView wrapping the web build | Medium | Desktop overlay, OS-level key blocking, fullscreen immersion |
| **Wallpaper Engine** | Web wallpaper type + `project.json` manifest | Low | Steam Workshop distribution, interactive wallpaper mode |

---

## Safety & Compliance

### Photosensitive Epilepsy Prevention
- Never flash content more than 3 times per second (WCAG guideline)
- No rapid alternation between high-contrast colors (especially red)
- No strobing or pulsing effects
- All animation transitions are smooth, never abrupt on/off

### Audio Safety
- Maximum volume capped programmatically
- All sounds are soft and pleasant — no sharp or startling effects
- Mute toggle accessible via parent settings

### Privacy / Legal
- Zero data collection — no cookies, no analytics, no tracking
- No accounts, no external network requests
- No ads, no in-app purchases, no external links
- COPPA compliant by design (nothing to comply with when you collect nothing)

### Visual Design Guidelines (from child development research)
- Saturated primary color palette: blue, red, pink, purple, green, orange, yellow
- Light background for maximum contrast
- Large, bold elements (minimum 60-80px touch/click targets)
- High contrast ratio (minimum 3:1 for elements, 4.5:1 for any text)

---

## Risks and Open Questions

### Design Risks
- Core destruction loop may feel repetitive after 3-4 sessions without
  enough variety in effects and themes
- Finding the right "feel" — destruction must be satisfying, not janky.
  Needs early prototyping and iteration.

### Technical Risks
- Browser fullscreen API behavior varies across browsers — may not fully
  prevent all escape routes
- System key blocking is imperfect in web — Tauri version solves this but
  web version will have edge cases
- Performance on lower-end devices with many simultaneous particle effects

### Market Risks
- Niche audience (WFH parents with young kids) — but zero-cost distribution
  via web mitigates this
- Competing with free apps already in this space — differentiation is the
  desktop destroyer theme and Tauri/Wallpaper Engine distribution

### Scope Risks
- "Just one more effect" temptation — the destruction catalog can grow
  endlessly. MVP must ship with a constrained set.
- Tauri and Wallpaper Engine ports are future scope — do not let them
  creep into the weekend MVP

### Open Questions
- What's the right number of destruction effects for MVP to feel varied?
  (Hypothesis: 5-6 is enough. Prototype to validate.)
- Should the chaos meter be visible or hidden? (Hidden keeps it simple for
  kids, but visible could add excitement for older kids 4-6.)
- What's the best parent unlock keyword? (Needs to be easy for parents to
  remember but impossible to mash accidentally.)

---

## MVP Definition

**Core hypothesis**: Kids aged 1-6 find the keyboard-smash desktop destruction
loop engaging and delightful for 5+ minutes, and parents trust the toy enough
to use it during work.

**Required for MVP**:
1. Full-screen PixiJS canvas with fake desktop (1 theme)
2. Keyboard capture — every key triggers a random destruction effect + sound
3. Mouse click — smash impact at cursor position
4. 5-6 destruction effects from the catalog
5. 5-10 cartoon sound effects
6. System key blocking (best-effort in browser)
7. Parent unlock (typed keyword)
8. Photosensitivity-safe animations

**Explicitly NOT in MVP** (defer to later):
- Multiple desktop themes / theme rotation
- Desktop rebuild cycle
- Chaos meter / combo escalation
- Mouse drag trails
- Tauri desktop app
- Wallpaper Engine support
- Parent settings panel
- Sparkle trails on mouse movement

### Scope Tiers

| Tier | Content | Features | Timeline |
| ---- | ---- | ---- | ---- |
| **MVP** | 1 desktop theme, 5-6 effects, 5-10 sounds | Input capture, destruction, parent lock | Day 1 |
| **Polished** | 3 themes, 10+ effects, 20+ sounds | Rebuild cycle, chaos meter, mouse trails | Day 2 |
| **Alpha** | 5+ themes, full effect catalog | All effects, parent settings, theme selector | Week 2 |
| **Full Vision** | 10+ themes, seasonal content | Tauri app, Wallpaper Engine, desktop overlay | Ongoing |

---

## Next Steps

- [ ] Configure engine and tech stack (`/setup-engine` — PixiJS + TypeScript)
- [ ] Validate concept completeness (`/design-review design/gdd/game-concept.md`)
- [ ] Decompose into systems (`/map-systems` — input, destruction, desktop renderer, audio, parent lock)
- [ ] First architecture decision record (`/architecture-decision` — PixiJS app structure)
- [ ] Prototype core destruction loop (`/prototype desk-smash`)
- [ ] Playtest with actual kid on lap (`/playtest-report`)
- [ ] Plan first sprint (`/sprint-plan new`)
