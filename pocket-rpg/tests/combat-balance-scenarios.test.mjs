import test from 'node:test';
import assert from 'node:assert/strict';
import {SeededRng} from '../dist/game-core/rng.js';
import {chooseAutoAction} from '../dist/game-core/combat/auto-ai.js';
import {resolveRound} from '../dist/game-core/combat/resolution.js';
import {enemies} from '../dist/content/enemies.js';

function fighter(id,hp,damage,accuracy=1){
 return {id,hp,maxHp:hp,mana:100,maxMana:100,stamina:100,maxStamina:100,
 stunned:false,shieldBlock:0,parry:0,evasion:0,accuracy,damage,effects:[]};
}
function simulate(enemyId,profile,seed){
 const rng=new SeededRng(seed),def=enemies[enemyId];
 let state={round:1,player:fighter('player',100,profile==='defensive'?15:18,.85),
 enemy:{...fighter(def.id,def.maxHp,def.damage,.75),mana:50,maxMana:50,
 elementalResistances:{...def.elementalResistances}}};
 const trace=[];
 for(let turn=0;turn<45&&state.player.hp>0&&state.enemy.hp>0;turn++){
  const player=profile==='mage'&&state.player.mana>=25
   ?{main:{type:'magic',manaCost:25,skillPath:['magic','arcane','concentration'],
     effect:{kind:'damage',amount:18,damageType:'arcane'}}}
   :profile==='defensive'&&turn===0
    ?{main:{type:'magic',manaCost:30,skillPath:['magic','protection'],
      effect:{kind:'buff',id:'ward',magnitude:.10,rounds:3}}}
    :{main:{type:'attack'}};
  const enemy=chooseAutoAction(state,'enemy',rng);
  const result=resolveRound(state,{player,enemy},rng);
  trace.push([result.state.round,result.state.player.hp,result.state.enemy.hp,enemy.main.type]);
  state=result.state;
  for(const unit of [state.player,state.enemy]){
   assert.ok(Number.isFinite(unit.hp)&&unit.hp>=0&&unit.hp<=unit.maxHp);
   assert.ok(Number.isFinite(unit.mana)&&unit.mana>=0&&unit.mana<=unit.maxMana);
   assert.ok(Number.isFinite(unit.stamina)&&unit.stamina>=0&&unit.stamina<=unit.maxStamina);
  }
 }
 return {trace,state};
}
test('36 seeded battles stay finite, terminate, and are replayable across three profiles',()=>{
 for(const enemy of Object.keys(enemies))
  for(const profile of ['physical','mage','defensive'])
   for(const seed of [1,7,19,47]){
    const a=simulate(enemy,profile,seed),b=simulate(enemy,profile,seed);
    assert.deepEqual(a.trace,b.trace,`${enemy} / ${profile} / ${seed}`);
    assert.ok(a.trace.length>=1&&a.trace.length<=45);
    assert.ok(a.state.player.hp===0||a.state.enemy.hp===0,
      `unresolved: ${enemy} / ${profile} / ${seed}`);
   }
});
test('wounded spellcaster conserves mana with ordinary action on third round',()=>{
 for(const id of ['bandit','old-treant']){
  const enemy=fighter(id,100,12);enemy.hp=19;enemy.mana=50;
  const state={round:3,player:fighter('player',100,18),enemy};
  const action=chooseAutoAction(state,'enemy',new SeededRng(3));
  assert.equal(action.main.type,'attack');
  assert.equal(action.style,'defensive');
 }
});
