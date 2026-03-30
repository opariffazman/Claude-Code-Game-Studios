# UI Chrome Plan -- Kenney Sprite Assignments per Theme

## Overview

Each of the 5 desktop themes gets a set of Kenney UI pack sprites for window
chrome (window background, title bar, close button, sticky note, notification
bar). The approach is simple stretched sprites via PixiJS `Sprite` -- no
NineSlice for now. Sprites are loaded as individual PNGs through the existing
`ThemeLoader` asset pipeline.

## Player Fantasy

Smashing themed desktops should feel visually distinct per theme. A medieval
wood panel shattering reads differently from a sci-fi glass panel cracking.
The UI chrome establishes the "world" of each desktop before the player
destroys it, making each rebuild cycle feel like visiting a new place.

## Theme-to-Pack Mapping

| Theme | Primary UI Pack | Rationale |
|-------|----------------|-----------|
| animal-farm | adventure | Warm brown wood panels match the pastoral farm feel |
| pixel-adventure | pixel-adventure (tilemap) | Native pixel-art panels match the retro item icons |
| space-station | sci-fi | Futuristic glass/metal panels match the vehicle icons |
| fantasy-kingdom | fantasy-borders + rpg-expansion | Ornate border frames fit the purple twilight kingdom vibe |
| rpg-quest | rpg-expansion + adventure | Parchment/leather RPG panels match the item-quest theme |

---

## Per-Theme Sprite Assignments

### 1. animal-farm (wallpaper: 0x5b8c3e -- forest green)

**Pack**: adventure

| Element | File | Notes |
|---------|------|-------|
| Window background | `adventure/PNG/Default/panel_brown.png` | Warm brown wood panel with visible border, stretches well |
| Title bar | `adventure/PNG/Default/panel_brown_dark.png` | Darker brown variant, crop/stretch to bar shape |
| Close button | `adventure/PNG/Default/button_red_close.png` | Red close button with X -- instantly readable |
| Sticky note | `adventure/PNG/Default/panel_grid_paper.png` | Grid paper panel -- reads as a "note on the fridge" |
| Notification bar | `adventure/PNG/Default/banner_modern.png` | Red banner bar -- wide aspect ratio, good for alerts |

**Alt close button**: `adventure/PNG/Default/button_brown_close.png` (subtler, brown X)

---

### 2. pixel-adventure (wallpaper: 0x6b4226 -- earthy brown)

**Pack**: pixel-adventure (Large tiles, Thick outline)

The pixel-adventure pack uses a tilemap of 16x16/32x32 tiles. For the
simplest approach, we use the individual tile PNGs that already exist.

| Element | File | Notes |
|---------|------|-------|
| Window background | `pixel-adventure/Tiles/Large tiles/Thick outline/tile_0000.png` | Brown bordered square panel tile -- the classic pixel-art window |
| Title bar | `pixel-adventure/Tiles/Large tiles/Thick outline/tile_0004.png` | Gold/highlighted variant tile for title contrast |
| Close button | `pixel-adventure/Tiles/Large tiles/Thick outline/tile_0006.png` | Small dark bordered tile -- overlay a tinted X or use as-is |
| Sticky note | `pixel-adventure/Tiles/Large tiles/Thick outline/tile_0002.png` | White/cream bordered tile -- reads as a note |
| Notification bar | `pixel-adventure/Tiles/Large tiles/Thick outline/tile_0008.png` | Blue-grey tile variant stretched wide |

**Fallback**: If tile stretching looks too pixelated at large sizes, use
`adventure/PNG/Default/panel_brown_corners_a.png` for windows instead (pixel-art
decorated corners on parchment -- aesthetically compatible).

---

### 3. space-station (wallpaper: 0x1a1a3e -- dark navy)

**Pack**: sci-fi (Blue + Extra)

| Element | File | Notes |
|---------|------|-------|
| Window background | `sci-fi/PNG/Extra/Default/panel_glass.png` | Semi-transparent glass panel with subtle border -- futuristic window |
| Title bar | `sci-fi/PNG/Blue/Default/bar_square_large.png` | Blue glowing bar -- perfect horizontal title strip |
| Close button | `sci-fi/PNG/Extra/Default/button_square.png` | Metal square button with corner screws -- overlay X text |
| Sticky note | `sci-fi/PNG/Extra/Default/panel_square.png` | Small flat metal panel -- reads as a data pad |
| Notification bar | `sci-fi/PNG/Blue/Default/button_square_header_large_rectangle.png` | Blue header bar with metal bottom -- alert strip |

**Alt title bar**: `sci-fi/PNG/Blue/Default/button_square_header_small_rectangle.png`
(smaller header variant if the large one is too tall)

---

### 4. fantasy-kingdom (wallpaper: 0x3d2b56 -- purple twilight)

**Pack**: fantasy-borders (panels) + rpg-expansion (buttons)

