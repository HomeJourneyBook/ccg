// ============================================================
//  render.js — DOM rendering
// ============================================================

const TAG_ICONS = {
  fear:    `<img src="img/ico_fear.png"    style="width:60%;height:60%;">`,
  pierce:  `<img src="img/ico_pierce.png"  style="width:60%;height:60%;">`,
  regen:   `<img src="img/ico_regen.png"   style="width:60%;height:60%;">`,
  burn:    `<img src="img/ico_burn.png"    style="width:60%;height:60%;">`,
  rage:    `<img src="img/ico_rage.png"    style="width:60%;height:60%;">`,
  provoke: `<img src="img/ico_provoke.png" style="width:60%;height:60%;">`,
};

function _tagIconsHtml(card) {
  const icons = (card.tags || [])
    .map(t => t.split(':')[0])
    .filter(t => TAG_ICONS[t])
    .map(t => `<div class="card-tag-icon">${TAG_ICONS[t]}</div>`)
    .join('');
  return icons ? `<div class="card-tag-icons">${icons}</div>` : '';
}

function getTypeDotImg(card) {
  if (card.world)    return 'img/type_world.png';
  if (card.unique)   return 'img/type_unique.png';
  if (card.artifact) return 'img/type_artifact.png';
  if (card.spell)    return 'img/type_spell.png';
  return 'img/type_creature.png';
}

// ── Turn colour update ────────────────────────────────────────
function updateTurnColors() {
  if (!G) return;
  const isTea    = G.turn === 'tea';
  const green    = '#2d8b3a', greenDim = '#1b641b55';
  const pink     = '#d83c88', pinkDim  = '#d83c8855';
  const set      = (id, col) => { const el = document.getElementById(id); if (el) el.style.borderColor = col; };
  set('playerFieldZone', isTea ? green   : pink);
  set('playerStats',     isTea ? green   : pink);
  set('oppFieldZone',    isTea ? pinkDim : greenDim);
  set('oppStats',        isTea ? pinkDim : greenDim);
  set('oppHandZone',     isTea ? pinkDim : greenDim);
}

// ── Main render ───────────────────────────────────────────────
function render() {
  updateTurnColors();
  document.getElementById('turnNum').textContent    = G.turnNum;
  document.getElementById('turnPlayer').textContent = G.turn.toUpperCase();

  ['tea', 'jeet'].forEach(f => {
    const p = G[f];
    document.getElementById(f + 'Hp').textContent     = p.hp;
    document.getElementById(f + 'Ess').textContent    = p.ess;
    document.getElementById(f + 'EssMax').textContent = p.essMax;
    const hc = document.getElementById(f + 'HandCount');    if (hc) hc.textContent = p.hand.length;
    const dc = document.getElementById(f + 'DeckCountStat');if (dc) dc.textContent = p.deck.length;
    const gc = document.getElementById(f + 'GraveCountStat');if(gc) gc.textContent = p.grave.length;
    const gb = document.getElementById(f + 'GraveBadge');   if (gb) gb.textContent = p.grave.length;
    const db = document.getElementById(f + 'DeckBadge');    if (db) db.textContent = p.deck.length;
  });

  rZone('teaField',  G.tea.field,  'field');
  rZone('jeetField', G.jeet.field, 'field');

  if (G.turn === 'tea') {
    document.getElementById('teaHand').className = 'hand';
    rZone('teaHand',  G.tea.hand,  'hand');
    rHiddenHand('jeetHand', G.jeet.hand, 'jeet');
  } else {
    document.getElementById('jeetHand').className = 'hand';
    rZone('jeetHand', G.jeet.hand, 'hand');
    rHiddenHand('teaHand',  G.tea.hand,  'tea');
  }

  rPersist('teaPersist',  G.tea);
  reorderZones();
  rPersist('jeetPersist', G.jeet);

  ['teaHand', 'jeetHand'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.zIndex = G.previewCard ? '500' : '50';
  });

  const actF   = G.turn;
  const inactF = G.turn === 'tea' ? 'jeet' : 'tea';
  const s = (id, v) => { const el = document.getElementById(id); if (el) el.style.display = v; };
  s(inactF + 'SidebarBtns', 'none');
  s(actF   + 'SidebarBtns', 'flex');
  s(inactF + 'BottomBar',   'none');
  s(actF   + 'BottomBar',   'flex');

  updateMulliganBtn(G.turn);

  const oppZoneEl = document.getElementById('oppStats');
  if (oppZoneEl) {
    const canHit = (G.phase === 'selectTarget' || G.phase === 'healTarget') && G.sel && canAttackBase();
    oppZoneEl.classList.toggle('base-targetable', !!canHit);
  }
  const playerStatsEl = document.getElementById('playerStats');
  if (playerStatsEl) playerStatsEl.classList.remove('base-targetable');

  const sfx   = G.turn === 'tea' ? 'T' : 'J';
  const hitEl = document.getElementById('hitBase' + sfx);
  if (hitEl) hitEl.style.display = 'none';

  const hints = {
    action:          '',
    selectTarget:    'Select enemy or tap their base.',
    burn:            'Select a card from your hand to burn.',
    healTarget:      'Select ally to heal or enemy to attack.',
    shardTarget:     'Select an enemy creature.',
    sacrificeTarget: 'Select one of your creatures to sacrifice.',
  };
  const hintEl = document.getElementById('hint' + sfx + '2');
  if (hintEl) hintEl.textContent = hints[G.phase] || '';

  if (typeof _applyPendingFlash === 'function') _applyPendingFlash();

  requestAnimationFrame(() => { adjustHandOverlap(); requestAnimationFrame(adjustHandOverlap); });
}

