// ============================================================
//  data.js — Card definitions (DEFS) + deck builder
//  All cards live here. To add a card: add entry to DEFS,
//  then add its key to buildDeck() under the right faction.
// ============================================================

const DEFS = {

  // ── TEA FACTION ─────────────────────────────────────────
  // Travelers (common — 5 copies each in starter deck)
  t_szarg_w: { name:"SZARG",   cost:1, hp:1, atk:2, art:"🦈", img:"014_Sz.png",  f:"tea", tags:["vanguard","gtype:szg"],  ab:"Vanguard. Squad: Pierce." },
  t_orb_w:   { name:"ORBITON", cost:1, hp:2, atk:1, art:"👁️", img:"015_Orb.png", f:"tea", tags:["heal:1","gtype:orb"],    ab:"Active: Heal 1 HP. Squad: Heal 2." },
  t_drig_w:  { name:"DREEGAN", cost:3, hp:4, atk:1, art:"🌳", img:"017_Dr.png",  f:"tea", tags:["provoke","gtype:drg"],   ab:"Provoke. Squad: +1 maxHP." },
  t_umb_w:   { name:"UMBASIR", cost:2, hp:2, atk:1, art:"🌀", img:"013_Umb.png", f:"tea", tags:["aoe:1","gtype:umb"],     ab:"Active: AOE 1 dmg. Squad: AOE 2 dmg." },
  t_meh_w:   { name:"MECHIRD", cost:2, hp:3, atk:1, art:"🤖", img:"016_M.png",   f:"tea", tags:["pierce","gtype:mch"],    ab:"Pierce. Squad: +1 ATK." },
  t_ksi_w:   { name:"XUIQTR",  cost:3, hp:4, atk:1, art:"🐙", img:"012_Xui.png", f:"tea", tags:["regen:1","gtype:xui"],   ab:"Regen 1. Squad: Regen 2." },

  // Legendaries / 1-of-1 (1 copy each)
  t_tean:  { name:"TEANTIST", cost:4, hp:5, atk:1, art:"🧙", img:"002_Teantist.png", f:"tea", tags:["unique","draw:1"],          ab:"On turn: Draw 1 card.", unique:true },
  t_aslex: { name:"ASLEX",    cost:5, hp:6, atk:2, art:"🍵", img:"008_Aslex.png",    f:"tea", tags:["unique","aura:maxhp:1"],     ab:"Aura: +1 maxHP to allies.", unique:true },
  t_tuborg:{ name:"TUBORG",   cost:5, hp:5, atk:2, art:"👑", img:"011_Tuborg.png",   f:"tea", tags:["unique","aura:atk:1"],       ab:"Aura: +1 ATK to allies.", unique:true },
  t_faeron:{ name:"FAERON",   cost:4, hp:5, atk:2, art:"🔥", img:"010_Faeron.png",   f:"tea", tags:["unique","burn","on_play_creature:1"], ab:"Burn. Each creature played: heal base 1 HP.", unique:true },
  t_nab:   { name:"NABUNAGI", cost:5, hp:6, atk:2, art:"⛩️", img:"009_Oda.png",      f:"tea", tags:["unique","provoke","bushido"], ab:"Bushido: ALL attacks must target Nabunagi.", unique:true },

  // Spells (2 copies each)
  t_sp1: { name:"ARCHIVE",    cost:2, hp:0, atk:0, art:"📜", img:"1_Archive.png",    f:"tea", tags:["spell","draw:2"],     ab:"Draw 2 cards.", spell:true },
  t_sp2: { name:"JOURNEY",    cost:3, hp:0, atk:0, art:"🌌", img:"1_Journey.png",    f:"tea", tags:["spell","draw:3"],     ab:"Draw 3 cards.", spell:true },
  t_sp3: { name:"SHEN'S CALL",cost:3, hp:0, atk:0, art:"✨", img:"1_Shen.png",       f:"tea", tags:["spell","revive:full"],ab:"Revive last creature from your graveyard at full HP.", spell:true },
  t_sp4: { name:"SCHEME",     cost:1, hp:0, atk:0, art:"🗺️", img:"1_Sheme.png",      f:"tea", tags:["spell","ess_add:2"],  ab:"Gain 2 Essence.", spell:true },

  // Worlds (1 copy each)
  t_w1: { name:"VALLEY", cost:4, hp:0, atk:0, art:"", img:"1_Valley.png", f:"tea", tags:["world","draw:1"],       ab:"On turn: Draw 1 card.", world:true },
  t_w2: { name:"DOMUS",  cost:4, hp:0, atk:0, art:"", img:"1_Domus.png",  f:"tea", tags:["world","world_maxhp:1"],ab:"Aura: +1 maxHP to ALL allies.", world:true },

  // Artifacts (1 copy each)
  t_a1: { name:"THE BOOK",    cost:3, hp:0, atk:0, art:"", img:"1_Book.png",  f:"tea", tags:["artifact","draw:1"],  ab:"On turn: Draw 1 card.", artifact:true },
  t_a2: { name:"TEA FOUNT.",  cost:3, hp:0, atk:0, art:"", img:"1_Fontan.png",f:"tea", tags:["artifact","heal:1"],  ab:"On turn: Restore all allies 1 HP.", artifact:true },


  // ── JEET FACTION ────────────────────────────────────────
  // Travelers (common — 5 copies each in starter deck)
  j_szarg_w: { name:"SZARG",   cost:1, hp:1, atk:2, art:"🦈", img:"014_Sz.png",  f:"jeet", tags:["vanguard","gtype:szg"],  ab:"Vanguard. Squad: Pierce." },
  j_orb_w:   { name:"ORBITON", cost:1, hp:2, atk:1, art:"👁️", img:"015_Orb.png", f:"jeet", tags:["heal:1","gtype:orb"],    ab:"Active: Heal 1 HP. Squad: Heal 2." },
  j_drig_w:  { name:"DREEGAN", cost:3, hp:4, atk:1, art:"🌳", img:"017_Dr.png",  f:"jeet", tags:["provoke","gtype:drg"],   ab:"Provoke. Squad: +1 maxHP." },
  j_umb_w:   { name:"UMBASIR", cost:2, hp:2, atk:1, art:"🌀", img:"013_Umb.png", f:"jeet", tags:["aoe:1","gtype:umb"],     ab:"Active: AOE 1 dmg. Squad: AOE 2 dmg." },
  j_meh_w:   { name:"MECHIRD", cost:2, hp:3, atk:1, art:"🤖", img:"016_M.png",   f:"jeet", tags:["pierce","gtype:mch"],    ab:"Pierce. Squad: +1 ATK." },
  j_ksi_w:   { name:"XUIQTR",  cost:3, hp:4, atk:1, art:"🐙", img:"012_Xui.png", f:"jeet", tags:["regen:1","gtype:xui"],   ab:"Regen 1. Squad: Regen 2." },

  // Legendaries / 1-of-1 (1 copy each)
  j_reap:  { name:"REAPER",     cost:5, hp:4, atk:3, art:"☠️", img:"004_Reaper.png",      f:"jeet", tags:["unique","on_any_death_base:1"],          ab:"Any creature death: restore base 1 HP.", unique:true },
  j_ryv:   { name:"RYVLEN",     cost:5, hp:4, atk:2, art:"🎭", img:"007_Ryvlen.png",      f:"jeet", tags:["unique","fear","draw_attack:1"],          ab:"Fear. On attack: Draw 1 card.", unique:true },
  j_mal:   { name:"ABYSSWALKER",cost:5, hp:5, atk:2, art:"🗡️", img:"001_Abysswalker.png", f:"jeet", tags:["unique","rage","enter_aoe:1"],            ab:"Rage. On enter: AOE 1 dmg to all enemies.", unique:true },
  j_phleg: { name:"PHLEGMOR",   cost:5, hp:6, atk:1, art:"💀", img:"005_Phelgmor.png",    f:"jeet", tags:["unique","raise:1"],                       ab:"On turn: Raise top graveyard card at 1 HP.", unique:true },
  j_vard:  { name:"SEEKER",     cost:4, hp:4, atk:2, art:"🌑", img:"003_Seeker.png",      f:"jeet", tags:["unique","invisible","fear","pierce"],      ab:"Invisible. Fear. Pierce.", unique:true },

  // Spells (2 copies each)
  j_sp1: { name:"JEET WAVE",  cost:2, hp:0, atk:0, art:"🌊", img:"1_Wave.png",      f:"jeet", tags:["spell","draw:2"],     ab:"Draw 2 cards.", spell:true },
  j_sp2: { name:"OBLIVION",   cost:3, hp:0, atk:0, art:"🌀", img:"1_Oblivion.png",  f:"jeet", tags:["spell","draw:3"],     ab:"Draw 3 cards.", spell:true },
  j_sp3: { name:"FORGETTING", cost:3, hp:0, atk:0, art:"🖤", img:"1_Forgetting.png",f:"jeet", tags:["spell","revive:full"],ab:"Revive last creature from your graveyard at full HP.", spell:true },
  j_sp4: { name:"BLACK MAGIC",cost:1, hp:0, atk:0, art:"⚫", img:"1_Spell1.png",    f:"jeet", tags:["spell","ess_add:2"],  ab:"Gain 2 Essence.", spell:true },

  // Worlds (1 copy each)
  j_w1: { name:"HUNGER", cost:4, hp:0, atk:0, art:"", img:"1_Hunger.png", f:"jeet", tags:["world","on_own_death:1"], ab:"When your creature dies: draw 1 card.", world:true },
  j_w2: { name:"NORRIA", cost:4, hp:0, atk:0, art:"", img:"1_Norria.png", f:"jeet", tags:["world","aura:atk:1"],    ab:"Aura: +1 ATK to all allies.", world:true },

  // Artifacts (1 copy each)
  j_a1: { name:"SHARD", cost:3, hp:0, atk:0, art:"", img:"1_Shard.png", f:"jeet", tags:["artifact","shard:2"],   ab:"Active: deal 2 damage to any enemy creature.", artifact:true },
  j_a2: { name:"ALTAR", cost:3, hp:0, atk:0, art:"", img:"1_Altar.png", f:"jeet", tags:["artifact","sacrifice"], ab:"Active: sacrifice 1 of your creatures.", artifact:true },

  // ── NEUTRAL ─────────────────────────────────────────────
  // Neutral cards can belong to either faction (f set at deck build time).
  // Currently only in Jeet starter.
  unseen: { name:"UNSEEN", cost:2, hp:0, atk:0, art:"👁️", img:"113_Unseen.png", f:"jeet", tags:["spell","bounce"], ab:"Return ALL field cards to their owners' hands.", spell:true },
};

