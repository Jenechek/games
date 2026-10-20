import test from 'node:test';
import assert from 'node:assert/strict';
import {classAbilities,classAbilityAction,classAbilityAtLevel,CLASS_ABILITY_MILESTONES} from '../dist/content/class-abilities.js';
import {playerClasses} from '../dist/content/classes.js';
import {resolveRound} from '../dist/game-core/combat/resolution.js';
const combatant=(id)=>({id,hp:100,maxHp:100,mana:100,maxMana:100,stamina:100,maxStamina:100,stunned:false,shieldBlock:0,parry:0,evasion:0,accuracy:1,damage:20,effects:[]});
test('every class has an active ability unlocked at mastery level 10',()=>{
 assert.deepEqual(Object.keys(classAbilities).sort(),Object.keys(playerClasses).sort());
 for(const id of Object.keys(playerClasses)){
  const actor=combatant('player');actor.hp=60;
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

test('all twelve classes have exact fixed ability evolutions at seven milestones',()=>{
 assert.deepEqual(CLASS_ABILITY_MILESTONES,[10,20,35,50,70,85,100]);
 for(const id of Object.keys(classAbilities)){
  assert.equal(classAbilityAtLevel(id,0),null);
  let previous=null;
  for(const milestone of CLASS_ABILITY_MILESTONES){
   const current=classAbilityAtLevel(id,milestone);
   assert.equal(current.requiredLevel,milestone,id);
   assert.equal(classAbilityAtLevel(id,Math.min(100,milestone+1)).power,current.power,id);
   if(previous){
    assert.ok(current.power>=previous.power,id);
    assert.ok(current.staminaCost>=previous.staminaCost,id);
   }
   if(current.effect==='strike')assert.ok(current.power<=2.5,id);
   if(current.effect==='heal')assert.ok(current.power<=45,id);
   if(current.effect==='guard'||current.effect==='focus')assert.ok(current.power<=.2,id);
   assert.ok(current.staminaCost<=45,id);
   previous=current;
  }
 }
});
test('each milestone action respects stamina and the one-action round',()=>{
 for(const id of Object.keys(classAbilities)){
  for(const level of CLASS_ABILITY_MILESTONES){
   const player=combatant('player');player.hp=50;
   const action=classAbilityAction(id,level,player);
   assert.ok(action,id+'/'+level);
   const r=resolveRound({player,enemy:combatant('enemy'),round:1},
    {player:{main:action},enemy:{main:{type:'wait'}}},{chance:()=>true});
   assert.equal(r.log.filter(item=>item.phase==='player-main').length,1,id+'/'+level);
   assert.ok(r.state.player.stamina>=0&&r.state.player.stamina<=100);
   assert.equal(player.stamina,100);
  }
 }
});
