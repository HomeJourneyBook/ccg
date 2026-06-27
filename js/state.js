// ============================================================
//  state.js — Game state (G), init, and shared helpers
// ============================================================

let G = {};

// ── Player factory ────────────────────────────────────────────
function newPlayer(f) {
  const keys = buildDeck(f);
  return {
    hp: 20, maxHp: 20,
    ess: 1, essMax: 1,
    hand:      keys.splice(0, 5).map(k => mkCard(k)),
    field:     [],
    deck:      keys.map(k => mkCard(k)),
    grave:     [],   // creatures only — can be revived
    void:      [],   // spells, replaced worlds, burned, shard-killed — gone forever
    world:     null,
    artifacts: [],
    extraDraw: 0,    // bonus cards drawn at turn start
    burned:    false,// one burn per turn
    // Internal flags for aura log-on-enter (cleared after logging)
    _auraAtkLog: null,
    _auraMaxLog: null,
  };
}

// ── State initialiser ─────────────────────────────────────────
// playerFaction: 'tea' | 'jeet' | null (null = hotseat, both sides swap)
// In hotseat mode playerFaction is unused; set when AI/online mode lands.
function initState(playerFaction = null) {
  UID = 0;
  G = {
    turn:    'tea',
    turnNum: 1,
    phase:   'mulligan',
    sel:     null,
    previewCard: null,
    logs:    [],

    // Hotseat: null (UI swaps each turn).
    // AI / Online: 'tea' or 'jeet' — the human player's fixed side.
    playerFaction,

    mulligan:     { tea: { used: 0 }, jeet: { used: 0 } },
    mulliganTurn: 'tea',
    jeetFirstTurn: true,

    tea:  newPlayer('tea'),
    jeet: newPlayer('jeet'),

    _pendingFlash: [],
  };
}

// ── Logging ───────────────────────────────────────────────────
function lg(msg, cls = '') {
  if (cls === 'hint') { hint(msg); return; }
  G.logs.push({ msg, cls });
  const el = document.getElementById('log');
  if (el) {
    el.innerHTML = G.logs.map(e => `<div class="le ${e.cls}">${e.msg}</div>`).join('');
    el.scrollTop = el.scrollHeight;
  }
}

function hint(msg) {
  const oppK = G.turn === 'tea' ? 'jeet' : 'tea';
  // Show in the active player's comment bar
  ['hintT2', 'hintJ2'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const bar = el.closest('.bottom-bar');
    if (bar && bar.style.display !== 'none') el.textContent = msg;
  });
}

// ── Card lookup ───────────────────────────────────────────────
// Searches hand, field, grave, artifacts, and world for both factions.
function findC(id) {
  for (const f of ['tea', 'jeet']) {
    const p = G[f];
    // Flat zones
    for (const arr of [p.hand, p.field, p.grave, p.artifacts]) {
      const c = arr.find(x => x.id === id);
      if (c) return c;
    }
    // Singleton zones
    if (p.world && p.world.id === id) return p.world;
  }
  return null;
}

// ── Card reset ────────────────────────────────────────────────
// Thin wrapper kept for backward compatibility with any inline call sites.
// Prefer resetCardState(card) directly.
function resetC(card) { resetCardState(card); }
