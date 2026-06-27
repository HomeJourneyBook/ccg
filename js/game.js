// ============================================================
//  game.js — Game flow: phases, actions, combat, win/loss
//
//  Phase machine:
//    action        — normal turn
//    selectTarget  — creature selected, waiting for attack target
//    healTarget    — healer selected, waiting for ally/enemy target
//    burn          — waiting for hand card to burn
//    sacrificeTarget — Altar active, waiting for creature
//    shardTarget   — Shard active, waiting for enemy creature
// ============================================================

// ── Targeting helpers ─────────────────────────────────────────

// Returns IDs of cards on oppField that `att` can legally attack.
// Priority: Bushido > Provoke (unless Pierce) > visible.
function getTargetableCards(oppField, att) {
  const bushido = oppField.find(c => hasTag(c, 'bushido'));
  if (bushido) return [bushido.id];

  const visible  = oppField.filter(c => !hasTag(c, 'invisible') || oppField.length === 1);
  const provokes = visible.filter(c => hasTag(c, 'provoke'));
  const hasPierce = att && (hasTag(att, 'pierce') || (att.squadParam && att.squadParam.pierce));

  if (provokes.length > 0 && !hasPierce) return provokes.map(c => c.id);
  return visible.map(c => c.id);
}

// ── Click dispatcher ──────────────────────────────────────────
function onClick(card, zone) {
  const opp = G.turn === 'tea' ? 'jeet' : 'tea';

  // ── BURN phase ────────────────────────────────────────────
  if (G.phase === 'burn') {
    if (zone === 'hand' && card.f === G.turn) doBurnCard(card);
    return;
  }

  // ── SACRIFICE phase ───────────────────────────────────────
  if (G.phase === 'sacrificeTarget') {
    if (zone === 'field' && card.f === G.turn && !card.spell && !card.world && !card.artifact) {
      doSacrificeTarget(card);
    } else {
      G.phase = 'action'; G.sel = null; render();
    }
    return;
  }

  // ── SHARD phase ───────────────────────────────────────────
  if (G.phase === 'shardTarget') {
    if (zone === 'field' && card.f !== G.turn && !card.spell && !card.world && !card.artifact) {
      doShardTarget(card);
    } else {
      G.phase = 'action'; G.sel = null; render();
    }
    return;
  }

  // ── HEAL TARGET phase ─────────────────────────────────────
  if (G.phase === 'healTarget') {
    // Ally — heal
    if (zone === 'field' && card.f === G.turn && !card.spell && !card.world && !card.artifact && card.hp < card.maxHp) {
      const healer = findC(G.sel);
      if (healer) {
        const healAmt = (healer.squadParam && healer.squadParam.heal) || getTagVal(healer, 'heal') || 1;
        card.hp = Math.min(card.maxHp, card.hp + healAmt);
        setTimeout(() => showFloat(card.id, `+${healAmt}`, 'heal'), 50);
        const debuffs = [];
        if (card.burning) { card.burning = false; debuffs.push('fire'); }
        if (card.feared)  { card.feared  = false; debuffs.push('fear'); }
        lg(`${healer.name}: +${healAmt} HP to ${card.name}${debuffs.length ? ', removes ' + debuffs.join(' & ') : ''}.`, 'hl');
        healer.exhausted = true;
      }
      G.sel = null; G.phase = 'action';
      render();
      if (healer) activateCard(healer.id);
      return;
    }
    // Enemy — attack
    if (zone === 'field' && card.f === opp) {
      const healer = findC(G.sel);
      if (healer) {
        if (!_checkTargetable(card, opp)) return;
        doAttack(healer, card);
      }
      return;
    }
    // Anything else — cancel
    G.sel = null; G.phase = 'action'; render();
    return;
  }

  // ── SELECT TARGET phase ───────────────────────────────────
  if (G.phase === 'selectTarget') {
    if (card.f === G.turn) { G.sel = null; G.phase = 'action'; render(); return; }
    if (zone === 'field' && card.f === opp) {
      const att = findC(G.sel);
      if (!att) return;
      if (!_checkTargetable(card, opp, att)) return;
      doAttack(att, card);
    }
    return;
  }

  // ── ACTION phase ──────────────────────────────────────────
  if (G.phase === 'action') {
    // Hand tap — preview
    if (zone === 'hand' && card.f === G.turn) {
      G.previewCard = G.previewCard === card.id ? null : card.id;
      render(); return;
    }
    // Field: artifact with active ability
    if (zone === 'field' && card.f === G.turn && card.artifact) {
      if (!card.sleeping && !card.exhausted) {
        if (hasTag(card, 'sacrifice')) {
          G.phase = 'sacrificeTarget'; G.sel = card.id;
          lg(`${card.name}: select a creature to sacrifice.`, 'hint');
          render(); return;
        }
        if (hasTag(card, 'shard')) {
          doShard(card); return;
        }
      }
      return;
    }
    // Field: active creature
    if (zone === 'field' && card.f === G.turn && !card.sleeping && !card.exhausted && !card.feared
        && !card.spell && !card.world && !card.artifact) {
      // Healer enters healTarget mode; everyone else enters selectTarget
      if (hasTag(card, 'heal') && !card.unique) {
        G.sel = card.id; G.phase = 'healTarget';
        lg(`${card.name}: click an ALLY to heal, or an ENEMY to attack.`, 'hint');
      } else if (hasTag(card, 'aoe') && !card.unique) {
        // AOE creatures activate immediately
        G.sel = card.id;
        doActiveAoe(card);
        return;
      } else {
        G.sel = card.id; G.phase = 'selectTarget';
        lg(`Selected ${card.name} — click enemy to attack, or tap base.`, 'hint');
      }
      render(); return;
    }
  }
}

