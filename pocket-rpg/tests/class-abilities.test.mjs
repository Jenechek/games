import test from 'node:test';
import assert from 'node:assert/strict';
import {classAbilities,classAbilityAction} from '../dist/content/class-abilities.js';
import {playerClasses} from '../dist/content/classes.js';
import {resolveRound} from '../dist/game-core/combat/resolution.js';
const combatant=(id)=>({id,hp:100,maxHp:100,mana:100,maxMana:100,stamina:100,maxStamina:100,stunned:false,shieldBlock:0,parry:0,evasion:0,accuracy:1,damage:20,effects:[]});
test('every class has an active ability unlocked at mastery level 10',()=>{
 assert.deepEqual(Object.keys(classAbilities).sort(),Object.keys(playerClasses).sort());
 for(const id of Object.keys(playerClasses)){
  const actor=combatant('player');
  assert.equal(classAbilityAction(id,9,actor),null);
  assert.equal(classAbilityAction(id,10,actor)?.type,'class-ability',id);
 }
});
test('class abilities obey stamina and main-action economy for all classes',()=>{
 for(const id of Object.keys(playerClasses)){
  const player=combatant('player');player.hp=60;
  const action=classAbilityAction(id,10,player);
  assert.ok(action,id);
  const input={player,enemy:combatant('enemy'),round:1};
  const result=resolveRound(input,{player:{main:action},enemy:{main:{type:'wait'}}},{chance:()=>true});
  assert.equal(result.log.filter(e=>e.phase==='player-main').length,1,id);
  assert.equal(result.state.player.stamina,Math.min(100,100-action.staminaCost+15),id);
  assert.equal(input.player.stamina,100,id);
 }
});
test('no ability can activate without sufficient stamina or while locked',()=>{
 for(const [id,ability] of Object.entries(classAbilities)){
  const player=combatant('player');player.stamina=ability.staminaCost-1;player.hp=50;
  assert.equal(classAbilityAction(id,10,player),null,id);
 }
});
test('defensive class skill cannot be farmed by redundant renewal',()=>{
 const actor=combatant('player');
 const a=classAbilityAction('guardian',10,actor);
 const r=resolveRound({player:actor,enemy:combatant('enemy'),round:1},{player:{main:a},enemy:{main:{type:'wait'}}},{chance:()=>true});
 assert.equal(classAbilityAction('guardian',10,r.state.player),null);
});
