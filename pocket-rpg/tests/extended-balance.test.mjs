import test from 'node:test';
import assert from 'node:assert/strict';
import {SeededRng} from '../dist/game-core/rng.js';
import {resolveRound} from '../dist/game-core/combat/resolution.js';
import {chooseAutoAction} from '../dist/game-core/combat/auto-ai.js';
import {chooseAutoClassAbility} from '../dist/content/class-abilities.js';
import {chooseMageAutoSpellId,magicSpells} from '../dist/content/magic.js';
import {playerClasses} from '../dist/content/classes.js';
import {enemies} from '../dist/content/enemies.js';
import {summonDefinitions} from '../dist/content/summons.js';
import {summarizeBalance} from '../dist/game-core/combat/balance-report.js';

const levels=[10,35,70],seeds=[1,11,37,73];
const casters=new Set(['mage','battlemage','paladin','druid']);
const unit=(id,hp,damage,accuracy)=>({id,hp,maxHp:hp,mana:100,maxMana:100,
 stamina:100,maxStamina:100,stunned:false,shieldBlock:0,parry:0,
 evasion:.08,accuracy,damage,effects:[]});
function summon(id,classDef){
 const def=summonDefinitions[id];
 const hp=Math.round(def.maxHp*classDef.summonHpMultiplier);
 return {instanceId:'balance-'+id,definitionId:id,hp,maxHp:hp,
  stamina:def.maxStamina,maxStamina:def.maxStamina,
  summonedAt:0,recoveryUpdatedAt:0,damage:def.damage*classDef.summonDamageMultiplier,
  accuracy:def.accuracy,evasion:def.evasion,interceptChance:def.interceptChance,
  attackStaminaCost:def.attackStaminaCost,
  staminaRecoveryPerRound:def.staminaRecoveryPerRound,role:def.role,
  passiveImmunities:[...def.passiveImmunities]};
}
function run(classId,enemyId,level,seed){
 const rng=new SeededRng(seed),cls=playerClasses[classId],enemy=enemies[enemyId];
 const hp=Math.round(100*(cls.hpMultiplier??1));
 const gear=level>=70?1.22:level>=35?1.10:1;
 const defense=level>=70?.12:level>=35?.06:0;
 const maxMana=Math.round(100*(cls.manaMultiplier??1));
 let state={round:1,
  player:{...unit('player',hp,18*cls.personalDamageMultiplier*gear,.85+(cls.accuracyBonus??0)),
   mana:maxMana,maxMana,damageMitigation:1-(1-defense)*(1-(cls.mitigationBonus??0)),
   evasion:Math.max(0,.08+(cls.evasionBonus??0))},
  enemy:{...unit(enemy.id,enemy.maxHp,enemy.damage,.75),mana:50,maxMana:50,
   elementalResistances:{...enemy.elementalResistances}},
  summons:classId==='mage'?[summon('guardian-elemental',cls)]:
   classId==='tamer'?[summon('war-beast',cls),...(level>=35?[summon('swift-beast',cls)]:[])]:[]};
 let turns=0,spent=0,skillsUsed=0,spellsUsed=0;
 while(turns<60&&state.player.hp>0&&state.enemy.hp>0){
  const player={main:{type:'attack'}};
  if(casters.has(classId)){
   const focus=state.player.effects.find(e=>e.id==='focus');
   const ward=state.player.effects.find(e=>e.id==='ward');
   const id=chooseMageAutoSpellId({magicLevel:level,mana:state.player.mana,
    hp:state.player.hp,maxHp:state.player.maxHp,
    focusRoundsRemaining:focus?.roundsRemaining,wardRoundsRemaining:ward?.roundsRemaining,
    elementalResistances:state.enemy.elementalResistances});
   if(id){
    const spell=magicSpells[id];
    const effect=spell.effect.kind==='damage'
     ?{kind:'damage',amount:spell.effect.baseAmount,damageType:spell.effect.damageType}
     :spell.effect.kind==='heal'
      ?{kind:'heal',amount:spell.effect.baseAmount}
      :{kind:'buff',id:spell.effect.effectId,magnitude:spell.effect.baseMagnitude,rounds:spell.effect.durationRounds};
    player.main={type:'magic',manaCost:spell.manaCost,skillPath:spell.skillPath,effect};
   }
  }
  if(player.main.type==='attack'){
   const action=chooseAutoClassAbility(classId,level,state.player,state.enemy);
   if(action)player.main=action;
  }
  const result=resolveRound(state,{player,enemy:chooseAutoAction(state,'enemy',rng)},rng);
  const used=result.log.find(e=>e.phase==='player-main'&&e.success);
  if(used?.action==='class-ability'){spent+=player.main.staminaCost;skillsUsed++;}
  if(used?.action==='magic')spellsUsed++;
  state=result.state;turns++;
  for(const u of [state.player,state.enemy]){
   assert.ok(Number.isFinite(u.hp)&&u.hp>=0&&u.hp<=u.maxHp);
   assert.ok(Number.isFinite(u.mana)&&u.mana>=0&&u.mana<=u.maxMana);
   assert.ok(Number.isFinite(u.stamina)&&u.stamina>=0&&u.stamina<=u.maxStamina);
  }
 }
 return {classId,enemyId,level,seed,won:state.enemy.hp<=0,rounds:turns,
  terminal:state.enemy.hp<=0||state.player.hp<=0,
  remainingHp:state.player.hp,skillsUsed,staminaSpent:spent,spellsUsed};
}
test('432 reproducible multi-level battles cover gear, caster mana and summon archetypes',()=>{
 const samples=[];
 for(const classId of Object.keys(playerClasses))
  for(const enemyId of Object.keys(enemies))
   for(const level of levels)
    for(const seed of seeds){
     const result=run(classId,enemyId,level,seed);
     assert.deepEqual(result,run(classId,enemyId,level,seed));
     assert.ok(result.terminal,'unresolved '+JSON.stringify(result));
     samples.push(result);
    }
 assert.equal(samples.length,432);
 assert.equal(samples.filter(s=>s.classId==='mage').length,36);
 assert.ok(samples.some(s=>s.spellsUsed>0));
 assert.ok(samples.some(s=>s.skillsUsed>0));
 const rows=summarizeBalance(samples.map(s=>({...s,
  enemyId:s.enemyId+'@'+s.level})));
 assert.equal(rows.length,108);
 for(const row of rows)assert.equal(row.battles,4);
 console.log('EXTENDED_CLASS_BALANCE_REPORT '+JSON.stringify({
  levels,gearMultipliers:[1,1.10,1.22],matchups:rows.length,
  rows:rows.map(r=>({classId:r.classId,enemyId:r.enemyId,winRate:r.winRate,avgRounds:r.avgRounds}))
 }));
});
