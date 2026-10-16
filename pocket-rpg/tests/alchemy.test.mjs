import test from 'node:test';
import assert from 'node:assert/strict';
import {SeededRng} from '../dist/game-core/rng.js';
import {
  applyCombatConsumable,
  canUseCombatConsumable,
  MAX_POTION_TOXICITY
} from '../dist/game-core/alchemy/consumables.js';
import {resolveRound} from '../dist/game-core/combat/resolution.js';
import {itemDefs} from '../dist/content/items.js';

function combatant(){
  return {
    id:'p',
    hp:50,maxHp:100,
    mana:20,maxMana:100,
    stamina:20,maxStamina:100,
    stunned:false,
    shieldBlock:0,parry:0,evasion:0,accuracy:1,damage:20,
    toxicity:0,
    effects:[]
  };
}

test('healing potion is meaningful but cannot be spammed every round',()=>{
  const potion=itemDefs['healing-potion'].combatUse;
  const first=applyCombatConsumable(combatant(),potion,1);
  assert.equal(first.ok,true);
  assert.equal(first.combatant.hp,75);
  assert.equal(first.combatant.toxicity,70);
  assert.equal(canUseCombatConsumable(first.combatant,potion),false);
  assert.equal(MAX_POTION_TOXICITY,100);
});

test('material class improves potion potency modestly',()=>{
  const potion=itemDefs['mana-draught'].combatUse;
  const base=applyCombatConsumable(combatant(),potion,1).combatant;
  const better=applyCombatConsumable(combatant(),potion,2).combatant;
  assert.equal(base.mana,50);
  assert.ok(better.mana>base.mana);
  assert.ok(better.mana<55);
});

test('combat tonic uses limited duration and toxicity decays after a completed round',()=>{
  const tonic=itemDefs['battle-tonic'].combatUse;
  const applied=applyCombatConsumable(combatant(),tonic,1);
  assert.equal(applied.ok,true);
  assert.equal(applied.combatant.effects[0].roundsRemaining,3);
  const enemy={...combatant(),id:'e',hp:100};
  const state={player:applied.combatant,enemy,round:1};
  const resolved=resolveRound(state,{player:{main:{type:'wait'}},enemy:{main:{type:'wait'}}},new SeededRng(1));
  assert.equal(resolved.state.player.toxicity,40);
  assert.equal(resolved.state.player.effects[0].roundsRemaining,2);
});

test('focus and might are bounded bonuses rather than permanent stat changes',()=>{
  const focus=itemDefs['focus-tonic'].combatUse;
  const applied=applyCombatConsumable(combatant(),focus,1);
  assert.equal(applied.combatant.accuracy,1);
  assert.ok(applied.combatant.effects[0].magnitude<=0.08);
  assert.equal(applied.combatant.effects[0].roundsRemaining,3);
});
