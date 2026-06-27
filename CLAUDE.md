# Home's Journey — CCG · Developer Guide

Two-player hotseat collectible card game. Tea (Tavern) vs Jeet (Core), each defending a 20 HP base.
Built with vanilla HTML/CSS/JS. Hosted on GitHub Pages. No build step required.

---

## Project Structure

```
index.html          # Markup: landing, game field, rules/lore/catalog screens
css/
  styles.css        # All styles
js/
  data.js           # DEFS object (all card definitions) + buildDeck()
  deck.js           # mkCard(), resetCardState(), _cardRuntimeDefaults()
  state.js          # G (game state), initState(), findC(), resetC(), lg(), hint()
  abilities.js      # getTagVal(), hasTag(), getAbilities(), triggerAbilities(), applyAuras()
  game.js           # onClick(), doAttack(), endTurn(), killCard(), checkSquadBonuses(),
                    #   doShard(), doSacrificeTarget(), doActiveAoe(), doPlay(), …
  render.js         # render(), mkEl(), mkSmallEl(), rZone(), rPersist(), reorderZones()
  catalog.js        # renderCatalog(), filters, openCardDetail()
  ui.js             # startGame(), showLanding(), mulligan UI, navigation, boot
img/
  cards/            # Card art PNGs (001_*.png … NFT traveler PNGs go here)
  ico_*.png         # Status icons (fear, pierce, regen, burn, rage, provoke)
  type_*.png        # Card type dots
  …                 # UI chrome (buttons, backgrounds, stat icons)
fonts/
  MEK.woff2
```

Scripts load in this exact order in `index.html`:
`data → abilities → deck → state → render → game → catalog → ui`

---

## Card Contract

Every card instance has these fields (defined in `deck.js/_cardRuntimeDefaults`):

```js
// Identity & base stats (from DEFS, never mutated at runtime)
{ id, key, name, cost, hp, maxHp, atk, art, img, f, tags, ab,
  spell, world, artifact, unique }

// Status flags
{ sleeping, exhausted, feared, burning }

// ATK bonuses (each source tracked separately for clean removal)
{ atkBonus,      // from aura:atk sources (reset + re-applied each applyAuras)
  rageBonus,     // permanent per-attack rage stacks
  squadAtkBonus  // from squad ATK bonus }

// MaxHP bonuses
{ baseMaxHp,        // snapshot of maxHp before aura:maxhp; null = no aura active
  maxHpBonus,       // legacy field (kept for compatibility, not used in logic)
  worldMaxHpBonus,  // bonus from world_maxhp world
  worldMaxHpSet,    // flag: world_maxhp already applied to this card
  squadMaxHpBonus   // from squad maxHP bonus }

// Squad param upgrade  e.g. {heal:2} | {aoe:2} | {pierce:true} | {regen:2}
{ squadParam }
```

**Golden rule:** to reset a card's runtime state, always call `resetCardState(card)`.
Never manually zero out fields — the function is the single source of truth.

---

## Adding a New Card

All cards live in `js/data.js` in the `DEFS` object.

```js
trvlr_024: {
  name: "Traveler #024",
  cost: 2,
  hp:   2,
  atk:  2,
  art:  "🦈",            // emoji fallback until PNG is ready
  img:  "024_Traveler.png", // placed in img/cards/
  f:    "tea",            // faction: "tea" | "jeet"
  tags: ["vanguard", "gtype:szg", "burn"], // abilities via tag system
  ab:   "Vanguard. Burn.",
  // Optional type flags (omit for creatures):
  // spell: true | world: true | artifact: true | unique: true
},
```

Then add the key to `buildDeck()` in `data.js` under the right array:
- `travelers`  — common (×5 copies)
- `legendaries`— 1-of-1 (×1)
- `spells`     — (×2)
- `worlds`     — (×1)
- `artifacts`  — (×1)
- `extra`      — neutral (×1)

---

## Tag System

Tags are strings in `card.tags`. Simple (`"vanguard"`) or with value (`"heal:2"`).
Multi-segment tags like `"aura:maxhp:1"` are parsed correctly by `getTagVal()`.

### getTagVal(card, tagName) → value | null

