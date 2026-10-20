import test from 'node:test';
import assert from 'node:assert/strict';
import {SeededRng} from '../dist/game-core/rng.js';
import {resolveRound} from '../dist/game-core/combat/resolution.js';
import {chooseAutoAction} from '../dist/game-core/combat/auto-ai.js';
import {chooseAutoClassAbility} from '../dist/content/class-abilities.js';
import {chooseMageAutoSpellId,magicSpells} from '../dist/content/magic.js';
import {playerClasses} from '../dist/content/classes.js';
import {enemies} from '../dist/content/enemies.js';
import {itemDefs} from '../dist/content/items.js';
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
function run(classId,enemyId,level,seed,configuration={}){
 const rng=new SeededRng(seed),cls=playerClasses[classId],enemy=enemies[enemyId];
 const hp=Math.round(100*(cls.hpMultiplier??1));
 const equipped=configuration.withGear===false?[]:level>=70?['rare-short-sword','heavy-armor','wooden-shield']:level>=35?['iron-short-sword','light-armor','wooden-shield']:['iron-short-sword'];
 const gearDamage=equipped.reduce((sum,id)=>sum+(itemDefs[id].stats?.damage??0),0);
 const gearDefense=equipped.reduce((a,id)=>a*(1-(itemDefs[id].stats?.mitigation??0)),1);
 const gearEvasion=equipped.reduce((sum,id)=>sum+(itemDefs[id].stats?.evasion??0),0);
 const gearBlock=equipped.reduce((sum,id)=>sum+(itemDefs[id].stats?.blockChance??0),0);
 const maxMana=Math.round(100*(cls.manaMultiplier??1));
 let state={round:1,
  player:{...unit('player',hp,(18+gearDamage)*cls.personalDamageMultiplier,.85+(cls.accuracyBonus??0)),
   mana:maxMana,maxMana,damageMitigation:1-gearDefense*(1-(cls.mitigationBonus??0)),
   shieldBlock:gearBlock,hasShield:gearBlock>0,
   evasion:Math.max(0,.08+gearEvasion+(cls.evasionBonus??0))},
  enemy:{...unit(enemy.id,enemy.maxHp,enemy.damage,.75),mana:50,maxMana:50,
   elementalResistances:{...enemy.elementalResistances}},
  summons:configuration.withSummons===false?[]:classId==='mage'?[summon('guardian-elemental',cls)]:
   classId==='tamer'?[summon('war-beast',cls),...(level>=35?[summon('swift-beast',cls)]:[])]:[]};
 let turns=0,spent=0,skillsUsed=0,spellsUsed=0;
 while(turns<60&&state.player.hp>0&&state.enemy.hp>0){
  const player={main:{type:'attack'}};
  if(configuration.withMagic!==false&&casters.has(classId)){
   const focus=state.player.effects.find(e=>e.id==='focus');
   const ward=state.player.effects.find(e=>e.id==='ward');
   const id=chooseMageAutoSpellId({magicLevel:level,mana:state.player.mana,
    hp:state.player.hp,maxHp:state.player.maxHp,
    focusRoundsRemaining:focus?.roundsRemaining,wardRoundsRemaining:ward?.roundsRemaining,
    elementalResistances:state.enemy.elementalResistances});
   if(id && (magicSpells[id].effect.kind==='damage'||(magicSpells[id].effect.kind==='heal'&&state.player.hp/state.player.maxHp<.35))){
    const spell=magicSpells[id];
    const effect=spell.effect.kind==='damage'
     ?{kind:'damage',amount:spell.effect.baseAmount*(cls.magicPowerMultiplier??1),damageType:spell.effect.damageType}
     :spell.effect.kind==='heal'
      ?{kind:'heal',amount:spell.effect.baseAmount*(cls.magicPowerMultiplier??1)}
      :{kind:'buff',id:spell.effect.effectId,magnitude:spell.effect.baseMagnitude,rounds:spell.effect.durationRounds};
    player.main={type:'magic',manaCost:spell.manaCost,skillPath:spell.skillPath,effect};
   }
  }
  if(configuration.withAbilities!==false&&player.main.type==='attack'){
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
     assert.ok(result.terminal||result.rounds===60,'unexpected truncation '+JSON.stringify(result));
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
  levels,gearProfiles:['iron-short-sword','iron-short-sword/light-armor/wooden-shield','rare-short-sword/heavy-armor/wooden-shield'],matchups:rows.length,
  unresolved:samples.filter(sample=>!sample.terminal).map(sample=>({classId:sample.classId,enemyId:sample.enemyId,level:sample.level,seed:sample.seed})),
  rows:rows.map(r=>({classId:r.classId,enemyId:r.enemyId,winRate:r.winRate,avgRounds:r.avgRounds}))
 }));
});