// Internal: check if card on `oppFaction`'s field is targetable by attacker.
// Logs a hint and returns false if not.
function _checkTargetable(card, oppFaction, att) {
  const oppField   = G[oppFaction].field;
  const attCard    = att || (G.sel ? findC(G.sel) : null);
  const targetable = getTargetableCards(oppField, attCard);
  if (targetable.includes(card.id)) return true;

  const bushido = oppField.find(c => hasTag(c, 'bushido'));
  if (bushido)             lg(`Must attack ${bushido.name} (Bushido) first!`, 'hint');
  else if (hasTag(card, 'invisible')) lg(`${card.name} is invisible — pick another target.`, 'hint');
  else                     lg(`Must attack the Provoke card first!`, 'hint');
  return false;
}

// ── Play a card from hand ─────────────────────────────────────
function doPlay(card) {
  const cur = G[G.turn];
  if (cur.ess < card.cost) { lg(`Not enough Essence — need ${card.cost}, have ${cur.ess}.`, 'hint'); return; }
  cur.ess -= card.cost;
  cur.hand  = cur.hand.filter(c => c.id !== card.id);

  if      (card.spell)    doSpell(card);
  else if (card.world)    doWorld(card);
  else if (card.artifact) doArtifact(card);
  else                    doCreature(card);

  render();
}

function doCreature(card) {
  const cur = G[G.turn];
  card.sleeping  = !hasTag(card, 'vanguard');
  card.exhausted = false;
  cur.field.push(card);
  lg(`${G.turn.toUpperCase()} plays ${card.name}.`, 'imp');

  // on_play_creature: other cards on field first, then the new card itself
  cur.field.forEach(c => { if (c.id !== card.id) triggerAbilities(c, 'on_play_creature'); });
  triggerAbilities(card, 'on_play_creature');
  triggerAbilities(card, 'on_enter');

  // Accumulate on_turn draw bonus
  const drawTag = getTagVal(card, 'draw');
  if (drawTag) cur.extraDraw += drawTag;

  // Flag aura logging (cleared in applyAuras after first log)
  if (hasTag(card, 'aura:atk'))   cur._auraAtkLog = card.id;
  if (hasTag(card, 'aura:maxhp')) cur._auraMaxLog  = card.id;

  // Apply world_maxhp bonus to the new card if active
  if (cur.world && hasTag(cur.world, 'world_maxhp') && !card.worldMaxHpSet) {
    const val = getTagVal(cur.world, 'world_maxhp') || 1;
    const wasFull = card.hp === card.maxHp;
    card.maxHp += val;
    if (wasFull) card.hp = card.maxHp;
    card.worldMaxHpBonus = (card.worldMaxHpBonus || 0) + val;
    card.worldMaxHpSet   = true;
  }

  applyAuras(G.turn);
  checkSquadBonuses(G.turn);
}