// ── Field card (compact) ──────────────────────────────────────
function mkSmallEl(card) {
  const d = document.createElement('div');
  d.className  = `card-small ${card.f}-card`;
  d.dataset.id = card.id;

  if (card.id === G.sel) d.classList.add('selected');
  if (card.sleeping)     d.classList.add('sleeping');
  if (card.exhausted)    d.classList.add('exhausted');
  if (card.feared)       d.classList.add('feared');
  if (card.burning)      d.classList.add('burning');

  if (hasTag(card, 'invisible')) {
    const inv = document.createElement('span');
    inv.className = 'tag-label'; inv.textContent = 'Invis';
    d.appendChild(inv);
  }

  const opp        = G.turn === 'tea' ? 'jeet' : 'tea';
  const attCard    = G.sel ? findC(G.sel) : null;
  const oppTargets = getTargetableCards(G[opp].field, attCard);

  if (G.phase === 'sacrificeTarget' && card.f === G.turn && !card.spell && !card.world && !card.artifact)
    d.classList.add('targetable');
  if ((G.phase === 'selectTarget' || G.phase === 'healTarget') && card.f !== G.turn && oppTargets.includes(card.id))
    d.classList.add('targetable');
  if (G.phase === 'shardTarget' && card.f !== G.turn && !card.spell && !card.world && !card.artifact)
    d.classList.add('targetable');
  if (G.phase === 'healTarget' && card.f === G.turn && !card.spell && !card.world && !card.artifact && card.hp < card.maxHp)
    d.classList.add('healable');

  const isSW = card.spell || card.world || card.artifact;
  d.innerHTML = `
    <div class="card-small-cost">${card.cost}</div>
    <div class="card-type-dot" style="background-image:url('${getTypeDotImg(card)}');background-size:contain;background-repeat:no-repeat;background-position:center;"></div>
    ${_tagIconsHtml(card)}
    ${card.burning ? `<div class="card-small-burning"><img src="img/ef_burn.png" style="width:100%;height:100%;object-fit:contain;"></div>` : ''}
    ${card.feared  ? `<div class="card-small-feared"><img src="img/ico_fear.png" style="width:100%;height:100%;object-fit:contain;"></div>` : ''}
    <div class="card-small-art">${card.img ? `<img src="img/cards/${card.img}" style="width:100%;height:100%;object-fit:cover;display:block;">` : card.art}</div>
    <div class="card-small-name-box"><div class="card-small-name">${card.name}</div></div>
    ${!isSW
      ? `<div class="card-small-stats">
           <div class="card-small-hp-box"><span class="card-small-hp">${card.hp}</span></div>
           <img src="img/chel.png" class="card-stats-icon">
           <div class="card-small-atk-box"><span class="card-small-atk">${card.atk+(card.atkBonus||0)+(card.rageBonus||0)+(card.squadAtkBonus||0)}</span></div>
         </div>`
      : `<div class="card-small-stats" style="justify-content:center;"><img src="img/chel.png" class="card-stats-icon"></div>`
    }`;

  // AOE popup — selected non-exhausted AOE creature shows action button
  if (card.id === G.sel && card.f === G.turn && !card.exhausted && !card.sleeping && !card.feared) {
    if (hasTag(card, 'aoe') && !card.unique) {
      const pop = document.createElement('div');
      pop.className = 'field-ability-popup';
      const btn = document.createElement('button');
      btn.className = 'fab-btn umbasir';
      btn.title     = 'AOE Attack';
      btn.onclick   = e => { e.stopPropagation(); doActiveAoe(card); };
      pop.appendChild(btn);
      d.appendChild(pop);
    }
  }

  d.addEventListener('click', () => onClick(card, 'field'));
  return d;
}