The fantasy-borders PNGs render with very light/white fills on transparent
backgrounds -- they are ornate border frames designed to be composited over
colored backgrounds. This is actually ideal: place a tinted color rect behind
the border frame for each window.

| Element | File | Notes |
|---------|------|-------|
| Window background | `fantasy-borders/PNG/Default/Panel/panel-001.png` | Ornate frame -- layer over a purple-tinted rect |
| Title bar | `fantasy-borders/PNG/Default/Divider/divider-001.png` | Horizontal ornate divider -- stretch as title bar accent |
| Close button | `rpg-expansion/PNG/iconCross_brown.png` | RPG-style brown X icon -- clear close affordance |
| Sticky note | `rpg-expansion/PNG/panelInset_brown.png` | Inset brown panel -- reads as a scroll/note |
| Notification bar | `fantasy-borders/PNG/Default/Divider Fade/divider-fade-001.png` | Fading ornate divider -- stretch as notification strip |

**Alt window**: `fantasy-borders/PNG/Default/Transparent center/panel-transparent-center-001.png`
(border only, center fully transparent -- good for overlay windows)

**Alt close**: `rpg-expansion/PNG/iconCross_blue.png` or `rpg-expansion/PNG/iconCross_grey.png`

---

### 5. rpg-quest (wallpaper: 0x8b4513 -- saddle brown)

**Pack**: rpg-expansion + adventure

| Element | File | Notes |
|---------|------|-------|
| Window background | `rpg-expansion/PNG/panel_beige.png` | Parchment-colored panel -- classic inventory/quest window |
| Title bar | `rpg-expansion/PNG/buttonLong_brown.png` | Long brown button -- stretched as title bar |
| Close button | `rpg-expansion/PNG/iconCross_brown.png` | Brown X icon (shared with fantasy-kingdom) |
| Sticky note | `rpg-expansion/PNG/panelInset_beige.png` | Inset beige -- lighter variant reads as a note |
| Notification bar | `adventure/PNG/Default/banner_hanging.png` | Hanging banner -- RPG-style announcement strip |

**Alt window**: `rpg-expansion/PNG/panel_beigeLight.png` (lighter variant for sub-windows)

**Alt title bar**: `rpg-expansion/PNG/buttonLong_beige.png` (lighter, for secondary windows)

---

## Implementation Notes

### Loading Strategy

Each theme's UI sprites should be loaded alongside its icon textures in
`ThemeLoader`. Add a `uiSprites` field to `ThemeAssets`:

```typescript
interface ThemeUiSprites {
  windowBg: Texture;
  titleBar: Texture;
  closeButton: Texture;
  stickyNote: Texture;
  notificationBar: Texture;
}
```

All paths are relative to `assets/sprites/ui/`. Load as individual PNGs via
`Assets.load()` -- same pattern as the animal icon files.

### Rendering Approach (Phase 1 -- Simple Stretch)

1. Create a `Sprite` from the window background texture
2. Set `sprite.width` and `sprite.height` to the desired window dimensions
3. The title bar sprite is placed at the top, stretched to `windowWidth x titleBarHeight`
4. The close button sprite is placed in the title bar's top-right corner, no stretch (keep square)
5. Sticky notes use the sticky sprite stretched to sticky dimensions
6. Notification bars stretch to `screenWidth x barHeight`

This will produce some stretching artifacts on bordered sprites, but for a
destructible desktop toy aimed at kids, "slightly wonky" panels are charming
rather than broken. The sprites give us 90% of the visual quality at 10% of
the implementation cost versus NineSlice.

### Phase 2 (Future -- NineSlice)

If stretching artifacts are unacceptable on larger windows, upgrade to PixiJS
NineSliceSprite for the adventure and rpg-expansion panels (which have clear
border/center regions). The sci-fi glass panels and pixel-adventure tiles
stretch fine without NineSlice.

### Destruction Compatibility

When a window is smashed, the sprite-based chrome integrates naturally with
the existing particle system. The sprite texture can be used as the source for
debris particles, meaning each theme's destruction produces visually themed
debris (brown wood splinters for adventure panels, glass shards for sci-fi, etc).

---

## Acceptance Criteria

- [ ] Each of the 5 themes renders windows using its assigned Kenney UI sprites
- [ ] Window background, title bar, close button, sticky, and notification bar are all sprite-based
- [ ] No procedural Graphics are used for window chrome
- [ ] Theme switching via rebuild cycle swaps all UI chrome sprites
- [ ] Sprites load without errors on all 5 themes
- [ ] Visual distinction between themes is immediately obvious to a child player

## Dependencies

- Theme Loader (`src/systems/theme-loader.ts`) -- needs `uiSprites` field
- Desktop Manager (`src/desktop/desktop-manager.ts`) -- needs to use sprites instead of Graphics
- Element Factory (`src/desktop/element-factory.ts`) -- builds windows/stickies from sprites
- Rebuild Cycle (`src/systems/rebuild-cycle.ts`) -- theme advance triggers UI sprite swap