function doWorld(card) {
  const cur = G[G.turn];
  // Replace existing world
  if (cur.world) {
    const old = cur.world;
    const oldDraw = getTagVal(old, 'draw');
    if (oldDraw) cur.extraDraw = Math.max(0, cur.extraDraw - oldDraw);
    old.voided = true;
    cur.void.push(old);
    lg(`Replaced ${old.name}.`);
    if (hasTag(old, 'aura:atk') || hasTag(old, 'aura:maxhp')) applyAuras(G.turn);
  }
  cur.world = card;
  const drawTag = getTagVal(card, 'draw');
  if (drawTag) cur.extraDraw += drawTag;
  if (hasTag(card, 'aura:atk'))   cur._auraAtkLog = card.id;
  if (hasTag(card, 'aura:maxhp')) cur._auraMaxLog  = card.id;
  applyAuras(G.turn);
  checkSquadBonuses(G.turn);
  lg(`World: ${card.name} landed.`, 'imp');
}

function doArtifact(card) {
  const cur = G[G.turn];
  card.sleeping = true; // artifacts sleep their first turn
  cur.artifacts.push(card);
  const drawTag = getTagVal(card, 'draw');
  if (drawTag) cur.extraDraw += drawTag;
  lg(`Artifact: ${card.name} placed.`, 'imp');
}

function doSpell(card) {
  const cur = G[G.turn];
  lg(`Spell: ${card.name}.`, 'imp');
  triggerAbilities(card, 'instant');
  card.voided = true;
  cur.void.push(card);
}

// ── Revive a card onto faction's field ───────────────────────
function reviveCard(card, toF) {
  const def = DEFS[card.key];
  if (def) { card.hp = def.hp; card.maxHp = def.hp; }
  resetCardState(card);
  card.sleeping = true;
  card.f = toF;
  G[toF].field.push(card);
  lg(`Revived ${card.name} at full HP.`, 'hl');
  if (hasTag(card, 'aura:atk'))   G[toF]._auraAtkLog = card.id;
  if (hasTag(card, 'aura:maxhp')) G[toF]._auraMaxLog  = card.id;
  applyAuras(toF);
  checkSquadBonuses(toF);
}

// ── Combat ────────────────────────────────────────────────────
function doAttack(att, target) {
  const curK = G.turn;
  const oppK = curK === 'tea' ? 'jeet' : 'tea';
  const atk  = att.atk + (att.atkBonus || 0) + (att.rageBonus || 0) + (att.squadAtkBonus || 0);

  lg(`${att.name} attacks ${target.name}!`, 'imp');
  dmgCard(target, atk, oppK);

  // Counter-attack: attacker takes damage back unless invisible or target is feared
  const noCounter = hasTag(att, 'invisible') || hasTag(target, 'invisible') || target.feared;
  if (!noCounter) {
    const retAtk = target.atk + (target.atkBonus || 0) + (target.rageBonus || 0) + (target.squadAtkBonus || 0);
    dmgCard(att, retAtk, curK);
  }

  triggerAbilities(att, 'on_attack', { target });
  att.exhausted = true;
  G.sel   = null;
  G.phase = 'action';
  checkWin();
  render();
  activateCard(att.id);
}

// Active AOE ability (e.g. Umbasir) — unified for all AOE creatures
function doActiveAoe(card) {
  const oppK  = G.turn === 'tea' ? 'jeet' : 'tea';
  if (card.exhausted) { lg(`${card.name} already acted this turn.`, 'dmg'); return; }
  const dmgAmt = (card.squadParam && card.squadParam.aoe) || getTagVal(card, 'aoe') || 1;
  lg(`${card.name} hits ALL enemies for ${dmgAmt} dmg!`, 'imp');
  [...G[oppK].field].forEach(c => dmgCard(c, dmgAmt, oppK));
  card.exhausted = true;
  G.sel   = null;
  G.phase = 'action';
  checkWin();
  render();
  activateCard(card.id);
}

// Base attack — player's selected creature hits the opponent's base
function onBaseClick(faction) {
  if (faction === G.turn) return; // can't attack own base
  if ((G.phase === 'selectTarget' || G.phase === 'healTarget') && G.sel && canAttackBase()) {
    tryAttackBase();
  }
}