// ── Hand/preview card (full size) ─────────────────────────────
function mkEl(card, zone) {
  const d = document.createElement('div');
  d.className      = `card ${card.f}-card`;
  d.style.flexShrink = '0';
  d.dataset.id     = card.id;

  if (card.id === G.sel) d.classList.add('selected');
  if (card.burning)      d.classList.add('burning');
  if (card.sleeping)     d.classList.add('sleeping');
  if (card.exhausted)    d.classList.add('exhausted');
  if (card.feared)       d.classList.add('feared');

  if (hasTag(card, 'invisible')) {
    const inv = document.createElement('span');
    inv.className = 'tag-label'; inv.textContent = '👻 Invis';
    d.appendChild(inv);
  }

  if (G.phase === 'sacrificeTarget' && card.f === G.turn && zone === 'field' && !card.spell && !card.world && !card.artifact)
    d.classList.add('targetable');
  if (G.phase === 'shardTarget' && card.f !== G.turn && zone === 'field' && !card.spell && !card.world && !card.artifact)
    d.classList.add('targetable');
  if (G.phase === 'selectTarget' && card.f !== G.turn && zone === 'field') {
    if (getTargetableCards(G[card.f].field, G.sel ? findC(G.sel) : null).includes(card.id))
      d.classList.add('targetable');
  }
  if (G.phase === 'healTarget' && card.f === G.turn && zone === 'field' && !card.spell && !card.world && !card.artifact && card.hp < card.maxHp)
    d.classList.add('healable');
  if (G.phase === 'healTarget' && card.f !== G.turn && zone === 'field') {
    if (getTargetableCards(G[card.f].field, G.sel ? findC(G.sel) : null).includes(card.id))
      d.classList.add('targetable');
  }

  const isSW = card.spell || card.world || card.artifact;

  // World cards: background image via CSS class, text overlay
  if (card.world) {
    d.classList.add('world-card');
    if (card.img) d.classList.add('world-img-' + card.img.replace('.', '_'));
    d.innerHTML = `
      <div class="card-cost">${card.cost}</div>
      <div class="card-type-dot" style="background-image:url('${getTypeDotImg(card)}');background-size:contain;background-repeat:no-repeat;background-position:center;"></div>
      <div class="card-name-box"><div class="card-name">${card.name}</div></div>
      <div class="card-ability-box"><div class="card-ability">${card.ab}</div></div>`;
  } else {
    d.innerHTML = `
      <div class="card-cost">${card.cost}</div>
      <div class="card-type-dot" style="background-image:url('${getTypeDotImg(card)}');background-size:contain;background-repeat:no-repeat;background-position:center;"></div>
      ${card.burning ? '<div class="burning-icon"></div>' : ''}
      <div class="card-art">${card.img ? `<img src="img/cards/${card.img}" style="width:100%;height:100%;object-fit:cover;display:block;">` : card.art}</div>
      ${_tagIconsHtml(card)}
      <div class="card-name-box"><div class="card-name">${card.name}</div></div>
      ${!isSW
        ? `<div class="card-stats">
             <div class="card-hp-box"><span class="card-hp"><img src="./img/heart.png" class="stat-icon">${card.maxHp}</span></div>
             <img src="img/chel.png" class="card-stats-icon">
             <div class="card-atk-box"><span class="card-atk"><img src="./img/attack.png" class="stat-icon">${card.atk+(card.atkBonus||0)+(card.rageBonus||0)+(card.squadAtkBonus||0)}</span></div>
           </div>`
        : `<div class="card-stats" style="justify-content:center;"><img src="img/chel.png" class="card-stats-icon"></div>`}
      <div class="card-ability-box"><div class="card-ability">${card.ab}</div></div>`;
  }

  // Play / Burn popup when previewed in hand
  if (card.id === G.previewCard && zone === 'hand') {
    d.classList.add('previewed');
    d.style.zIndex = '';
    const popup = document.createElement('div');
    popup.className = 'card-actions-popup';
    const cur = G[G.turn];
    if (cur.ess >= card.cost) {
      const playBtn = document.createElement('button');
      playBtn.className = 'cap-btn play';
      playBtn.onclick   = e => { e.stopPropagation(); G.previewCard = null; doPlay(card); };
      popup.appendChild(playBtn);
    }
    if (!cur.burned) {
      const burnBtn = document.createElement('button');
      burnBtn.className = 'cap-btn burn';
      burnBtn.onclick   = e => { e.stopPropagation(); G.previewCard = null; doBurnCard(card); };
      popup.appendChild(burnBtn);
    }
    d.appendChild(popup);
  }

  d.addEventListener('click', e => { e.stopPropagation(); onClick(card, zone); });
  return d;
}

