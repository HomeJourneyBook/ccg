// ============================================================
//  catalog.js — Card catalog screen: filter, sort, detail view
// ============================================================

// ── Helpers ───────────────────────────────────────────────────
function getCardType(def) {
  if (def.unique)   return 'unique';
  if (def.spell)    return 'spell';
  if (def.world)    return 'world';
  if (def.artifact) return 'artifact';
  return 'creature';
}

// ── Filter / sort state ───────────────────────────────────────
const catalogFilters = { faction: 'all', type: 'all', sort: 'name' };

function setFilter(key, val, btn) {
  catalogFilters[key] = val;
  btn.parentElement.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderCatalog();
}

function setSort(val, btn) {
  catalogFilters.sort = val;
  btn.parentElement.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderCatalog();
}

// ── Main render ───────────────────────────────────────────────
function renderCatalog() {
  const grid   = document.getElementById('catalogGrid');
  const search = (document.getElementById('catalogSearch')?.value || '').toLowerCase();
  if (!grid) return;

  let entries = Object.entries(DEFS).filter(([, def]) => {
    if (catalogFilters.faction !== 'all' && def.f !== catalogFilters.faction) return false;
    const type = getCardType(def);
    if (catalogFilters.type !== 'all' && type !== catalogFilters.type) return false;
    if (search && !def.name.toLowerCase().includes(search) && !def.ab.toLowerCase().includes(search)) return false;
    return true;
  });

  entries.sort(([, a], [, b]) => {
    switch (catalogFilters.sort) {
      case 'cost': return a.cost - b.cost;
      case 'hp':   return b.hp - a.hp;
      case 'atk':  return b.atk - a.atk;
      default:     return a.name.localeCompare(b.name);
    }
  });

  document.getElementById('catalogCount').textContent = `${entries.length} cards`;
  grid.innerHTML = '';
  entries.forEach(([, def]) => grid.appendChild(_makeCatalogCard(def)));
}

// Build a single catalog card element
function _makeCatalogCard(def) {
  const isSW  = def.spell || def.world || def.artifact;
  const div   = document.createElement('div');
  div.className = `card cat-card ${def.f === 'tea' ? 'tea-card' : 'jeet-card'}`;
  div.onclick   = () => openCardDetail(def);

  if (def.world) {
    // World: art as CSS background (same pattern as in-game cards)
    div.classList.add('world-card');
    if (def.img) div.classList.add('world-img-' + def.img.replace('.', '_'));
    div.innerHTML = `
      <div class="card-cost">${def.cost}</div>
      <div class="card-type-dot" style="background-image:url('${getTypeDotImg(def)}');background-size:contain;background-repeat:no-repeat;background-position:center;"></div>
      <div class="card-name-box"><div class="card-name">${def.name}</div></div>
      <div class="card-ability-box"><div class="card-ability">${def.ab || ''}</div></div>`;
    return div;
  }

  div.innerHTML = `
    <div class="card-cost">${def.cost}</div>
    <div class="card-type-dot" style="background-image:url('${getTypeDotImg(def)}');background-size:contain;background-repeat:no-repeat;background-position:center;"></div>
    <div class="card-art">${def.img ? `<img src="img/cards/${def.img}" style="width:100%;height:100%;object-fit:cover;display:block;">` : def.art}</div>
    ${_tagIconsHtml(def)}
    <div class="card-name-box"><div class="card-name">${def.name}</div></div>
    ${!isSW
      ? `<div class="card-stats">
           <div class="card-hp-box"><span class="card-hp"><img src="./img/heart.png" class="stat-icon">${def.hp}</span></div>
           <img src="img/chel.png" class="card-stats-icon">
           <div class="card-atk-box"><span class="card-atk"><img src="./img/attack.png" class="stat-icon">${def.atk}</span></div>
         </div>`
      : `<div class="card-stats" style="justify-content:center;"><img src="img/chel.png" class="card-stats-icon"></div>`}
    <div class="card-ability-box"><div class="card-ability">${def.ab || ''}</div></div>`;
  return div;
}

// ── Card detail modal ─────────────────────────────────────────
function openCardDetail(def) {
  const overlay = document.getElementById('cardDetailOverlay');
  const box     = document.getElementById('cardDetailBox');
  box.className = `card-detail ${def.f === 'tea' ? 'tea-detail' : 'jeet-detail'}`;

  const cdArt = document.getElementById('cdArt');
  cdArt.innerHTML = def.img
    ? `<img src="img/cards/${def.img}" style="width:100%;height:100%;object-fit:cover;display:block;">`
    : def.art;

  document.getElementById('cdName').textContent = def.name;
  document.getElementById('cdCost').textContent = `${def.cost} Essence`;

  const isSW = def.spell || def.world || def.artifact;
  document.getElementById('cdStats').innerHTML = isSW ? ''
    : `<span class="cat-card-hp">❤ ${def.hp} HP</span><span class="cat-card-atk">⚔ ${def.atk} ATK</span>`;

  document.getElementById('cdAb').textContent = def.ab || '—';

  const filteredTags = (def.tags || []).filter(t => !['spell','world','artifact','unique'].includes(t));
  document.getElementById('cdTags').innerHTML = filteredTags
    .map(t => `<span class="tag ${t.split(':')[0]}">${t.toUpperCase()}</span>`)
    .join('');

  overlay.style.display = 'flex';
}

function closeCardDetail(e) {
  if (e && e.target !== document.getElementById('cardDetailOverlay')
        && !e.target.classList.contains('card-detail-close')) return;
  document.getElementById('cardDetailOverlay').style.display = 'none';
}