function canAttackBase() {
  if (!G.sel) return false;
  const att  = findC(G.sel);
  if (!att || att.exhausted || att.sleeping || att.feared) return false;
  const oppK = G.turn === 'tea' ? 'jeet' : 'tea';
  const opp  = G[oppK];
  // Bushido blocks base attacks
  if (opp.field.find(c => hasTag(c, 'bushido'))) return false;
  // Provoke blocks base attacks unless attacker has Pierce
  const provoke  = opp.field.find(c => hasTag(c, 'provoke'));
  const hasPierce= att.tags.includes('pierce') || (att.squadParam && att.squadParam.pierce);
  if (provoke && !hasPierce) return false;
  return true;
}

function tryAttackBase() {
  if (G.phase !== 'selectTarget' && G.phase !== 'healTarget') {
    lg('Select a card to attack with first.', 'hint'); return;
  }
  const att  = findC(G.sel); if (!att) return;
  const oppK = G.turn === 'tea' ? 'jeet' : 'tea';
  const opp  = G[oppK];

  const bushido = opp.field.find(c => hasTag(c, 'bushido'));
  if (bushido) { lg(`${bushido.name} (Bushido) blocks — must attack it first!`, 'hint'); return; }
  const provoke   = opp.field.find(c => hasTag(c, 'provoke'));
  const hasPierce = att.tags.includes('pierce') || (att.squadParam && att.squadParam.pierce);
  if (provoke && !hasPierce) { lg(`${provoke.name} has Provoke — attack it first!`, 'hint'); return; }

  const atk = att.atk + (att.atkBonus || 0) + (att.rageBonus || 0) + (att.squadAtkBonus || 0);
  lg(`${att.name} hits ${oppK.toUpperCase()} base for ${atk} dmg!`, 'dmg');
  opp.hp = Math.max(0, opp.hp - atk);
  triggerAbilities(att, 'on_attack', { target: null });
  att.exhausted = true;
  G.sel   = null;
  G.phase = 'action';
  flashBase('opp', 'dmg');
  checkWin();
  render();
  activateCard(att.id);
}

// ── Damage & death ────────────────────────────────────────────
function dmgCard(card, dmg, faction) {
  if (dmg <= 0) return;
  card.hp -= dmg;
  const id = card.id;
  requestAnimationFrame(() => requestAnimationFrame(() => showFloat(id, `-${dmg}`, 'dmg')));
  lg(`${card.name} takes ${dmg} → ${card.hp}/${card.maxHp} HP.`, 'dmg');
  if (card.hp <= 0) killCard(card, faction);
}

function killCard(card, faction) {
  G[faction].field = G[faction].field.filter(c => c.id !== card.id);

  // Clear squad/rage bonuses so they don't persist if card is later revived
  card.rageBonus      = 0;
  card.squadMaxHpBonus= 0;
  card.squadAtkBonus  = 0;
  card.squadParam     = null;

  G[faction].grave.push(card);
  lg(`${card.name} dies.`, 'die');

  // Remove ATK aura — reset atkBonus on remaining field cards, then re-apply
  if (hasTag(card, 'aura:atk')) {
    G[faction].field.forEach(a => { a.atkBonus = 0; });
    lg(`${card.name} died — ATK aura removed.`);
  }
  applyAuras(faction);
  checkSquadBonuses(faction);

  // World: on_own_death — draw when your creature dies
  if (!card.spell && !card.world && !card.artifact) {
    const world = G[faction].world;
    if (world && hasTag(world, 'on_own_death')) {
      const val = getTagVal(world, 'on_own_death') || 1;
      for (let i = 0; i < val; i++)
        if (G[faction].deck.length > 0) G[faction].hand.push(G[faction].deck.shift());
      lg(`${world.name}: ${card.name} died — draw ${val} card(s).`, 'hl');
    }
  }

  // on_any_death_base — all creatures on both sides that have this tag
  ['tea', 'jeet'].forEach(f => {
    G[f].field.forEach(ally => {
      const val = getTagVal(ally, 'on_any_death_base');
      if (val && G[f].hp < G[f].maxHp) {
        G[f].hp = Math.min(G[f].maxHp, G[f].hp + val);
        lg(`${ally.name}: ${f} base +${val} HP → ${G[f].hp}/${G[f].maxHp}.`, 'hl');
        flashBase(f, 'heal');
      }
    });
  });

  // Remove extraDraw contribution if the card had a draw tag
  const drawTag = getTagVal(card, 'draw');
  if (drawTag) G[card.f].extraDraw = Math.max(0, G[card.f].extraDraw - drawTag);
}