// ── Zone renderers ────────────────────────────────────────────
function rZone(id, cards, zone) {
  const el = document.getElementById(id);

  if (zone === 'field') {
    // Animate dying cards before removing
    const dying = [];
    el.querySelectorAll('.card-small').forEach(cardEl => {
      if (!cards.find(c => String(c.id) === cardEl.dataset.id)) dying.push(cardEl);
    });
    dying.forEach(cardEl => { cardEl.classList.add('dying'); cardEl.style.pointerEvents = 'none'; });
    if (dying.length > 0)
      setTimeout(() => dying.forEach(cardEl => { if (cardEl.parentElement) cardEl.remove(); }), 400);

    const existingMap = {};
    el.querySelectorAll('.card-small:not(.dying)').forEach(cardEl => { existingMap[cardEl.dataset.id] = cardEl; });
    cards.forEach(c => {
      if (existingMap[String(c.id)]) {
        existingMap[String(c.id)].replaceWith(mkSmallEl(c));
      } else {
        const cardEl = mkSmallEl(c);
        cardEl.classList.add('entering');
        el.appendChild(cardEl);
      }
    });
    return;
  }

  // Hand: full rebuild
  el.innerHTML = '';
  cards.forEach(c => el.appendChild(mkEl(c, zone)));
}

function rHiddenHand(id, cards, faction) {
  const el = document.getElementById(id);
  el.innerHTML = ''; el.className = 'hand-mini';
  cards.forEach(() => {
    const d = document.createElement('div');
    d.className = `card-mini ${faction}-mini`;
    d.style.backgroundImage = "url('img/runaha.png')";
    d.style.backgroundSize = 'cover'; d.style.backgroundPosition = 'bottom';
    el.appendChild(d);
  });
}

function rPersist(id, player) {
  const el  = document.getElementById(id);
  el.innerHTML = '';
  const cls            = player === G.tea ? 'tcp' : 'jcp';
  const isActivePlayer = (player === G.tea ? 'tea' : 'jeet') === G.turn;

  if (player.world) {
    const d = document.createElement('div');
    d.className = `pcard ${cls}`;
    d.textContent = `${player.world.art} ${player.world.name}`;
    d.title = player.world.ab;
    el.appendChild(d);
  }

  player.artifacts.forEach(a => {
    const d = document.createElement('div');
    d.className = `pcard ${cls}`;
    d.textContent = `${a.art} ${a.name}`;
    d.title = a.ab;

    if (!isActivePlayer || a.sleeping || a.exhausted) {
      d.style.opacity = '0.5';
    } else if (hasTag(a, 'shard')) {
      d.classList.add('pcard-active');
      if (G.phase === 'shardTarget') {
        d.style.border = '2px solid #e05050'; d.style.boxShadow = '0 0 8px #e05050'; d.style.borderRadius = '6px';
        d.addEventListener('click', e => { e.stopPropagation(); doShard(a); });
      } else if (G.phase === 'action') {
        d.addEventListener('click', e => { e.stopPropagation(); doShard(a); });
      }
    } else if (hasTag(a, 'sacrifice')) {
      d.classList.add('pcard-active');
      if (G.phase === 'sacrificeTarget') {
        d.style.border = '2px solid #b44fd4'; d.style.boxShadow = '0 0 8px #b44fd4'; d.style.borderRadius = '6px';
        d.addEventListener('click', e => { e.stopPropagation(); G.phase = 'action'; G.sel = null; render(); });
      } else if (G.phase === 'action') {
        d.addEventListener('click', e => {
          e.stopPropagation(); G.phase = 'sacrificeTarget'; G.sel = a.id;
          lg('Altar: select a creature to sacrifice.', 'hint'); render();
        });
      }
    }
    el.appendChild(d);
  });

  if (!player.world && player.artifacts.length === 0) {
    const d = document.createElement('div');
    d.className = 'empty-persist'; d.textContent = 'none';
    el.appendChild(d);
  }
}

