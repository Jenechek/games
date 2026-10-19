import test from 'node:test';import assert from 'node:assert/strict';import {SeededRng} from '../dist/game-core/rng.js';import {combineDiminishingPercentages,cappedChance,effectiveEvasion} from '../dist/game-core/combat/mitigation.js';import {resolveRound} from '../dist/game-core/combat/resolution.js';
const baseCombat=()=>({player:{id:'p',hp:100,maxHp:100,mana:50,maxMana:100,stamina:50,maxStamina:100,stunned:false,shieldBlock:0,parry:0,evasion:0,accuracy:1,damage:20},enemy:{id:'e',hp:100,maxHp:100,mana:50,maxMana:100,stamina:50,maxStamina:100,stunned:false,shieldBlock:0,parry:0,evasion:0,accuracy:1,damage:10},round:1});
test('resolution order is additional then main',()=>{const selections={player:{additional:{type:'heal',amount:5},main:{type:'attack'}},enemy:{additional:{type:'heal',amount:5},main:{type:'attack'}}};const result=resolveRound(baseCombat(),selections,new SeededRng(1));assert.deepEqual(result.log.map(x=>x.phase),['player-additional','enemy-additional','player-main','enemy-main']);});
test('defeat stops later queued action',()=>{const c=baseCombat();c.enemy.hp=10;const r=resolveRound(c,{player:{main:{type:'attack'}},enemy:{main:{type:'attack'}}},new SeededRng(1));assert.equal(r.state.enemy.hp,0);assert.equal(r.state.player.hp,100);assert.equal(r.log.some(x=>x.phase==='enemy-main'),false);});
test('earlier stun cancels later main action',()=>{const r=resolveRound(baseCombat(),{player:{main:{type:'attack'}},enemy:{additional:{type:'stun'},main:{type:'attack'}}},new SeededRng(1));assert.equal(r.log.some(x=>x.phase==='player-main'),false);});
test('diminishing mitigation combines multiplicatively',()=>{assert.ok(Math.abs(combineDiminishingPercentages([.2,.2])-.36)<1e-10);assert.ok(Math.abs(combineDiminishingPercentages([.2,.2,.2])-.488)<1e-10);});
test('style bonus can exceed normal block and parry caps by 20 points',()=>{assert.equal(cappedChance(.8,.6,false),.6);assert.equal(cappedChance(.8,.6,true),.8);assert.equal(cappedChance(.6,.35,true),.55);});
test('effective evasion never reaches one and opposed accuracy matters',()=>{assert.ok(effectiveEvasion(.85,.2)>.7);assert.ok(effectiveEvasion(.85,1)<.5);assert.ok(effectiveEvasion(2,0)<1);});

test('summons act automatically before enemy main action',()=>{
  const state=baseCombat();
  state.summons=[{
    instanceId:'summon-1',
    definitionId:'war-beast',
    hp:70,maxHp:70,
    stamina:100,maxStamina:100,
    summonedAt:0,recoveryUpdatedAt:0,
    damage:14,accuracy:1,evasion:0,
    interceptChance:0,
    attackStaminaCost:18,
    staminaRecoveryPerRound:15,
    role:'striker',
    passiveImmunities:[]
  }];
  const rng={chance:()=>true};
  const result=resolveRound(
    state,
    {player:{main:{type:'wait'}},enemy:{main:{type:'attack'}}},
    rng
  );
  assert.equal(result.log.some(x=>x.phase==='summon-main'),true);
  assert.equal(result.state.enemy.hp,86);
  assert.ok(result.state.summons[0].stamina<100);
});

test('successful enemy attack is redirected into guaranteed guardian interception',()=>{
  const state=baseCombat();
  state.summons=[{
    instanceId:'summon-1',
    definitionId:'guardian-elemental',
    hp:90,maxHp:90,
    stamina:80,maxStamina:80,
    summonedAt:0,recoveryUpdatedAt:0,
    damage:1,accuracy:0,evasion:0,
    interceptChance:1,
    attackStaminaCost:15,
    staminaRecoveryPerRound:12,
    role:'guardian',
    passiveImmunities:['stun']
  }];
  const rng={chance:()=>true};
  const result=resolveRound(
    state,
    {player:{main:{type:'wait'}},enemy:{main:{type:'attack'}}},
    rng
  );
  assert.equal(result.state.player.hp,100);
  assert.ok(result.state.summons[0].hp<90);
});

test('summons do not intercept attacks that miss or are blocked before damage',()=>{
  const state=baseCombat();
  state.player.evasion=0;
  state.player.hasShield=true;
  state.player.shieldBlock=1;
  state.summons=[{
    instanceId:'summon-1',
    definitionId:'guardian-elemental',
    hp:90,maxHp:90,
    stamina:80,maxStamina:80,
    summonedAt:0,recoveryUpdatedAt:0,
    damage:1,accuracy:0,evasion:0,
    interceptChance:1,
    attackStaminaCost:15,
    staminaRecoveryPerRound:12,
    role:'guardian',
    passiveImmunities:['stun']
  }];
  const rolls=[false,true];
  const rng={chance:()=>rolls.shift()??true};
  const result=resolveRound(
    state,
    {player:{main:{type:'wait'}},enemy:{main:{type:'attack'}}},
    rng
  );
  assert.equal(result.state.player.hp,100);
  assert.equal(result.state.summons[0].hp,90);
});


