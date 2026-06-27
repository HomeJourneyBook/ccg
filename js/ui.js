// ============================================================
//  ui.js — Screens, navigation, mulligan UI, misc controls
// ============================================================

// ── Asset preloader ───────────────────────────────────────────
function preloadAssets() {
  const images = [
    'img/card_tea.png', 'img/card_jeet.png',
    'img/card_name_bg.png', 'img/card_text_bg.png', 'img/card_stat_bg.png',
    'img/pcard_tea_bg.png', 'img/pcard_jeet_bg.png',
    'img/tag_bg.png', 'img/space_bg.png', 'img/brand.png',
    'img/button_1.png', 'img/button_grav_1.png', 'img/button_mul_1.png',
    'img/deck.png', 'img/runaha.png',
    'img/heart.png', 'img/attack.png', 'img/chel.png', 'img/ess.png',
    'img/hp_tea.png', 'img/hp_jeet.png',
    'img/statbar_tea.png', 'img/statbar_jeet.png',
    'img/type_creature.png', 'img/type_spell.png', 'img/type_world.png',
    'img/type_artifact.png', 'img/type_unique.png',
    'img/ico_fear.png', 'img/ico_pierce.png', 'img/ico_regen.png',
    'img/ico_burn.png', 'img/ico_rage.png', 'img/ico_provoke.png',
    'img/ef_burn.png',
    'img/btn_play.png', 'img/btn_burn.png', 'img/btn_spell.png',
    'img/btn_ready.png', 'img/btn_mulligan.png',
  ];
  if (typeof DEFS !== 'undefined') {
    Object.values(DEFS).forEach(def => { if (def.img) images.push(`img/cards/${def.img}`); });
  }
  images.forEach(src => { const img = new Image(); img.src = src; });
}

// ── Landing / start menu ──────────────────────────────────────
let _expandTimer = null;

function collapseStart() {
  document.getElementById('startMainBtn').classList.remove('hidden');
  document.getElementById('startOptions').classList.add('hidden');
  if (_expandTimer) { clearTimeout(_expandTimer); _expandTimer = null; }
}

function expandStart() {
  document.getElementById('startMainBtn').classList.add('hidden');
  document.getElementById('startOptions').classList.remove('hidden');
  if (_expandTimer) clearTimeout(_expandTimer);
  _expandTimer = setTimeout(collapseStart, 30000); // auto-collapse after 30s
}

// ── Navigation ────────────────────────────────────────────────
function showLanding() {
  document.getElementById('game').style.display = 'none';
  document.getElementById('mulliganScreen').classList.add('hidden');
  document.getElementById('passScreen').classList.add('hidden');
  document.getElementById('winModal').classList.add('hidden');
  document.getElementById('confirmModal').classList.add('hidden');
  initState();
  collapseStart();
  document.getElementById('landing').style.display = 'flex';
}

function showScreen(name) {
  document.getElementById('landing').style.display = 'none';
  document.getElementById(name + 'Screen').classList.add('active');
  if (name === 'catalog') setTimeout(renderCatalog, 0);
}

function hideScreen(name) {
  document.getElementById(name + 'Screen').classList.remove('active');
  document.getElementById('landing').style.display = 'flex';
}

// ── Confirm modal ─────────────────────────────────────────────
function showConfirm(text, btnText, onConfirm) {
  const modal  = document.getElementById('confirmModal');
  modal.querySelector('p').textContent  = text;
  modal.querySelector('h2').textContent = 'ARE YOU SURE?';
  const yesBtn = modal.querySelector('.btn[style*="e05555"]');
  yesBtn.textContent = btnText;
  yesBtn.onclick     = () => { modal.classList.add('hidden'); onConfirm(); };
  modal.classList.remove('hidden');
}

function askMenu()    { showConfirm('Current game will be lost.', 'Yes, Exit',    () => showLanding()); }
function askRestart() { showConfirm('Current game will be lost.', 'Yes, Restart', () => resetGame()); }

// ── Game start / restart ──────────────────────────────────────
// playerFaction: null (hotseat) | 'tea' | 'jeet' (AI/online — coming later)
function startGame(playerFaction = null) {
  document.getElementById('landing').style.display = 'none';
  document.getElementById('game').style.display    = 'flex';
  initState(playerFaction);
  collapseStart();
  setTimeout(() => startMulliganFor('tea'), 50);
}

function resetGame() {
  document.getElementById('winModal').classList.add('hidden');
  document.getElementById('game').style.display    = 'flex';
  document.getElementById('landing').style.display = 'none';
  initState(G.playerFaction); // preserve faction choice on restart
  lg('─ NEW GAME ─', 'trn');
  lg('TEA goes first.', 'imp');
  setTimeout(() => startMulliganFor('tea'), 50);
}