// ── Zone reorder (hotseat swap) ───────────────────────────────
function reorderZones() {
  const oppK    = G.turn === 'tea' ? 'jeet' : 'tea';
  const playerK = G.turn;
  const oppP    = G[oppK];
  const playerP = G[playerK];

  const oppStats    = document.getElementById('oppStats');
  const playerStats = document.getElementById('playerStats');
  if (oppStats) {
    oppStats.className = 'stats-bar ' + oppK;
    oppStats.innerHTML = `
      <span class="stat"><img src="./img/hp_${oppK}.png" class="stat-icon"> <span class="stat-val hp-val" id="${oppK}Hp">${oppP.hp}</span></span>
      <span class="player-name ${oppK}">${oppK === 'jeet' ? 'JEET CORE' : 'TAVERN'}</span>
      <span class="stat"><img src="./img/ess.png" class="stat-icon"> <span class="ess-val" id="${oppK}Ess">${oppP.ess}</span>/<span id="${oppK}EssMax">${oppP.essMax}</span></span>`;
    oppStats.onclick = () => onBaseClick(oppK);
  }
  if (playerStats) {
    playerStats.className = 'stats-bar ' + playerK;
    playerStats.innerHTML = `
      <span class="stat"><img src="./img/hp_${playerK}.png" class="stat-icon"> <span class="stat-val hp-val" id="${playerK}Hp">${playerP.hp}</span></span>
      <span class="player-name ${playerK}">${playerK === 'jeet' ? 'JEET CORE' : 'TAVERN'}</span>
      <span class="stat"><img src="./img/ess.png" class="stat-icon"> <span class="ess-val" id="${playerK}Ess">${playerP.ess}</span>/<span id="${playerK}EssMax">${playerP.essMax}</span></span>`;
    playerStats.onclick = () => onBaseClick(playerK);
  }

  const move = (elId, targetId) => {
    const el = document.getElementById(elId), tgt = document.getElementById(targetId);
    if (el && tgt && el.parentElement !== tgt) tgt.appendChild(el);
  };
  if (oppK === 'jeet') {
    move('jeetField','oppFieldZone'); move('jeetPersist','oppFieldZone');
    move('teaField','playerFieldZone'); move('teaPersist','playerFieldZone');
    move('jeetHand','oppHandZone'); move('teaHand','playerHandZone');
  } else {
    move('teaField','oppFieldZone'); move('teaPersist','oppFieldZone');
    move('jeetField','playerFieldZone'); move('jeetPersist','playerFieldZone');
    move('teaHand','oppHandZone'); move('jeetHand','playerHandZone');
  }

  const teaBB  = document.getElementById('teaBottomBar');
  const jeetBB = document.getElementById('jeetBottomBar');
  if (teaBB)  teaBB.style.display  = G.turn === 'tea'  ? 'flex' : 'none';
  if (jeetBB) jeetBB.style.display = G.turn === 'jeet' ? 'flex' : 'none';
}

// ── Hand layout ───────────────────────────────────────────────
function adjustHandOverlap() {
  const isMobile = window.innerWidth <= 600;
  ['teaHand', 'jeetHand'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    if (isMobile) {
      _initCarousel(el);
    } else {
      _applyOverlap(el);
    }
  });
}