// ── Deck builder ──────────────────────────────────────────────
// Returns a shuffled array of card keys for the given faction.
// Copy counts:  travelers ×5 | legendaries ×1 | spells ×2 | worlds ×1 | artifacts ×1
function buildDeck(f) {
  const t = f === 'tea';

  const travelers  = t ? ['t_szarg_w','t_orb_w','t_drig_w','t_umb_w','t_meh_w','t_ksi_w']
                       : ['j_szarg_w','j_orb_w','j_drig_w','j_umb_w','j_meh_w','j_ksi_w'];
  const legendaries= t ? ['t_tean','t_aslex','t_tuborg','t_faeron','t_nab']
                       : ['j_reap','j_ryv','j_mal','j_phleg','j_vard'];
  const spells     = t ? ['t_sp1','t_sp2','t_sp3','t_sp4'] : ['j_sp1','j_sp2','j_sp3','j_sp4'];
  const worlds     = t ? ['t_w1','t_w2']   : ['j_w1','j_w2'];
  const artifacts  = t ? ['t_a1','t_a2']   : ['j_a1','j_a2'];
  const extra      = t ? []                : ['unseen'];

  const deck = [];
  travelers.forEach(k   => { for (let i = 0; i < 5; i++) deck.push(k); }); // 30 cards
  legendaries.forEach(k  => deck.push(k));                                   //  5 cards
  spells.forEach(k       => { deck.push(k); deck.push(k); });                //  8 cards
  worlds.forEach(k       => deck.push(k));                                    //  2 cards
  artifacts.forEach(k    => deck.push(k));                                    //  2 cards
  extra.forEach(k        => deck.push(k));                                    //  1 card (jeet)

  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