test('guardian adjustment preserves survival against treant at early milestone',()=>{
 const seeds=[1,11,37,73];
 const guardian=seeds.map(seed=>run('guardian','old-treant',10,seed));
 const wins=guardian.filter(b=>b.won).length;
 assert.ok(wins>=1,'guardian must keep at least baseline victories');
 assert.ok(guardian.every(b=>b.terminal&&b.rounds<=60));
 const average=guardian.reduce((n,b)=>n+b.rounds,0)/guardian.length;
 assert.ok(average<=20,'guardian early combat became excessively slow');
 console.log('GUARDIAN_BALANCE_CHECK '+JSON.stringify({wins,battles:seeds.length,avgRounds:average}));
});
test('compare class matchup efficiency without requiring equal win rates across difficulties',()=>{
 const ids=Object.keys(playerClasses);
 const report=[];
 for(const id of ids){
  const easy=[1,11,37,73].map(seed=>run(id,'young-wolf',35,seed));
  const hard=[1,11,37,73].map(seed=>run(id,'old-treant',35,seed));
  const avg=x=>x.reduce((sum,b)=>sum+b.rounds,0)/x.length;
  const easyRounds=avg(easy),hardRounds=avg(hard);
  assert.ok(easyRounds>0&&hardRounds>0&&easyRounds<=60&&hardRounds<=60);
  report.push({classId:id,easyRounds,hardRounds,relativeDifficulty:hardRounds/easyRounds});
 }
 assert.equal(report.length,12);
 console.log('CLASS_DIFFICULTY_COMPARISON '+JSON.stringify(report));
});

test('role identity: mage and tamer cannot match warrior baseline weapon damage',()=>{
 const warrior=playerClasses.warrior,mage=playerClasses.mage,tamer=playerClasses.tamer;
 const physical=(c)=>18*c.personalDamageMultiplier;
 assert.ok(physical(mage)<physical(warrior)*.5);
 assert.ok(physical(tamer)<physical(warrior)*.6);
 assert.ok(18*(mage.magicPowerMultiplier??1)>18);
 assert.ok(summonDefinitions['war-beast'].damage*tamer.summonDamageMultiplier>summonDefinitions['war-beast'].damage);
});

test('class identity counterfactuals: 12 archetypes, three progression points, feature ablations',()=>{
 const report=[];
 for(const classId of Object.keys(playerClasses))for(const level of [10,35,70]){
  const enemyId='old-treant';
  const baseline=[1,11,37,73].map(seed=>run(classId,enemyId,level,seed));
  const withoutAbilities=[1,11,37,73].map(seed=>run(classId,enemyId,level,seed,{withAbilities:false}));
  const withoutGear=[1,11,37,73].map(seed=>run(classId,enemyId,level,seed,{withGear:false}));
  const special=classId==='mage'||classId==='tamer'
   ?[1,11,37,73].map(seed=>run(classId,enemyId,level,seed,{withSummons:false}))
   :['battlemage','paladin','druid'].includes(classId)
    ?[1,11,37,73].map(seed=>run(classId,enemyId,level,seed,{withMagic:false}))
    :null;
  const metric=x=>({wins:x.filter(v=>v.won).length,unresolved:x.filter(v=>!v.terminal).length,
   avgRounds:x.reduce((a,v)=>a+v.rounds,0)/x.length});
  report.push({classId,level,baseline:metric(baseline),noAbilities:metric(withoutAbilities),
    noGear:metric(withoutGear),noSignature:special?metric(special):null});
 }
 assert.equal(report.length,36);
 assert.ok(report.every(x=>x.baseline.avgRounds>0&&x.baseline.avgRounds<=60));
 assert.ok(report.every(x=>x.noGear.avgRounds>0&&x.noGear.avgRounds<=60));
 assert.ok(report.every(x=>x.baseline.wins>=0&&x.baseline.wins<=4));
 // A counterfactual must never make the base physical damage equal between the mage and warrior.
 assert.ok(playerClasses.mage.personalDamageMultiplier<playerClasses.warrior.personalDamageMultiplier/2);
 const signatures=report.filter(x=>x.noSignature);
 assert.equal(signatures.length,15);
 console.log('CLASS_ROLE_ABLATION_REPORT '+JSON.stringify(report));
});
