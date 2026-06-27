// ============================================================
//  abilities.js — Tag parsing & ability execution
//
//  getTagVal(card, tagName)  → value or null
//  hasTag(card, tagName)     → boolean
//  getAbilities(card)        → [{timing, effect, val, …}]
//  triggerAbilities(card, timing, ctx)
//  applyAuras(faction)       → recalculates all ATK/maxHP auras
// ============================================================

// ── Tag helpers ───────────────────────────────────────────────

// Returns the value after tagName in card.tags, or null if absent.
// Examples:
//   getTagVal(card,'heal')        on "heal:2"       → 2
//   getTagVal(card,'aura:maxhp')  on "aura:maxhp:1" → 1
//   getTagVal(card,'vanguard')    on "vanguard"      → true
function getTagVal(card, tagName) {
  const t = (card.tags || []).find(t => t === tagName || t.startsWith(tagName + ':'));
  if (!t) return null;
  const rest = t.slice(tagName.length);
  if (!rest) return true;
  const valStr = rest.startsWith(':') ? rest.slice(1) : rest;
  const num = parseInt(valStr);
  return isNaN(num) ? valStr : num;
}

function hasTag(card, tagName) { return getTagVal(card, tagName) !== null; }

// ── Ability parser ────────────────────────────────────────────
// Converts a card's tags into a flat list of ability objects.
// Each object has: { timing, effect, val?, … }
function getAbilities(card) {
  const ab = [];

  for (const tag of (card.tags || [])) {
    const parts = tag.split(':');
    const name  = parts[0];
    const val   = parts.length > 1 ? (parseInt(parts[1]) || parts[1]) : 1;

    switch (name) {
      // ── Passive ──────────────────────────────────────────
      case 'vanguard':  ab.push({ timing:'passive', effect:'vanguard' }); break;
      case 'provoke':   ab.push({ timing:'passive', effect:'provoke' });  break;
      case 'pierce':    ab.push({ timing:'passive', effect:'pierce' });   break;
      case 'bushido':   ab.push({ timing:'passive', effect:'bushido' });  break;
      case 'invisible': ab.push({ timing:'passive', effect:'invisible' });break;

      // ── Aura (passive, handled by applyAuras each turn) ──
      case 'aura': {
        const auraType = parts[1];
        const auraVal  = parseInt(parts[2]) || 1;
        if (auraType === 'atk') {
          ab.push({ timing:'passive', effect:'aura', auraType:'atk', val:auraVal });
        } else if (auraType === 'maxhp') {
          // Applied via applyAuras() — not through triggerAbilities to avoid double-apply
          ab.push({ timing:'_manual', effect:'aura', auraType:'maxhp', val:auraVal });
        }
        break;
      }

      // ── On enter ─────────────────────────────────────────
      case 'enter_aoe': ab.push({ timing:'on_enter', effect:'aoe', val }); break;

      // ── On turn start ─────────────────────────────────────
      case 'regen':       ab.push({ timing:'on_turn', effect:'hp_add', val, self:true }); break;
      case 'raise':       ab.push({ timing:'on_turn', effect:'raise', val });             break;
      case 'world_maxhp': ab.push({ timing:'on_turn', effect:'world_maxhp', val });       break;
      case 'on_own_death':ab.push({ timing:'on_own_death', effect:'draw', val });         break;

      case 'draw':
        if (card.spell)                      ab.push({ timing:'instant',   effect:'draw', val });
        else if (card.world || card.artifact) ab.push({ timing:'on_turn',   effect:'draw', val });
        else if (card.unique)                 ab.push({ timing:'on_turn',   effect:'draw', val });
        else                                  ab.push({ timing:'on_attack', effect:'draw', val });
        break;

      case 'heal':
        if (card.artifact || card.world) ab.push({ timing:'on_turn',  effect:'hp_add', val, target:'all' });
        else                             ab.push({ timing:'active',   effect:'hp_add', val });
        break;

      case 'ess_max':
        if (card.world || card.artifact) ab.push({ timing:'on_turn',  effect:'ess_max', val });
        else                             ab.push({ timing:'instant',  effect:'ess_max', val });
        break;

      case 'ess_add':
        if (card.world || card.artifact) ab.push({ timing:'on_turn',  effect:'ess_add', val });
        else                             ab.push({ timing:'instant',  effect:'ess_add', val });
        break;

      // ── On attack ─────────────────────────────────────────
      case 'fear':        ab.push({ timing:'on_attack', effect:'fear' });       break;
      case 'burn':        ab.push({ timing:'on_attack', effect:'burn' });       break;
      case 'rage':        ab.push({ timing:'on_attack', effect:'rage', val });  break;
      case 'draw_attack': ab.push({ timing:'on_attack', effect:'draw', val });  break;

      // ── On kill / death ───────────────────────────────────
      case 'on_kill_base':      ab.push({ timing:'on_kill',         effect:'hp_base', val }); break;
      case 'on_any_death_base': ab.push({ timing:'on_any_death',    effect:'hp_base', val }); break;
      case 'on_play_creature':  ab.push({ timing:'on_play_creature',effect:'hp_base', val }); break;

      // ── Active (player-triggered) ─────────────────────────
      case 'aoe':       ab.push({ timing:'active', effect:'aoe',      val }); break;
      case 'shard':     ab.push({ timing:'active', effect:'shard',    val }); break;
      case 'sacrifice': ab.push({ timing:'active', effect:'sacrifice'      }); break;

      // ── Instant (spells) ──────────────────────────────────
      case 'revive':  ab.push({ timing:'instant', effect:'revive', val }); break;
      case 'bounce':  ab.push({ timing:'instant', effect:'bounce'       }); break;
      case 'salvage': ab.push({ timing:'instant', effect:'salvage'      }); break;
      // hp_add as a spell tag (direct heal)
      case 'hp_add':
        if (card.world)         ab.push({ timing:'on_enter', effect:'hp_add', val, target:'all' });
        else if (card.artifact) ab.push({ timing:'on_turn',  effect:'hp_add', val, target:'all' });
        else                    ab.push({ timing:'active',   effect:'hp_add', val });
        break;

      // ── Type flags — no ability object needed ─────────────
      case 'unique': case 'spell': case 'world': case 'artifact': case 'gtype': break;
    }
  }

  // revive:full flag — mark the revive ability so it restores full HP
  if (card.tags && card.tags.includes('revive:full')) {
    const idx = ab.findIndex(a => a.effect === 'revive');
    if (idx >= 0) ab[idx].val = 'full';
  }

  return ab;
}

