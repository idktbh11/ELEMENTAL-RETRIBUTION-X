# ELEMENTAL RETRIBUTION X

A 2D retro pixel-art RPG. Current build: main menu, character creation, **The Cave** (wake-up, the arena, the Voice, the tutorial, the first monsters) and **The Deep Ends** (miners, more monsters, the elevator) and **The Sealed Chamber** (the rainbow orb, the awakening, and the "YOU GOT ..." element reveal) and **The Void** (the Voice in person, your element scanned, the Julforic Pillars, 7 element-dependent worlds, world 1 unlocked) plus **Hero HQ** (staff to talk to, Brenda's armour shop). Jumping into world 1 is where the story currently ends (the grumpy slime says it is not built yet). Elements are never chosen, ever: one is rolled at random (weighted by rarity) at the reveal and saved on the character.

## Running it

**Double-click `index.html`.** It runs in any modern browser (Chrome, Edge, Firefox). You don't need a build step, a server or an internet connection.

The first key press or click on the title screen starts the audio, because browsers block sound until you interact with the page.

### Developer URL switches
| URL suffix | Effect |
|---|---|
| `index.html?scene=sky` | Force a world: `sky`, `village`, `tree`, `peaks` |
| `index.html?seed=1234` | Fix the world-generation seed |
| `index.html?debug` | Debug overlay (resolution, scale, world, screen stack, audio state) |

### Automated tests
```
node tools/test-menu.js          # menus, settings, characters (99 checks)
node tools/test-game.js          # plays the whole story so far, start to the element reveal (177 checks)
node tools/test-mobile.js        # plays on an emulated touch-screen phone using only taps (36 checks)
node tools/test-menu.js --shots  # also saves screenshots to tools/screenshots/
```
Requires Node 22+ and Chrome or Edge installed. No npm packages are needed.

## Project structure
```
index.html              Entry point (loads scripts in dependency order)
css/style.css           Full-window canvas, pixelated scaling
assets/images/          logo.png (native pixel-grid version of your logo),
                        logo_source.png (your original), favicon.png
js/core/                config (+ all asset paths), util (math/RNG/noise), events,
                        storage (localStorage + fallback), settings, saves (characters), asset loader
js/render/              display (integer pixel scaling), pixel-buffer (procedural
                        pixel painting), bitmap font, colour, sprites/icons, player-sprite
js/input/               input (keyboard/mouse/gamepad + UI actions), keybinds (remapping)
js/audio/               audio manager (buses), sfx bank, chiptune sequencer + tracks,
                        ambient soundscapes
js/ui/                  theme (pixel panels/buttons), widgets + focus navigation,
                        overlay (toasts, cursor, screen shake, FPS)
js/scenes/              scene manager (screen stack + dissolve/fade transitions)
js/backgrounds/         background manager, shared painters, pixel actors (NPCs),
                        the four worlds: env-sky, env-village, env-tree, env-peaks
js/screens/             main menu, character select, character creator, confirm dialog,
                        pause / skill tree / inventory / road-closed (game-menus.js),
                        play placeholder, settings, help, credits
js/data/                elements.js = THE ELEMENT REGISTRY (all 31 elements + world hints);
                        all text: splash lines, jokes, help text, credits, and
                        character options + name jokes (character.js)
js/game/                engine (physics, camera, lighting, script runner), level-cave, level-deep,
                        enemies (slimes, bats),
                        props (gates, dummy, torches), player, dialogue, hud,
                        story-cave (cave dialogue + tutorial), story-deep (the Voice returns,
                        miners, elevator), game-screen
js/main.js              Boot + main loop
tools/                  test suite, CDP browser driver, logo pixelation + favicon scripts
```

### Default gameplay controls
A / D move, SPACE jump (hold for higher), L-SHIFT dash, J attack, K block, E use/read, I inventory, T skill tree, = / - zoom, ESC pause. All remappable in Settings > Controls.

**Phones / tablets** (held sideways): tap through menus; in game, ← → on the left, JUMP / HIT / DASH / BLOCK / USE on the right, ★ skills / BAG / pause at the top. Tapping the name box opens the phone keyboard. Touch switches on automatically (`js/input/touch.js`), and the first tap tries to go fullscreen.

### Extending later
- **Story / dialogue**: edit `js/game/story-cave.js`. Scripts are generator functions: `yield* v(g, "text")`, `yield* choose(g, [...])`, `yield* task(...)`.
- **Monsters**: `js/game/enemies.js` — extend `Enemy`, add it to `TYPES`, then list it in a level's `enemySpawns`. Set `gold` for how much it drops.
- **The void + HQ**: `js/game/story-void.js` (the Voice's conversation, his line for every element in `ELEMENT_LINES`, HQ staff in `MINERS`, Brenda's shop), `js/game/level-void.js` (both areas + `ERX.Worlds.build(element)`, which paints the 7 worlds from the element), `js/render/figure-sprite.js` (the Voice's sprite + expressions).
- **Armour**: add entries to `js/data/armor.js` (name, price, def, colour). Gold and armour are saved on the character.
- **Levels**: `js/game/level-cave.js` carves the cave from numbers in SECTIONS; copy it for new areas.
- **Elements**: everything reads from `js/data/elements.js`. Add an element by appending an entry. Each has `world` hints (tint, particles, weather, mood) for element-dependent world changes. `ERX.Elements.random()` is called in exactly one place: `GameScreen.startReveal()` (the orb cutscene), which sets `character.element` once and never rerolls; the player can never choose. Title art per element lives in `assets/images/elements/<id>.png` (cut from the sheet with `tools/cut-element-sheet.js`; Darkness has no art yet and uses a generated pixel-font title). Each element has a signature reveal sound in `js/audio/reveal-audio.js`. **Rarity**: every element has a `rarity` tier (common, uncommon, rare, epic, legendary, mythic — see `RARITIES` / `TIER_OF` in elements.js); the tier weight sets how often it rolls. Chaos is the only MYTHIC and the rarest roll. New elements default to common.
- **New screen** (world map, battle, inventory): extend `ERX.Scenes.Screen`, call `ERX.Scenes.register('id', Class)`, then `ERX.Scenes.push('id')`.
- **Gameplay input**: read controls only through `ERX.Keybinds.isDown('jump')` and `ERX.Keybinds.wasPressed('attack')`. The player's remapping applies automatically.
- **New menu world**: extend `ERX.Environment` and call `ERX.Backgrounds.register({...})`.
- **Real audio files**: set paths in `ERX.AssetPaths.music` / `.ambience` in `js/core/config.js`. They replace the procedural tracks automatically.
- **Credits names**: edit `PEOPLE` in `js/data/credits.js`.
- **Character saves**: `ERX.Saves` (js/core/saves.js) stores name + appearance per character; add progress fields there later.
- **Customisation options**: add hairstyles/colours/outfits in `js/data/character.js` and draw them in `js/render/player-sprite.js`.