// ── Desktop: negative-margin overlap (original behaviour) ─────
function _applyOverlap(el) {
  // Remove any carousel state
  el.classList.remove('carousel-mode');
  _removeCarouselArrows(el);

  const wrap = el.closest('.player-hand-wrap');
  let containerW = wrap ? wrap.getBoundingClientRect().width : el.getBoundingClientRect().width;
  containerW = Math.floor(containerW) - 12;
  if (containerW <= 20) containerW = window.innerWidth - 90 - 24;
  if (containerW <= 20) return;

  const cards = el.querySelectorAll('.card');
  if (cards.length > 0) {
    const cardW = cards[0].getBoundingClientRect().width || parseFloat(getComputedStyle(cards[0]).width) || 118;
    const total = cards.length;
    let margin  = 0;
    if (total > 1) {
      const totalW = cardW * total + (total - 1) * 8;
      if (totalW > containerW) {
        margin = -Math.ceil((totalW - containerW) / (total - 1));
        margin = Math.max(margin, -(cardW - Math.floor(cardW * 0.12)));
      }
    }
    cards.forEach((card, i) => {
      card.style.marginRight   = i === total - 1 ? '0px' : margin + 'px';
      card.style.zIndex        = (!G.previewCard || card.dataset.id !== G.previewCard) ? String(i + 1) : '';
      card.style.flexShrink    = '0';
      card.style.transform     = '';
      card.style.position      = '';
      card.style.opacity       = '';
      card.style.left          = '';
      card.style.bottom        = '';
      card.style.marginLeft    = '';
      card.style.transformOrigin = '';
      card.style.transition    = '';
    });
  }

  // Mini backs (opponent)
  const minis = el.querySelectorAll('.card-mini');
  if (minis.length > 0) {
    const cardW = minis[0].getBoundingClientRect().width || parseFloat(getComputedStyle(minis[0]).width) || 36;
    const total = minis.length;
    let margin  = -8;
    if (total > 1) {
      const needed = cardW * total;
      if (needed > containerW) {
        margin = -Math.floor((needed - containerW) / (total - 1)) - 1;
        margin = Math.max(margin, -(cardW - Math.floor(cardW * 0.12)));
      }
    }
    minis.forEach((card, i) => {
      card.style.marginRight = i === total - 1 ? '0px' : margin + 'px';
      card.style.zIndex      = String(i + 1);
    });
  }
}

// ── Mobile: horizontal carousel with scroll-snap ──────────────
function _initCarousel(el) {
  el.classList.add('carousel-mode');
  // Reset any inline styles left by desktop mode
  el.querySelectorAll('.card').forEach(card => {
    card.style.position      = '';
    card.style.left          = '';
    card.style.bottom        = '';
    card.style.marginLeft    = '';
    card.style.transformOrigin = '';
    card.style.opacity       = '1';
    card.style.flexShrink    = '0';
    card.style.marginRight   = '0';
  });

  // Attach swipe-to-scroll is native with overflow-x:auto + scroll-snap.
  // Arrow buttons remain for tap navigation.
  _ensureCarouselArrows(el);
  _updateCarouselArrows(el);
}

function _ensureCarouselArrows(el) {
  const wrap = el.closest('.player-hand-wrap');
  if (!wrap || wrap.querySelector('.carousel-arrow-l')) return;
  const faction = el.id === 'teaHand' ? 'tea' : 'jeet';

  const arrowL = document.createElement('button');
  arrowL.className   = 'carousel-arrow carousel-arrow-l';
  arrowL.textContent = '‹';
  arrowL.onclick     = e => { e.stopPropagation(); _carouselScrollBy(el, -1); };
  wrap.appendChild(arrowL);

  const arrowR = document.createElement('button');
  arrowR.className   = 'carousel-arrow carousel-arrow-r';
  arrowR.textContent = '›';
  arrowR.onclick     = e => { e.stopPropagation(); _carouselScrollBy(el, 1); };
  wrap.appendChild(arrowR);

  // Update arrows on scroll end
  el.addEventListener('scrollend', () => _updateCarouselArrows(el), { passive: true });
  // fallback for browsers without scrollend
  el.addEventListener('scroll', _debounce(() => _updateCarouselArrows(el), 120), { passive: true });
}

function _removeCarouselArrows(el) {
  const wrap = el.closest('.player-hand-wrap');
  if (!wrap) return;
  wrap.querySelectorAll('.carousel-arrow').forEach(a => a.remove());
}

function _carouselScrollBy(el, dir) {
  const cards = el.querySelectorAll('.card');
  if (cards.length === 0) return;
  const cardW = cards[0].getBoundingClientRect().width || 118;
  el.scrollBy({ left: dir * (cardW + 8), behavior: 'smooth' });
}

function _updateCarouselArrows(el) {
  const wrap = el.closest('.player-hand-wrap');
  if (!wrap) return;
  const arrowL = wrap.querySelector('.carousel-arrow-l');
  const arrowR = wrap.querySelector('.carousel-arrow-r');
  if (!arrowL || !arrowR) return;
  const atStart = el.scrollLeft <= 4;
  const atEnd   = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
  arrowL.style.opacity       = atStart ? '0.2' : '1';
  arrowL.style.pointerEvents = atStart ? 'none' : 'auto';
  arrowR.style.opacity       = atEnd   ? '0.2' : '1';
  arrowR.style.pointerEvents = atEnd   ? 'none' : 'auto';
}

function _debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