// ── Ability executor ──────────────────────────────────────────
// Fires all abilities on `card` that match `timing`.
// ctx = { target } for attacks/heals, empty otherwise.
function triggerAbilities(card, timing, ctx = {}) {
  const abs  = getAbilities(card).filter(a => a.timing === timing);
  const curK = G.turn;
  const oppK = curK === 'tea' ? 'jeet' : 'tea';
  const cur  = G[curK];

  for (const a of abs) {
    switch (a.effect) {

      // AOE damage to all enemies
      case 'aoe':
        [...G[oppK].field].forEach(t => dmgCard(t, a.val, oppK));
        lg(`${card.name}: ${a.val} dmg to all enemies!`, 'imp');
        break;

      // Burn — target takes 1 dmg each turn start
      case 'burn':
        if (ctx.target && ctx.target.hp > 0 && !ctx.target.voided) {
          ctx.target.burning = true;
          lg(`${card.name}: ${ctx.target.name} is on fire!`, 'imp');
        }
        break;

      // Fear — target skips next turn, no counter-attack
      case 'fear':
        if (ctx.target && ctx.target.hp > 0 && !ctx.target.voided) {
          ctx.target.feared = true;
          lg(`${card.name}: ${ctx.target.name} is Feared!`, 'imp');
        }
        break;

      // Draw cards
      case 'draw':
        // instant (spells) and on_attack (Ryvlen) draw immediately.
        // on_turn draw is handled via extraDraw accumulation in endTurn().
        if (timing === 'instant' || timing === 'on_attack') {
          for (let i = 0; i < a.val; i++)
            if (cur.deck.length > 0) cur.hand.push(cur.deck.shift());
          lg(`${card.name}: draws ${a.val} card(s).`, 'imp');
        }
        break;

      // Heal base HP (not maxHP) — only heals if wounded
      case 'hp_base':
        if (G[curK].hp < G[curK].maxHp) {
          G[curK].hp = Math.min(G[curK].maxHp, G[curK].hp + a.val);
          lg(`${card.name}: ${curK} base +${a.val} HP → ${G[curK].hp}/${G[curK].maxHp}.`, 'hl');
          flashBase(curK, 'heal');
        }
        break;

      // Heal HP on creatures
      case 'hp_add':
        if (a.target === 'all') {
          // Artifact/World heal: only if it's alive (not spent/voided)
          if (!card.world || card.hp <= 0) {
            cur.field.forEach(ally => {
              if (!ally.spell && !ally.world && !ally.artifact) {
                ally.hp = Math.min(ally.maxHp, ally.hp + a.val);
                const id = ally.id;
                requestAnimationFrame(() => requestAnimationFrame(() => showFloat(id, `+${a.val}`, 'heal')));
              }
            });
            lg(`${card.name}: heal all allies +${a.val} HP.`, 'hl');
          }
        } else if (a.self) {
          // Regen: self-heal each turn
          if (!card.spell && !card.world && !card.artifact && card.hp < card.maxHp) {
            const regenVal = (card.squadParam && card.squadParam.regen) || a.val;
            card.hp = Math.min(card.maxHp, card.hp + regenVal);
            const id = card.id;
            requestAnimationFrame(() => requestAnimationFrame(() => showFloat(id, `+${regenVal}`, 'heal')));
            lg(`${card.name}: regen +${regenVal} HP → ${card.hp}/${card.maxHp}.`, 'hl');
          }
        } else if (ctx.target) {
          // Active heal: player chose a target
          ctx.target.hp = Math.min(ctx.target.maxHp, ctx.target.hp + a.val);
          lg(`${card.name}: +${a.val} HP to ${ctx.target.name} → ${ctx.target.hp}/${ctx.target.maxHp}.`, 'hl');
        }
        break;

      // Bounce — all field cards return to hands
      case 'bounce':
        [...G.tea.field].forEach(x  => { resetCardState(x); G.tea.hand.push(x); });
        [...G.jeet.field].forEach(x => { resetCardState(x); G.jeet.hand.push(x); });
        G.tea.field  = [];
        G.jeet.field = [];
        lg(`${card.name}: all field cards return to hands!`, 'imp');
        break;

      // Revive last creature from graveyard
      case 'revive': {
        const srcGrave = cur.grave.filter(x => !x.spell && !x.world && !x.artifact && !x.voided);
        if (srcGrave.length > 0) {
          const r   = srcGrave[srcGrave.length - 1];
          cur.grave = cur.grave.filter(x => x.id !== r.id);
          const def = DEFS[r.key];
          if (a.val === 'full' && def) { r.hp = def.hp; r.maxHp = def.hp; }
          else { r.hp = Math.min(a.val || 1, r.maxHp); }
          reviveCard(r, curK);
          lg(`${card.name}: revives ${r.name}!`, 'imp');
        } else {
          lg(`${card.name}: graveyard empty.`);
        }
        break;
      }

      // Salvage — return last graveyard card to hand (no revive, just pick up)
      case 'salvage': {
        const grave2 = cur.grave.filter(x => !x.voided);
        if (grave2.length > 0) {
          const r   = grave2[grave2.length - 1];
          cur.grave = cur.grave.filter(x => x.id !== r.id);
          resetCardState(r);
          cur.hand.push(r);
          lg(`${card.name}: ${r.name} returned to hand!`, 'imp');
        } else {
          lg(`${card.name}: graveyard empty.`);
        }
        break;
      }

      // Essence max increase
      case 'ess_max':
        cur.essMax += a.val;
        lg(`${card.name}: +${a.val} max Essence → ${cur.essMax}.`, 'imp');
        break;

      // Essence add (temporary, this turn)
      case 'ess_add':
        cur.ess += a.val;
        lg(`${card.name}: +${a.val} Essence → ${cur.ess}/${cur.essMax}.`, 'imp');
        break;

      // Rage — permanently +ATK each time this card attacks
      case 'rage': {
        card.rageBonus = (card.rageBonus || 0) + a.val;
        const rId = card.id;
        requestAnimationFrame(() => requestAnimationFrame(() => showFloat(rId, `+${a.val} ATK`, 'atk')));
        lg(`${card.name}: Rage! +${a.val} ATK → total ${card.atk + (card.atkBonus||0) + (card.rageBonus||0)} ATK.`, 'imp');
        break;
      }

      // Raise — revive top card from either graveyard at N HP for current faction
      case 'raise': {
        const all = [...G[curK].grave, ...G[oppK].grave]
          .filter(x => !x.spell && !x.world && !x.artifact && !x.voided);
        if (all.length > 0) {
          const r = all[all.length - 1];
          G[curK].grave = G[curK].grave.filter(x => x.id !== r.id);
          G[oppK].grave = G[oppK].grave.filter(x => x.id !== r.id);
          // Reset runtime state; keep identity/base stats
          resetCardState(r);
          r.sleeping = true;
          r.f = curK;
          const def = DEFS[r.key];
          if (def) r.maxHp = def.hp;
          r.hp = a.val || 1;
          G[curK].field.push(r);
          if (hasTag(r, 'aura:atk'))   G[curK]._auraAtkLog = r.id;
          if (hasTag(r, 'aura:maxhp')) G[curK]._auraMaxLog = r.id;
          applyAuras(curK);
          checkSquadBonuses(curK);
          lg(`${card.name} raises ${r.name} at ${r.hp} HP!`, 'imp');
        } else {
          lg(`${card.name}: both graveyards empty.`, 'die');
        }
        break;
      }

      // Aura (maxhp only — atk aura is handled passively by applyAuras)
      case 'aura':
        if (a.auraType === 'maxhp') {
          // Logging only; actual application is in applyAuras()
        }
        break;

      // world_maxhp, sacrifice, shard — handled directly in game.js
      default: break;
    }
  }
}