test('combat log exposes successful player attack outcome for progression',()=>{
  const result=resolveRound(
    baseCombat(),
    {player:{main:{type:'attack'}},enemy:{main:{type:'wait'}}},
    {chance:()=>true}
  );
  const attack=result.log.find(x=>x.phase==='player-main');
  assert.equal(attack?.action,'attack');
  assert.equal(attack?.success,true);
  assert.ok((attack?.damage??0)>0);
});

test('combat log marks missed player attack as failed action',()=>{
  const result=resolveRound(
    baseCombat(),
    {player:{main:{type:'attack'}},enemy:{main:{type:'wait'}}},
    {chance:()=>false}
  );
  const attack=result.log.find(x=>x.phase==='player-main');
  assert.equal(attack?.action,'attack');
  assert.equal(attack?.success,false);
  assert.equal(attack?.damage,0);
});

test('stunned player produces no weapon action log entry',()=>{
  const state=baseCombat();
  state.player.stunned=true;
  const result=resolveRound(
    state,
    {player:{main:{type:'attack'}},enemy:{main:{type:'wait'}}},
    {chance:()=>true}
  );
  assert.equal(result.log.some(x=>x.phase==='player-main'),false);
});


test('direct physical mitigation reduces damage after hit',()=>{
  const state=baseCombat();
  state.player.damageMitigation=0.2;
  const rng={chance:p=>p===0.1?false:true};
  const result=resolveRound(
    state,
    {player:{main:{type:'wait'}},enemy:{main:{type:'attack'}}},
    rng
  );
  assert.equal(result.state.player.hp,92);
});

test('player mitigation does not reduce damage intercepted by summon',()=>{
  const state=baseCombat();
  state.player.damageMitigation=0.5;
  state.summons=[{
    instanceId:'summon-1',
    definitionId:'guardian-elemental',
    hp:90,maxHp:90,
    stamina:80,maxStamina:80,
    summonedAt:0,recoveryUpdatedAt:0,
    damage:1,accuracy:0,evasion:0,
    interceptChance:1,
    attackStaminaCost:15,
    staminaRecoveryPerRound:12,
    role:'guardian',
    passiveImmunities:[]
  }];
  const rng={chance:p=>p===0.1?false:true};
  const result=resolveRound(
    state,
    {player:{main:{type:'wait'}},enemy:{main:{type:'attack'}}},
    rng
  );
  assert.equal(result.state.player.hp,100);
  assert.equal(result.state.summons[0].hp,80);
});


test('successful magic action spends mana applies focus and exposes magic path',()=>{
  const state=baseCombat();
  const result=resolveRound(
    state,
    {
      player:{main:{
        type:'magic',
        manaCost:20,
        skillPath:['magic','arcane','concentration','arcane-focus'],
        effect:{id:'focus',magnitude:0.08,rounds:3}
      }},
      enemy:{main:{type:'wait'}}
    },
    {chance:()=>true}
  );
  assert.equal(result.state.player.mana,45);
  const focus=result.state.player.effects?.find(effect=>effect.id==='focus');
  assert.ok(focus);
  assert.equal(focus.magnitude,0.08);
  assert.equal(focus.roundsRemaining,2);
  const entry=result.log.find(x=>x.phase==='player-main');
  assert.equal(entry?.action,'magic');
  assert.equal(entry?.success,true);
  assert.equal(entry?.magicEffectApplied,true);
  assert.deepEqual(entry?.magicSkillPath,[
    'magic','arcane','concentration','arcane-focus'
  ]);
});

test('magic action without enough mana applies no effect and is not marked as used magic',()=>{
  const state=baseCombat();
  state.player.mana=10;
  const result=resolveRound(
    state,
    {
      player:{main:{
        type:'magic',
        manaCost:20,
        skillPath:['magic','arcane','concentration','arcane-focus'],
        effect:{id:'focus',magnitude:0.08,rounds:3}
      }},
      enemy:{main:{type:'wait'}}
    },
    {chance:()=>true}
  );
  assert.equal(result.state.player.mana,25);
  assert.equal(result.state.player.effects?.length??0,0);
  const entry=result.log.find(x=>x.phase==='player-main');
  assert.equal(entry?.success,false);
  assert.equal(entry?.magicEffectApplied,false);
});

test('zero magnitude magic action applies nothing and cannot spend mana',()=>{
  const state=baseCombat();
  const result=resolveRound(
    state,
    {
      player:{main:{
        type:'magic',
        manaCost:20,
        skillPath:['magic'],
        effect:{id:'focus',magnitude:0,rounds:3}
      }},
      enemy:{main:{type:'wait'}}
    },
    {chance:()=>true}
  );
  assert.equal(result.state.player.mana,65);
  assert.equal(result.state.player.effects?.length??0,0);
  const entry=result.log.find(x=>x.phase==='player-main');
  assert.equal(entry?.magicEffectApplied,false);
});

test('negative magic mana cost cannot restore mana',()=>{
  const state=baseCombat();
  const result=resolveRound(
    state,
    {
      player:{main:{
        type:'magic',
        manaCost:-20,
        skillPath:['magic'],
        effect:{id:'focus',magnitude:0.08,rounds:3}
      }},
      enemy:{main:{type:'wait'}}
    },
    {chance:()=>true}
  );
  assert.equal(result.state.player.mana,65);
});