```js
getTagVal(card, 'heal')       // "heal:2"       → 2
getTagVal(card, 'aura:maxhp') // "aura:maxhp:1" → 1
getTagVal(card, 'gtype')      // "gtype:drg"    → "drg"
getTagVal(card, 'vanguard')   // "vanguard"     → true
getTagVal(card, 'missing')    //                → null
```

### All Tags

**Passive (constant while on field):**

| Tag             | Effect |
|-----------------|--------|
| `vanguard`      | Attacks the turn it enters |
| `provoke`       | All enemy attacks must target this |
| `pierce`        | Ignores Provoke |
| `bushido`       | ALL attacks must target this (overrides Pierce) |
| `invisible`     | Cannot be targeted while allies exist; no counter when attacked |
| `aura:atk:N`    | All allies (except self) get +N ATK |
| `aura:maxhp:N`  | All allies (except self) get +N maxHP |
| `world_maxhp:N` | All allies INCLUDING aura source get +N maxHP (world only) |
| `gtype:xxx`     | Traveler type for squad bonuses (szg/orb/drg/umb/mch/xui) |

**On Enter:**

| Tag           | Effect |
|---------------|--------|
| `enter_aoe:N` | N damage to all enemies when played |

**On Turn Start:**

| Tag              | Who                   | Effect |
|------------------|-----------------------|--------|
| `draw:N`         | world/artifact/unique | Draw N cards |
| `heal:N`         | artifact              | Heal all allies N HP |
| `regen:N`        | creature              | Restore N HP to self |
| `raise:N`        | creature              | Revive top graveyard card at N HP |
| `ess_add:N`      | world/artifact        | Add N Essence |
| `ess_max:N`      | world/artifact        | +N to Essence max permanently |
| `world_maxhp:N`  | world                 | Handled in applyAuras, not triggerAbilities |
| `on_own_death:N` | world                 | Draw N when your creature dies |

**On Attack:**

| Tag             | Effect |
|-----------------|--------|
| `fear`          | Target skips next turn, no counter-attack |
| `burn`          | Target takes 1 dmg each turn start |
| `rage`          | Self gets +1 ATK permanently per attack |
| `draw_attack:N` | Draw N cards |

**On Kill / Death:**

| Tag                   | Effect |
|-----------------------|--------|
| `on_kill_base:N`      | +N HP to own base on kill |
| `on_any_death_base:N` | +N HP to own base on any creature death |
| `on_play_creature:N`  | +N HP to own base when you play a creature |

**Instant (spells):**

| Tag          | Effect |
|--------------|--------|
| `draw:N`     | Draw N cards immediately |
| `revive:full`| Revive last creature from graveyard at full HP |
| `bounce`     | Return all field cards to hands |
| `ess_add:N`  | +N Essence this turn |
| `ess_max:N`  | +N to Essence max |
| `salvage`    | Return last graveyard card to hand (no field play) |

**Active (button/click):**

| Tag        | Effect |
|------------|--------|
| `aoe:N`    | N damage to all enemies (click card while selected) |
| `heal:N`   | Heal ally N HP + remove debuffs (creature) |
| `sacrifice`| Altar: kill one of your creatures |
| `shard:N`  | N damage to any enemy creature (+1 if Feared), ignores Provoke/Bushido |

---

## Ability System

### getAbilities(card) → [{timing, effect, val, …}]

Parses tags into ability objects. Each has `timing`, `effect`, `val`.

### Timings

| Timing             | When it fires |
|--------------------|---------------|
| `passive`          | Constant (provoke, pierce, invisible, vanguard, aura, gtype) |
| `_manual`          | Handled directly in game.js, not via triggerAbilities |
| `instant`          | On play (spells) |
| `on_enter`         | When played to field |
| `on_turn`          | Start of owner's turn |
| `on_attack`        | On each attack |
| `on_kill`          | When this card kills an enemy |
| `on_any_death`     | When any creature dies |
| `on_play_creature` | When you play any creature |
| `active`           | Manual player activation |
| `on_own_death`     | When a creature of the world's owner dies |

### triggerAbilities(card, timing, ctx)

Called from game.js. Filters abilities by timing and executes effects.
`ctx` = `{target}` for attacks/heals.