// ── Mulligan screen ───────────────────────────────────────────
function startMulliganFor(faction) {
  G.mulliganTurn = faction;
  const label = faction === 'tea' ? 'TAVERN — YOUR HAND' : 'JEET CORE — YOUR HAND';
  document.getElementById('mulliganTitle').textContent = label;

  // Mulligan count info
  const m = G.mulligan[faction];
  const infoTexts = [
    'Mulligans left: 3',
    'Mulligans left: 2 (next draw: 4 cards)',
    'Mulligans left: 1 (next draw: 3 cards)',
    'No mulligans left',
  ];
  document.getElementById('mulliganInfo').textContent = infoTexts[m.used] || 'No mulligans left';

  // Render starting hand
  const container = document.getElementById('mulliganCards');
  container.innerHTML = '';
  const scale  = window.innerWidth < 600 ? 0.7 : 1;
  const cardH  = window.innerHeight * 0.24;
  const cardW  = cardH * 0.716;
  const negH   = -Math.floor(cardH * (1 - scale));
  const negW   = -Math.floor(cardW * (1 - scale));
  G[faction].hand.forEach(card => {
    const el = mkEl(card, 'hand');
    el.style.cursor        = 'default';
    el.style.pointerEvents = 'none';
    el.style.transform     = `scale(${scale})`;
    el.style.transformOrigin = 'top left';
    el.style.marginRight   = negW + 'px';
    el.style.marginBottom  = negH + 'px';
    container.appendChild(el);
  });

  document.getElementById('passScreen').classList.add('hidden');
  document.getElementById('mulliganScreen').classList.remove('hidden');

  // Disable mulligan button if used up
  const mulliganBtn = document.querySelector('#mulliganScreen .btn[onclick="doMulliganPhase()"]');
  if (mulliganBtn) {
    const spent = m.used >= 3;
    mulliganBtn.disabled      = spent;
    mulliganBtn.style.opacity = spent ? '0.3' : '1';
    mulliganBtn.style.cursor  = spent ? 'not-allowed' : 'pointer';
  }
}

function doMulliganPhase() {
  doMulligan(G.mulliganTurn);
  startMulliganFor(G.mulliganTurn);
}

function readyFromMulligan() {
  document.getElementById('mulliganScreen').classList.add('hidden');
  if (G.mulliganTurn === 'tea') {
    // Hotseat: pass device to player 2
    document.getElementById('passTitle').textContent = 'PASS THE DEVICE';
    document.getElementById('passText').textContent  = 'Hand the device to Player 2 — Jeet Core.';
    document.getElementById('passScreen').classList.remove('hidden');
  } else {
    // Both players done — start game
    G.phase         = 'action';
    G.mulliganTurn  = null;
    render();
    requestAnimationFrame(adjustHandOverlap);
  }
}

// Called from the "Ready" button on the pass screen (Player 2 takes device)
function startJeetMulligan() {
  document.getElementById('passScreen').classList.add('hidden');
  startMulliganFor('jeet');
}

// ── Win screen ────────────────────────────────────────────────
function showWin(winner) {
  const lore = {
    tea:  'The Tavern stands. The Great Return draws closer.',
    jeet: 'Jeet consumes all. The cycle breaks.',
  };
  document.getElementById('winTitle').textContent = winner.toUpperCase() + ' WINS!';
  document.getElementById('winText').textContent  = lore[winner] || '';
  document.getElementById('winModal').classList.remove('hidden');
}

// ── Mulligan button (in-game, turn 1 only) ────────────────────
function updateMulliganBtn(faction) {
  const sfx = faction === 'tea' ? 'T' : 'J';
  const btn  = document.getElementById('mulliganBtn' + sfx);
  if (!btn) return;
  // Mulligan button is hidden after turn 1 — always hide here
  btn.style.display = 'none';
  const placeholder = document.getElementById('deckPlaceholder' + sfx);
  if (placeholder) placeholder.style.display = 'block';
}

// ── Burn shortcut ─────────────────────────────────────────────
function startBurn() {
  const cur = G[G.turn];
  if (cur.burned) { lg('Already burned a card this turn!', 'dmg'); return; }
  G.phase = 'burn';
  lg('Select a card from your HAND to burn.', 'hint');
  render();
}

// ── Log panel ─────────────────────────────────────────────────
function toggleLog() {
  document.getElementById('logPanel').classList.toggle('open');
}

// ── Hamburger menu ────────────────────────────────────────────
function toggleHamburger() {
  document.getElementById('hamburgerBtn').classList.toggle('open');
  document.getElementById('hamburgerMenu').classList.toggle('open');
}

document.addEventListener('click', e => {
  const btn  = document.getElementById('hamburgerBtn');
  const menu = document.getElementById('hamburgerMenu');
  if (menu && btn && !btn.contains(e.target) && !menu.contains(e.target)) {
    btn.classList.remove('open');
    menu.classList.remove('open');
  }
});

window.addEventListener('resize', adjustHandOverlap);

// ── Boot ──────────────────────────────────────────────────────
preloadAssets();
initState();
lg('─ Game Start ─', 'trn');
lg('TEA goes first. Good luck!', 'imp');
