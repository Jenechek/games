import test from 'node:test';
import assert from 'node:assert/strict';
import {SeededRng} from '../dist/game-core/rng.js';
import {resolveRound} from '../dist/game-core/combat/resolution.js';
import {chooseAutoAction} from '../dist/game-core/combat/auto-ai.js';
import {chooseAutoClassAbility} from '../dist/content/class-abilities.js';
import {playerClasses} from '../dist/content/classes.js';
import {enemies} from '../dist/content/enemies.js';
import {summarizeBalance,balanceOutliers} from '../dist/game-core/combat/balance-report.js';
const seeds=[1,3,7,11,17,23,31,43,59,71,89,101,127,151,181,211];
function fighter(id,hp,damage,accuracy){
 return {id,hp,maxHp:hp,mana:100,maxMana:100,stamina:100,maxStamina:100,
  stunned:false,shieldBlock:0,parry:0,evasion:.08,accuracy,damage,effects:[]};
}
function battle(classId,enemyId,seed){
 const cls=playerClasses[classId],def=enemies[enemyId],rng=new SeededRng(seed);
 const hp=Math.round(100*(cls.hpMultiplier??1));
 let state={round:1,player:{...fighter('player',hp,18*cls.personalDamageMultiplier,.85+(cls.accuracyBonus??0)),
  evasion:Math.max(0,.08+(cls.evasionBonus??0)),
  damageMitigation:cls.mitigationBonus??0,
  maxMana:Math.round(100*(cls.manaMultiplier??1)),mana:Math.round(100*(cls.manaMultiplier??1))},
 enemy:{...fighter(def.id,def.maxHp,def.damage,.75),evasion:.05,mana:50,maxMana:50,
 elementalResistances:{...def.elementalResistances}}};
 let spent=0,turns=0,skillsUsed=0;
 while(turns<60&&state.player.hp>0&&state.enemy.hp>0){
  const chosen=chooseAutoClassAbility(classId,35,state.player,state.enemy);
  const player={main:chosen??{type:'attack'}};
  const enemy=chooseAutoAction(state,'enemy',rng);
  const previous=state.player.stamina;
  const result=resolveRound(state,{player,enemy},rng);
  const action=result.log.find(x=>x.phase==='player-main'&&x.action==='class-ability');
  if(action?.success){skillsUsed++;spent+=chosen.staminaCost;}
  state=result.state;turns++;
  for(const unit of [state.player,state.enemy]){
   assert.ok(Number.isFinite(unit.hp)&&unit.hp>=0&&unit.hp<=unit.maxHp);
   assert.ok(Number.isFinite(unit.stamina)&&unit.stamina>=0&&unit.stamina<=unit.maxStamina);
   assert.ok(Number.isFinite(unit.mana)&&unit.mana>=0&&unit.mana<=unit.maxMana);
  }
  assert.ok(previous>=0&&spent>=0);
 }
 return {won:state.enemy.hp<=0,rounds:turns,remainingHp:state.player.hp,skillsUsed,spent,terminal:state.player.hp<=0||state.enemy.hp<=0};
}
test('576 seeded battles remain bounded and deterministic for 12 classes against 3 enemies',()=>{
 const totals={};
 for(const id of Object.keys(playerClasses)){
  let victories=0,skillUses=0,rounds=0;
  for(const enemy of Object.keys(enemies))for(const seed of seeds){
   const result=battle(id,enemy,seed);
   assert.deepEqual(result,battle(id,enemy,seed),id+'/'+enemy+'/'+seed);
   assert.ok(result.terminal,'unresolved '+id+'/'+enemy+'/'+seed);
   assert.ok(result.rounds<=60);
   victories+=Number(result.won);skillUses+=result.skillsUsed;rounds+=result.rounds;
  }
  totals[id]={victories,skillUses,rounds};
  assert.ok(victories>=1,'class cannot win any fight: '+id);
  assert.ok(rounds>0&&rounds<=2880);
 }
 assert.equal(Object.keys(totals).length,12);
});
test('all classes retain an available baseline attack even at zero stamina',()=>{
 for(const id of Object.keys(playerClasses)){
  const player=fighter('player',100,18,.85);player.stamina=0;
  const enemy=fighter('enemy',100,10,.75);
  assert.equal(chooseAutoClassAbility(id,35,player,enemy),null);
  const r=resolveRound({player,enemy,round:1},{player:{main:{type:'attack'}},enemy:{main:{type:'wait'}}},{chance:()=>true});
  assert.ok(r.state.enemy.hp<100);
 }
});

test('balance report aggregates all 576 samples into 36 reproducible matchup statistics',()=>{
 const samples=[];
 for(const classId of Object.keys(playerClasses))
  for(const enemyId of Object.keys(enemies))
   for(const seed of seeds){
    const b=battle(classId,enemyId,seed);
    samples.push({classId,enemyId,won:b.won,rounds:b.rounds,remainingHp:b.remainingHp,
      skillsUsed:b.skillsUsed,staminaSpent:b.spent});
   }
 const rows=summarizeBalance(samples);
 assert.equal(samples.length,576);
 assert.equal(rows.length,36);
 for(const row of rows){
  assert.equal(row.battles,16);
  assert.ok(row.winRate>=0&&row.winRate<=1);
  assert.ok(row.avgRounds>0&&row.avgRounds<=60);
  assert.ok(row.avgRemainingHp>=0);
  assert.ok(row.avgSkillsUsed>=0);
  assert.ok(row.avgStaminaSpent>=0);
 }
 assert.deepEqual(rows,summarizeBalance([...samples].reverse()));
 const flags=balanceOutliers(rows);
 assert.ok(Array.isArray(flags));
 // Keep observed imbalances visible to CI without assuming equal win rates across enemy levels.
 console.log('CLASS_BALANCE_REPORT '+JSON.stringify({rows,outliers:flags}));
});
test('balance summary rejects invalid measurements and flags extreme matchups',()=>{
 assert.deepEqual(summarizeBalance([]),[]);
 assert.throws(()=>summarizeBalance([{classId:'a',enemyId:'b',won:true,rounds:NaN,remainingHp:5,skillsUsed:0,staminaSpent:0}]),/invalid/);
 const rows=summarizeBalance(Array.from({length:16},(_,i)=>({
  classId:'a',enemyId:'b',won:i<16,rounds:4,remainingHp:5,skillsUsed:2,staminaSpent:25
 })));
 assert.deepEqual(balanceOutliers(rows),['a/b: all wins']);
 assert.deepEqual(balanceOutliers(rows,17),[]);
});