Key call sites:
- `triggerAbilities(card, 'instant')` — spell played
- `triggerAbilities(card, 'on_turn')` — world/artifacts/field creatures at turn start
- `triggerAbilities(card, 'on_enter')` — creature enters field
- `triggerAbilities(card, 'on_attack', {target})` — after attack
- `triggerAbilities(card, 'on_play_creature')` — after any creature played

---

## Aura System

### applyAuras(faction)

Called after any field change. Handles `aura:atk`, `aura:maxhp`, and `world_maxhp`.

- `aura:atk` — resets all `atkBonus` to 0, then re-adds from each source
- `aura:maxhp` — resets to `baseMaxHp + squadMaxHpBonus + worldMaxHpBonus`, then each source adds val to all others
- `world_maxhp` — applied separately, buffs ALL including the source card itself

**MaxHP stacking:** All three bonus types (aura:maxhp, world_maxhp, squadMaxHpBonus) stack cleanly.
Each is tracked in its own field and is removed independently when its source dies/leaves.

---

## Squad System

### SQUAD_DEFS (in game.js)

```js
const SQUAD_DEFS = [
  {gtype:'drg', count:3, effect:'maxhp', val:1},
  {gtype:'mch', count:3, effect:'atk',   val:1},
  {gtype:'orb', count:3, effect:'param', param:'heal',   val:2},
  {gtype:'umb', count:3, effect:'param', param:'aoe',    val:2},
  {gtype:'szg', count:3, effect:'param', param:'pierce', val:true},
  {gtype:'xui', count:3, effect:'param', param:'regen',  val:2},
];
```

### checkSquadBonuses(faction)

Called after every field change, AFTER applyAuras.
Squad bonuses are per-faction only — a Jeet Szarg does not count toward Tea's squad.
Bonus is lost immediately when the squad drops below 3 members.

---

## Game State (G)

```js
G = {
  turn: 'tea' | 'jeet',
  turnNum: Number,
  phase: 'action' | 'selectTarget' | 'healTarget' | 'burn' |
         'sacrificeTarget' | 'shardTarget' | 'mulligan',
  sel: cardId | null,
  previewCard: cardId | null,
  logs: [{msg, cls}],
  playerFaction: 'tea' | 'jeet' | null,  // null = hotseat
  tea:  PlayerState,
  jeet: PlayerState,
  _pendingFlash: [{who, type}],
}

PlayerState = {
  hp, maxHp,
  ess, essMax,
  hand:      [Card],
  field:     [Card],
  deck:      [Card],
  grave:     [Card],   // creatures only — can be revived
  void:      [Card],   // spells, replaced worlds, burned — gone forever
  world:     Card | null,
  artifacts: [Card],
  extraDraw: Number,   // bonus cards at draw phase
  burned:    Boolean,  // one burn per turn
  _auraAtkLog: cardId | null,  // flag: log ATK aura on this card's enter
  _auraMaxLog: cardId | null,  // flag: log maxHP aura on this card's enter
}
```

---

## Game Phases

| Phase             | Description |
|-------------------|-------------|
| `mulligan`        | Pre-game mulligan screen |
| `action`          | Normal turn |
| `selectTarget`    | Creature selected, waiting for attack target |
| `healTarget`      | Healer selected, waiting for ally (heal) or enemy (attack) |
| `burn`            | Waiting for hand card to burn |
| `sacrificeTarget` | Altar activated, waiting for creature to sacrifice |
| `shardTarget`     | Shard activated, waiting for enemy creature |

---

## Graveyard Rules

- Creatures → `grave` (revivable by Revive/Raise/Salvage)
- Spells → `void` after cast (voided: true)
- Replaced worlds → `void`
- Burned cards → `void`
- Cards with `voided: true` are excluded from all graveyard abilities

---

## Planned Features (Roadmap)

- [ ] 60 NFT Traveler cards with unique art (img/cards/NNN_Traveler.png)
- [ ] AI opponent (single-player mode — playerFaction will be set)
- [ ] Online multiplayer
- [ ] Deckbuilder screen (NFT ownership gating)
- [ ] Sound effects
- [ ] Web3: NFT ownership verification