// ── Aura system ───────────────────────────────────────────────
// Recalculates ATK and maxHP auras for all cards on faction's field.
// Call after any field change (play, kill, revive, end turn).
// Must be called BEFORE checkSquadBonuses.
function applyAuras(faction) {
  const cur = G[faction];

  // Collect aura sources: field creatures + active world
  const auraSources = cur.field.filter(c => !c.spell && !c.world && !c.artifact);
  if (cur.world && hasTag(cur.world, 'aura:atk')) auraSources.push(cur.world);

  // ── ATK aura ─────────────────────────────────────────────
  // Reset all atkBonus, then re-add from every source
  cur.field.forEach(a => { a.atkBonus = 0; });
  auraSources.forEach(src => {
    if (!hasTag(src, 'aura:atk')) return;
    const val = getTagVal(src, 'aura:atk') || 1;
    cur.field.forEach(a => {
      if (a.id !== src.id && !a.spell && !a.world && !a.artifact)
        a.atkBonus = (a.atkBonus || 0) + val;
    });
    // Log only on card-enter (flag cleared after)
    if (cur._auraAtkLog === src.id) {
      const affected = cur.field.filter(a => a.id !== src.id && !a.spell && !a.world && !a.artifact);
      if (affected.length > 0) {
        lg(`${src.name}: +${val} ATK → ${affected.map(a => a.name).join(', ')}.`, 'hl');
        affected.forEach(a => {
          const id = a.id;
          requestAnimationFrame(() => requestAnimationFrame(() => showFloat(id, `+${val} ATK`, 'atk')));
        });
      }
      cur._auraAtkLog = null;
    }
  });

  // ── MaxHP aura ───────────────────────────────────────────
  // Step 1: restore each card's maxHp to its un-aura'd baseline
  const maxHpSources = auraSources.filter(s => hasTag(s, 'aura:maxhp'));
  cur.field.forEach(a => {
    if (a.spell || a.world || a.artifact) return;
    if (a.baseMaxHp !== null) {
      // Restore to base + squad + world bonuses (aura will be re-added below)
      a.maxHp = a.baseMaxHp + (a.squadMaxHpBonus || 0) + (a.worldMaxHpBonus || 0);
      a.hp    = Math.min(a.hp, a.maxHp);
    }
    // If no more maxhp sources, clear baseMaxHp tracking
    if (maxHpSources.length === 0) a.baseMaxHp = null;
  });

  // Step 2: apply each aura:maxhp source
  maxHpSources.forEach(src => {
    const val      = getTagVal(src, 'aura:maxhp') || 1;
    const affected = [];
    cur.field.forEach(a => {
      if (a.spell || a.world || a.artifact || a.id === src.id) return;
      if (a.baseMaxHp === null) {
        // Snapshot the un-buffed maxHp before first aura application
        a.baseMaxHp = a.maxHp - (a.squadMaxHpBonus || 0) - (a.worldMaxHpBonus || 0);
      }
      const wasFull = (a.hp === a.maxHp);
      a.maxHp += val;
      if (wasFull) a.hp = a.maxHp;
      if (cur._auraMaxLog === src.id) affected.push(`${a.name}(${a.hp}/${a.maxHp})`);
    });
    if (cur._auraMaxLog === src.id) {
      lg(affected.length > 0
        ? `${src.name}: +${val} maxHP → ${affected.join(', ')}.`
        : `${src.name}: no allies to buff.`, 'hl');
      cur._auraMaxLog = null;
    }
  });

  // ── World maxHP aura (buffs ALL allies including self) ───
  if (cur.world && hasTag(cur.world, 'world_maxhp')) {
    const val = getTagVal(cur.world, 'world_maxhp') || 1;
    cur.field.forEach(a => {
      if (a.spell || a.world || a.artifact) return;
      if (!a.worldMaxHpSet) {
        const wasFull = (a.hp === a.maxHp);
        a.maxHp += val;
        if (wasFull) a.hp = a.maxHp;
        a.worldMaxHpBonus = (a.worldMaxHpBonus || 0) + val;
        a.worldMaxHpSet   = true;
      }
    });
  } else {
    // World removed — strip world bonus
    cur.field.forEach(a => {
      if (a.worldMaxHpBonus) {
        a.maxHp         = Math.max(1, a.maxHp - a.worldMaxHpBonus);
        a.hp            = Math.min(a.hp, a.maxHp);
        a.worldMaxHpBonus = 0;
        a.worldMaxHpSet   = false;
      }
    });
  }
}
