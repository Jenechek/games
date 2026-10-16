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
