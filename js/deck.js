// ============================================================
//  deck.js — Card instantiation
//  mkCard(key)   → creates a fresh card instance from DEFS
//  resetCardState(card) → resets all runtime fields to defaults
//                         Used by: resetC(), reviveCard(), raise
// ============================================================

let UID = 0;

// Full list of runtime fields every card instance carries.
// This is the single source of truth — add new fields here first.
function _cardRuntimeDefaults() {
  return {
    // Status flags
    sleeping:  false,
    exhausted: false,
    feared:    false,
    burning:   false,

    // ATK bonuses (stacked separately so each source can be removed cleanly)
    atkBonus:      0,   // from aura:atk sources
    rageBonus:     0,   // accumulated rage stacks
    squadAtkBonus: 0,   // from squad ATK bonus

    // MaxHP bonuses
    baseMaxHp:       null, // stored when aura:maxhp is active; null = no aura
    maxHpBonus:      0,    // legacy — kept for compatibility, not used in logic
    worldMaxHpBonus: 0,    // bonus from world_maxhp
    worldMaxHpSet:   false,// flag: world bonus already applied this card
    squadMaxHpBonus: 0,    // from squad maxHP bonus

    // Squad param upgrades  e.g. {heal:2} or {aoe:2} or {pierce:true} or {regen:2}
    squadParam: null,
  };
}

// Create a new card instance from a DEFS key.
function mkCard(key) {
  const def = DEFS[key];
  if (!def) { console.warn(`mkCard: unknown key "${key}"`); return null; }
  UID++;
  return {
    // Identity
    id:  'c' + UID,
    key,
    // Base stats (copied from def)
    name: def.name,
    cost: def.cost,
    hp:   def.hp,
    maxHp:def.hp,
    atk:  def.atk,
    art:  def.art,
    img:  def.img || null,
    f:    def.f,
    tags: [...(def.tags || [])],
    ab:   def.ab || '',
    // Type flags
    spell:    !!def.spell,
    world:    !!def.world,
    artifact: !!def.artifact,
    unique:   !!def.unique,
    // Runtime state
    ..._cardRuntimeDefaults(),
  };
}

// Reset all runtime fields back to defaults without touching identity/base stats.
// Restores hp/maxHp from DEFS so it's safe to call on any card regardless of buffs.
function resetCardState(card) {
  const def = DEFS[card.key];
  if (def) { card.hp = def.hp; card.maxHp = def.hp; }
  Object.assign(card, _cardRuntimeDefaults());
}