// ── Burn ──────────────────────────────────────────────────────
function doBurnCard(card) {
  const cur = G[G.turn];
  if (cur.burned) { lg('Already burned a card this turn.', 'hint'); return; }
  cur.hand = cur.hand.filter(c => c.id !== card.id);
  card.voided = true;
  cur.void.push(card);
  cur.essMax += 1;
  cur.ess    += 1;
  cur.burned  = true;
  lg(`Burned ${card.name} → Essence now ${cur.ess}/${cur.essMax}.`, 'imp');
  G.phase = 'action';
  render();
}

// ── Artifact abilities ────────────────────────────────────────

// Shard — toggle shardTarget phase; click again to cancel
function doShard(artifact) {
  if (G.phase === 'shardTarget') {
    G.phase = 'action'; G.sel = null; render(); return;
  }
  G.phase = 'shardTarget';
  G.sel   = artifact.id;
  lg(`${artifact.name}: select an enemy creature to deal ${getTagVal(artifact, 'shard') || 2} damage.`, 'hint');
  render();
}

function doShardTarget(card) {
  const oppK    = G.turn === 'tea' ? 'jeet' : 'tea';
  const artifact = G[G.turn].artifacts.find(a => hasTag(a, 'shard'));
  if (!artifact) return;
  const baseDmg = getTagVal(artifact, 'shard') || 2;
  const dmg     = card.feared ? baseDmg + 1 : baseDmg;
  const fearNote= card.feared ? ' (feared +1)' : '';
  lg(`${artifact.name}: ${card.name} takes ${dmg} damage${fearNote}!`, 'dmg');
  dmgCard(card, dmg, oppK);
  artifact.exhausted = true;
  G.phase = 'action'; G.sel = null;
  checkWin(); render();
}

// Altar sacrifice
function doSacrificeTarget(card) {
  const altar = G[G.turn].artifacts.find(a => hasTag(a, 'sacrifice'));
  if (altar) { altar.exhausted = true; lg('Altar exhausted until next turn.', 'die'); }
  lg(`${card.name} sacrificed to the Altar!`, 'die');
  killCard(card, G.turn);
  G.phase = 'action';
  checkWin(); render();
}

// ── Squad bonus system ────────────────────────────────────────
const SQUAD_DEFS = [
  { gtype:'drg', count:3, effect:'maxhp',  val:1 },
  { gtype:'mch', count:3, effect:'atk',    val:1 },
  { gtype:'orb', count:3, effect:'param',  param:'heal',   val:2 },
  { gtype:'umb', count:3, effect:'param',  param:'aoe',    val:2 },
  { gtype:'szg', count:3, effect:'param',  param:'pierce', val:true },
  { gtype:'xui', count:3, effect:'param',  param:'regen',  val:2 },
];

// Recalculate squad bonuses for the faction's field.
// Call AFTER applyAuras to avoid maxHp conflicts.
function checkSquadBonuses(faction) {
  const field = G[faction].field.filter(c => !c.spell && !c.world && !c.artifact);

  SQUAD_DEFS.forEach(squad => {
    const members = field.filter(c => getTagVal(c, 'gtype') === squad.gtype);
    const active  = members.length >= squad.count;

    members.forEach(card => {
      if (squad.effect === 'maxhp') {
        if (active && !card.squadMaxHpBonus) {
          card.maxHp += squad.val;
          if (card.hp === card.maxHp - squad.val) card.hp += squad.val;
          card.squadMaxHpBonus = squad.val;
          lg(`Squad bonus! ${card.name} +${squad.val} maxHP → ${card.hp}/${card.maxHp}.`, 'hl');
        } else if (!active && card.squadMaxHpBonus) {
          card.maxHp = Math.max(1, card.maxHp - card.squadMaxHpBonus);
          card.hp    = Math.min(card.hp, card.maxHp);
          card.squadMaxHpBonus = 0;
          lg(`${card.name}: squad broken — maxHP bonus lost.`, 'die');
        }
      } else if (squad.effect === 'atk') {
        if (active && !card.squadAtkBonus) {
          card.squadAtkBonus = squad.val;
          lg(`Squad bonus! ${card.name} +${squad.val} ATK.`, 'hl');
        } else if (!active && card.squadAtkBonus) {
          card.squadAtkBonus = 0;
          lg(`${card.name}: squad broken — ATK bonus lost.`, 'die');
        }
      } else if (squad.effect === 'param') {
        if (active && !card.squadParam) {
          card.squadParam = { [squad.param]: squad.val };
          lg(`Squad bonus! ${card.name} ${squad.param} upgraded to ${squad.val}.`, 'hl');
        } else if (!active && card.squadParam) {
          card.squadParam = null;
          lg(`${card.name}: squad broken — ${squad.param} bonus lost.`, 'die');
        }
      }
    });
  });
}

