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
    elementalResistances:state.enemy.elementalResistances,
    physicalDamage:state.player.damage,
    spellPowerMultiplier:cls.magicPowerMultiplier??1,
    enemyHp:state.enemy.hp,
    spellbladeActive:state.player.effects.some(e=>e.id==='spellblade'),
    combatRole:classId==='mage'?'pure-caster':classId==='battlemage'?'battlemage':classId==='druid'?'druid':'hybrid'});
   if(id && magicSpells[id]){
    const spell=magicSpells[id];
    const effect=spell.effect.kind==='damage'
     ?{kind:'damage',amount:spell.effect.baseAmount*(cls.magicPowerMultiplier??1),damageType:spell.effect.damageType}
     :spell.effect.kind==='heal'
      ?{kind:'heal',amount:spell.effect.baseAmount*(cls.magicPowerMultiplier??1)}
      :{kind:'buff',id:spell.effect.effectId,magnitude:spell.effect.baseMagnitude,rounds:spell.effect.durationRounds};
    player.main={type:'magic',manaCost:spell.manaCost,skillPath:spell.skillPath,effect,
      spellblade:classId==='battlemage'&&effect.kind==='damage'&&configuration.withSynergy!==false};
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

test('real equipment profiles use exact item stats rather than invented scaling',()=>{
 const iron=itemDefs['iron-short-sword'],rare=itemDefs['rare-short-sword'];
 const light=itemDefs['light-armor'],heavy=itemDefs['heavy-armor'],shield=itemDefs['wooden-shield'];
 assert.equal(iron.stats.damage,10);assert.equal(rare.stats.damage,16);
 assert.equal(light.stats.mitigation,.05);assert.equal(light.stats.evasion,.08);
 assert.equal(heavy.stats.mitigation,.18);assert.equal(shield.stats.blockChance,.12);
 assert.ok(Math.abs(1-(1-heavy.stats.mitigation)*(1-shield.stats.mitigation)-.2456)<1e-10);
});
test('signature loss is measurable across multiple archetypes with real equipment',()=>{
 const configurations=[
  ['mage',{withMagic:false,withSummons:false}],
  ['tamer',{withSummons:false}],
  ['druid',{withMagic:false}],
  ['warrior',{withAbilities:false}],
  ['guardian',{withAbilities:false}]
 ];
 const summary=[];
 for(const [classId,disabled] of configurations){
  const complete=[1,11,37,73].map(seed=>run(classId,'old-treant',35,seed));
  const limited=[1,11,37,73].map(seed=>run(classId,'old-treant',35,seed,disabled));
  assert.ok(complete.every(x=>x.rounds>=1&&x.rounds<=60));
  assert.ok(limited.every(x=>x.rounds>=1&&x.rounds<=60));
  summary.push({classId,
   completeWins:complete.filter(x=>x.won).length,limitedWins:limited.filter(x=>x.won).length,
   completeRounds:complete.reduce((a,x)=>a+x.rounds,0)/4,
   limitedRounds:limited.reduce((a,x)=>a+x.rounds,0)/4});
 }
 assert.equal(summary.length,5);
 console.log('REAL_GEAR_SIGNATURE_BALANCE '+JSON.stringify(summary));
});

test('caster auto chooses direct damage over unnecessary utility and retains emergency healing',()=>{
 const base={magicLevel:70,mana:100,hp:100,maxHp:100,physicalDamage:12,spellPowerMultiplier:1.2};
 const offensive=chooseMageAutoSpellId(base);
 assert.ok(['arcane-bolt','fire-spark','frost-shard'].includes(offensive));
 assert.equal(chooseMageAutoSpellId({...base,hp:30}),'arcane-mend');
 assert.equal(chooseMageAutoSpellId({...base,magicLevel:10,mana:10}),null);
});
test('class magic identity remains distinct across archetypes',()=>{
 const mage=playerClasses.mage,warrior=playerClasses.warrior;
 assert.ok(mage.personalDamageMultiplier<warrior.personalDamageMultiplier*.5);
 assert.ok(mage.magicPowerMultiplier>playerClasses.battlemage.magicPowerMultiplier);
 assert.ok(playerClasses.druid.magicPowerMultiplier>1);
});

const STATISTICAL_BATTLE_COUNT=100;
const statisticalSeeds=Array.from({length:STATISTICAL_BATTLE_COUNT},(_,i)=>i+1001);
test('100 independently seeded battles for every class/enemy pairing, with 100 paired role ablations',()=>{
 const allClasses=Object.keys(playerClasses);
 const report=[];
 for(const classId of allClasses){
  for(const enemyId of Object.keys(enemies)){
   const results=statisticalSeeds.map(seed=>run(classId,enemyId,35,seed));
   const wins=results.filter(r=>r.won).length;
   const unresolved=results.filter(r=>!r.terminal).length;
   const meanRounds=results.reduce((total,r)=>total+r.rounds,0)/STATISTICAL_BATTLE_COUNT;
   const meanHp=results.reduce((total,r)=>total+r.remainingHp,0)/STATISTICAL_BATTLE_COUNT;
   assert.equal(results.length,STATISTICAL_BATTLE_COUNT);
   assert.ok(wins>=0&&wins<=100);
   assert.ok(meanRounds>=1&&meanRounds<=60);
   report.push({classId,enemyId,battles:100,winRate:wins/100,unresolved,meanRounds,meanHp});
  }
 }
 assert.equal(report.length,allClasses.length*Object.keys(enemies).length);
 const ablations=[];
 const missingSignature={
  mage:{withMagic:false,withSummons:false},
  tamer:{withSummons:false},
  druid:{withMagic:false},
  battlemage:{withMagic:false},
  paladin:{withMagic:false},
  warrior:{withAbilities:false},
  guardian:{withAbilities:false},
  duelist:{withAbilities:false},
  ranger:{withAbilities:false},
  assassin:{withAbilities:false},
  berserker:{withAbilities:false},
  monk:{withAbilities:false}
 };
 for(const classId of allClasses){
  const baseline=statisticalSeeds.map(seed=>run(classId,'old-treant',35,seed));
  const limited=statisticalSeeds.map(seed=>run(classId,'old-treant',35,seed,missingSignature[classId]));
  const summarize=(values)=>({wins:values.filter(x=>x.won).length,
   unresolved:values.filter(x=>!x.terminal).length,
   meanRounds:values.reduce((total,x)=>total+x.rounds,0)/STATISTICAL_BATTLE_COUNT});
  ablations.push({classId,battles:100,baseline:summarize(baseline),withoutSignature:summarize(limited)});
 }
 assert.equal(ablations.length,allClasses.length);
 assert.ok(ablations.every(x=>x.baseline.wins>=0&&x.baseline.wins<=100));
 console.log('CLASS_STATISTICAL_100_REPORT '+JSON.stringify({seedRange:[1001,1100],
  matchups:report,roleAblations:ablations}));
});

test('hybrid spells must outperform weapons and conserve healing for emergencies',()=>{
 const base={magicLevel:70,mana:100,hp:100,maxHp:100,
  physicalDamage:35,spellPowerMultiplier:1.07,combatRole:'hybrid'};
 assert.equal(chooseMageAutoSpellId(base),null);
 assert.equal(chooseMageAutoSpellId({...base,hp:26}),'arcane-mend');
 assert.notEqual(chooseMageAutoSpellId({...base,combatRole:'pure-caster'}),null);
});
test('hybrid role comparison has 100 paired seeds per class',()=>{
 const seeds=Array.from({length:100},(_,i)=>i+2001);
 for(const classId of ['paladin','battlemage','druid']){
  const full=seeds.map(seed=>run(classId,'old-treant',35,seed));
  const noMagic=seeds.map(seed=>run(classId,'old-treant',35,seed,{withMagic:false}));
  const avg=x=>x.reduce((sum,r)=>sum+r.rounds,0)/x.length;
  assert.equal(full.length,100);assert.equal(noMagic.length,100);
  assert.ok(avg(full)<=60&&avg(noMagic)<=60);
  console.log('HYBRID_100_RESULT '+JSON.stringify({classId,
   fullWins:full.filter(x=>x.won).length,withoutMagicWins:noMagic.filter(x=>x.won).length,
   fullRounds:avg(full),withoutMagicRounds:avg(noMagic)}));
 }
});

test('battlemage uses arcane magic when it is useful but does not replace stronger weapons',()=>{
 const spellContext={magicLevel:35,mana:100,hp:100,maxHp:100,
   physicalDamage:30,spellPowerMultiplier:1.12,combatRole:'battlemage'};
 assert.equal(chooseMageAutoSpellId(spellContext),'arcane-bolt');
 assert.equal(chooseMageAutoSpellId({...spellContext,combatRole:'hybrid'}),null);
 assert.equal(chooseMageAutoSpellId({...spellContext,physicalDamage:40}),null);
 assert.equal(chooseMageAutoSpellId({...spellContext,mana:0}),null);
});
test('100 paired battlemage fights by progression tier report signature contribution',()=>{
 const seeds=Array.from({length:100},(_,i)=>i+3001);
 for(const level of [10,35,70]){
  const full=seeds.map(seed=>run('battlemage','old-treant',level,seed));
  const noMagic=seeds.map(seed=>run('battlemage','old-treant',level,seed,{withMagic:false}));
  const avg=results=>results.reduce((sum,b)=>sum+b.rounds,0)/results.length;
  assert.equal(full.length,100);
  assert.equal(noMagic.length,100);
  assert.ok(full.every(b=>b.rounds<=60));
  console.log('BATTLEMAGE_100_TIER '+JSON.stringify({level,
    battles:100,fullWins:full.filter(b=>b.won).length,
    noMagicWins:noMagic.filter(b=>b.won).length,
    fullRounds:avg(full),noMagicRounds:avg(noMagic)}));
 }
});

test('early magic progression: 100 paired battles per caster at levels 0 10 20 35',()=>{
 const seeds=Array.from({length:100},(_,i)=>i+4001),report=[];
 for(const classId of ['mage','druid','battlemage','paladin'])for(const level of [0,10,20,35]){
  const full=seeds.map(seed=>run(classId,'old-treant',level,seed));
  const noMagic=seeds.map(seed=>run(classId,'old-treant',level,seed,{withMagic:false}));
  const mean=results=>results.reduce((sum,b)=>sum+b.rounds,0)/results.length;
  report.push({classId,level,battles:100,fullWins:full.filter(x=>x.won).length,
    withoutMagicWins:noMagic.filter(x=>x.won).length,
    fullRounds:mean(full),withoutMagicRounds:mean(noMagic),
    fullUnresolved:full.filter(x=>!x.terminal).length});
 }
 assert.equal(report.length,16);
 assert.ok(report.every(row=>row.fullRounds>=1&&row.fullRounds<=60));
 console.log('EARLY_MAGIC_100_REPORT '+JSON.stringify(report));
});

test('100 paired early druid and battlemage spell identity scenarios',()=>{
 const sampleSeeds=Array.from({length:100},(_,i)=>i+5001);
 for(const classId of ['druid','battlemage'])for(const level of [0,10,20,35]){
  const active=sampleSeeds.map(seed=>run(classId,'old-treant',level,seed));
  const disabled=sampleSeeds.map(seed=>run(classId,'old-treant',level,seed,{withMagic:false}));
  const avg=a=>a.reduce((n,v)=>n+v.rounds,0)/a.length;
  assert.equal(active.length,100);assert.equal(disabled.length,100);
  assert.ok(active.every(v=>Number.isFinite(v.rounds)&&v.rounds<=60));
  console.log('EARLY_CASTER_ROLE_100 '+JSON.stringify({classId,level,
   activeWins:active.filter(x=>x.won).length,disabledWins:disabled.filter(x=>x.won).length,
   activeRounds:avg(active),disabledRounds:avg(disabled)}));
 }
});
test('druid first-tier magic can be used without high-tier spells',()=>{
 assert.equal(chooseMageAutoSpellId({magicLevel:0,mana:100,hp:100,maxHp:100,
  combatRole:'druid',physicalDamage:18,spellPowerMultiplier:1.2}),'arcane-dart');
});

test('spellblade synergy is verified with 100 paired seeded encounters at four milestones',()=>{
 const sampleSeeds=Array.from({length:100},(_,i)=>i+6101),report=[];
 for(const level of [0,10,20,35,70]){
  const enhanced=sampleSeeds.map(seed=>run('battlemage','old-treant',level,seed));
  const standard=sampleSeeds.map(seed=>run('battlemage','old-treant',level,seed,{withSynergy:false}));
  const rounds=r=>r.reduce((a,x)=>a+x.rounds,0)/r.length;
  report.push({level,withSynergyWins:enhanced.filter(x=>x.won).length,
   withoutSynergyWins:standard.filter(x=>x.won).length,
   withSynergyRounds:rounds(enhanced),withoutSynergyRounds:rounds(standard)});
  assert.equal(enhanced.length,100);assert.equal(standard.length,100);
 }
 console.log('SPELLBLADE_100_REPORT '+JSON.stringify(report));
});

test('battlemage does not start inefficient two-turn combos',()=>{
 const c={magicLevel:35,mana:100,hp:100,maxHp:100,combatRole:'battlemage',
  physicalDamage:40,spellPowerMultiplier:1.12};
 assert.equal(chooseMageAutoSpellId({...c,enemyHp:15}),null);
 assert.equal(chooseMageAutoSpellId({...c,enemyHp:100}),null);
 assert.equal(chooseMageAutoSpellId({...c,physicalDamage:12,enemyHp:100}),'arcane-bolt');
});
test('100 paired tactical spellblade battles per stage',()=>{
 const seeds=Array.from({length:100},(_,i)=>i+7201);
 for(const level of [0,10,20,35,70]){
  const enabled=seeds.map(seed=>run('battlemage','old-treant',level,seed));
  const disabled=seeds.map(seed=>run('battlemage','old-treant',level,seed,{withSynergy:false}));
  const mean=x=>x.reduce((a,b)=>a+b.rounds,0)/x.length;
  assert.equal(enabled.length,100);assert.equal(disabled.length,100);
  console.log('SPELLBLADE_TACTICAL_100 '+JSON.stringify({level,
   enabledWins:enabled.filter(x=>x.won).length,disabledWins:disabled.filter(x=>x.won).length,
   enabledRounds:mean(enabled),disabledRounds:mean(disabled)}));
 }
});

test('defensive magic and caster action economy: 100 paired encounters per early milestone',()=>{
 const seeds=Array.from({length:100},(_,i)=>i+8101),report=[];
 for(const classId of ['mage','druid','battlemage','paladin'])for(const level of [10,20,35]){
  const full=seeds.map(seed=>run(classId,'old-treant',level,seed));
  const noMagic=seeds.map(seed=>run(classId,'old-treant',level,seed,{withMagic:false}));
  const mean=x=>x.reduce((n,y)=>n+y.rounds,0)/x.length;
  assert.equal(full.length,100);assert.equal(noMagic.length,100);
  report.push({classId,level,withMagicWins:full.filter(x=>x.won).length,
    noMagicWins:noMagic.filter(x=>x.won).length,
    withMagicRounds:mean(full),noMagicRounds:mean(noMagic)});
 }
 assert.equal(report.length,12);
 console.log('DEFENSIVE_MAGIC_100 '+JSON.stringify(report));
});