// ── End turn ──────────────────────────────────────────────────
function endTurn() {
  G.sel = null; G.phase = 'action'; G.previewCard = null;
  const next = G.turn === 'tea' ? 'jeet' : 'tea';

  // Wake up current player's cards
  G[G.turn].field.forEach(c => { c.sleeping = false; c.exhausted = false; c.feared = false; });
  G[G.turn].artifacts.forEach(a => { a.sleeping = false; a.exhausted = false; });

  G.turn = next;
  const cur  = G[G.turn];
  const oppK = G.turn === 'tea' ? 'jeet' : 'tea';

  // Essence ramp (Jeet skips first turn ramp)
  cur.burned = false;
  if (G.jeetFirstTurn && G.turn === 'jeet') {
    cur.essMax = 1; cur.ess = 1; G.jeetFirstTurn = false;
  } else {
    cur.essMax += 1; cur.ess = cur.essMax;
  }

  // Trigger on_turn abilities: world → artifacts → field creatures
  if (cur.world) triggerAbilities(cur.world, 'on_turn');
  cur.artifacts.forEach(a => triggerAbilities(a, 'on_turn'));
  applyAuras(G.turn);
  checkSquadBonuses(G.turn);
  [...cur.field].forEach(c => triggerAbilities(c, 'on_turn'));

  // Burn damage
  [...G[G.turn].field].forEach(card => {
    if (card.burning && !card.spell && !card.world && !card.artifact) {
      card.hp -= 1;
      lg(`${card.name} burns for 1 HP → ${card.hp}/${card.maxHp}.`, 'dmg');
      if (card.hp <= 0) killCard(card, G.turn);
    }
  });
  checkWin();

  // Draw phase (Jeet skips draw on their very first turn)
  const skipDraw = (G.turn === 'jeet' && G.turnNum === 1);
  if (!skipDraw) {
    const n = 1 + cur.extraDraw;
    for (let i = 0; i < n; i++)
      if (cur.deck.length > 0) cur.hand.push(cur.deck.shift());
  }

  if (G.turn === 'tea') G.turnNum++;
  lg(`─ Turn ${G.turnNum}: ${G.turn.toUpperCase()} · ${cur.ess}/${cur.essMax} Essence ─`, 'trn');
  const lp = document.getElementById('logPanel');
  if (lp) lp.classList.remove('open');
  render();
}

// ── Win check ─────────────────────────────────────────────────
function checkWin() {
  if (G.tea.hp  <= 0) showWin('jeet');
  if (G.jeet.hp <= 0) showWin('tea');
}

// ── Mulligan ──────────────────────────────────────────────────
function doMulligan(faction) {
  const m = G.mulligan[faction];
  const p = G[faction];
  if (m.used >= 3) { lg('No more mulligans!', 'dmg'); return; }

  // Return hand to deck and reshuffle
  p.hand.forEach(card => { resetCardState(card); p.deck.push(card); });
  p.hand = [];
  for (let i = p.deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [p.deck[i], p.deck[j]] = [p.deck[j], p.deck[i]];
  }

  const drawCounts = [5, 4, 3];
  const draw = drawCounts[m.used];
  for (let i = 0; i < draw; i++)
    if (p.deck.length > 0) p.hand.push(p.deck.shift());

  const msgs = [
    `1st Mulligan: drew ${draw} new cards.`,
    `2nd Mulligan: drew ${draw} cards.`,
    `3rd Mulligan: drew ${draw} cards. Last mulligan used.`,
  ];
  lg(msgs[m.used], 'imp');
  m.used++;
  updateMulliganBtn(faction);
  render();
}

// ── Graveyard modal ───────────────────────────────────────────
function openGraveModal(faction) {
  const grave  = G[faction].grave.filter(c => !c.voided);
  const modal  = document.getElementById('graveModal');
  const title  = document.getElementById('graveModalTitle');
  const cards  = document.getElementById('graveModalCards');
  title.textContent = (faction === 'tea' ? 'Tavern' : 'Jeet Core') + ' Graveyard';
  cards.innerHTML   = '';
  if (grave.length === 0) {
    cards.innerHTML = '<div style="color:#555;font-size:20px;padding:20px;">Empty</div>';
  } else {
    grave.forEach(card => {
      const d = mkEl(card, 'grave');
      d.style.cursor    = 'default';
      d.style.transform = 'none';
      cards.appendChild(d);
    });
  }
  modal.classList.remove('hidden');
}

function closeGraveModal() {
  document.getElementById('graveModal').classList.add('hidden');
}

// ── Misc utils ────────────────────────────────────────────────
function cancelAction() {
  G.previewCard = null; clearPreview();
  G.sel = null; G.phase = 'action';
  render();
}

function handleGameClick(e) {
  if (G.phase === 'sacrificeTarget' && !e.target.closest('.card') && !e.target.closest('.pcard')) {
    G.phase = 'action'; G.sel = null; render(); return;
  }
  if (!e.target.closest('.card') && G.previewCard) {
    G.previewCard = null; clearPreview(); render();
  }
}

function clearPreview() {
  document.querySelectorAll('.hand .card.previewed').forEach(el => el.classList.remove('previewed'));
}

// ── Visual feedback helpers ───────────────────────────────────

// Floating damage/heal number on a field card
function showFloat(cardId, text, type) {
  const el = document.querySelector(`.card-small[data-id="${cardId}"]`);
  if (!el) return;
  const num = document.createElement('div');
  num.className  = `float-number ${type}`;
  num.textContent= text;
  el.appendChild(num);
  setTimeout(() => num.remove(), 900);
}

// Pulse animation on a field card after it acts
function activateCard(cardId) {
  const el = document.querySelector(`.card-small[data-id="${cardId}"]`);
  if (!el) return;
  el.classList.remove('activating');
  void el.offsetWidth; // force reflow to restart animation
  el.classList.add('activating');
  setTimeout(() => el.classList.remove('activating'), 500);
}

// Flash the stats bar of a base (queued so it runs after render)
function flashBase(who, type) {
  if (!G._pendingFlash) G._pendingFlash = [];
  G._pendingFlash.push({ who, type });
}

function _applyPendingFlash() {
  if (!G._pendingFlash || G._pendingFlash.length === 0) return;
  const flashes = G._pendingFlash;
  G._pendingFlash = [];
  flashes.forEach(({ who, type }) => {
    const oppK = G.turn === 'tea' ? 'jeet' : 'tea';
    let elId;
    if (who === 'opp' || who === 'player') {
      elId = who === 'opp' ? 'oppStats' : 'playerStats';
    } else {
      elId = who === oppK ? 'oppStats' : 'playerStats';
    }
    const el = document.getElementById(elId);
    if (!el) return;
    el.classList.remove('flash-red', 'flash-green');
    void el.offsetWidth;
    el.classList.add(type === 'dmg' ? 'flash-red' : 'flash-green');
    setTimeout(() => el.classList.remove('flash-red', 'flash-green'), 500);
  });
}

// ── Keyboard shortcut ─────────────────────────────────────────
// Spacebar = End Turn (while game screen is visible)
document.addEventListener('keydown', e => {
  if (e.code !== 'Space') return;
  const game = document.getElementById('game');
  if (!game || game.style.display === 'none') return;
  e.preventDefault();
  const teaBB  = document.getElementById('teaBottomBar');
  const jeetBB = document.getElementById('jeetBottomBar');
  if (teaBB  && teaBB.style.display  !== 'none') endTurn();
  else if (jeetBB && jeetBB.style.display !== 'none') endTurn();
});
