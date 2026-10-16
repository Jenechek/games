import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AUDIENCE_COOLDOWN_MS,
  FACTION_REQUEST_WINDOW_MS,
  MEDIATION_COOLDOWN_MS,
  attemptAudience,
  attemptMediation,
  canCompleteFactionRequest,
  clampRelation,
  completeFactionRequest,
  createDefaultDiplomacyState,
  currentFactionRequest,
  honoredFactionItemUnlocked,
  relationRank
} from '../dist/game-core/diplomacy/diplomacy.js';
import {factions} from '../dist/content/factions.js';

test('relation ranks use stable thresholds',()=>{
  assert.equal(relationRank(-100),'hostile');
  assert.equal(relationRank(-51),'hostile');
  assert.equal(relationRank(-50),'cold');
  assert.equal(relationRank(-21),'cold');
  assert.equal(relationRank(-20),'neutral');
  assert.equal(relationRank(19),'neutral');
  assert.equal(relationRank(20),'respected');
  assert.equal(relationRank(50),'honored');
  assert.equal(relationRank(80),'allied');
  assert.equal(clampRelation(200),100);
  assert.equal(clampRelation(-200),-100);
});

test('audience is low-yield, time-gated and gives no relation penalty on failure',()=>{
  const state=createDefaultDiplomacyState();
  const success=attemptAudience({
    state,
    factionId:'karnholm',
    relation:0,
    charisma:10,
    now:1000,
    rng:{chance:()=>true}
  });
  assert.equal(success.relation,1);
  assert.equal(success.xp,25);
  assert.equal(success.state.audienceAvailableAt.karnholm,1000+AUDIENCE_COOLDOWN_MS);

  const failure=attemptAudience({
    state,
    factionId:'ellaria',
    relation:10,
    charisma:10,
    now:1000,
    rng:{chance:()=>false}
  });
  assert.equal(failure.relation,10);
  assert.equal(failure.xp,10);

  assert.throws(()=>attemptAudience({
    state:success.state,
    factionId:'karnholm',
    relation:1,
    charisma:10,
    now:1001,
    rng:{chance:()=>true}
  }),/cooldown/);
});

test('mediation requires diplomacy 20 and has meaningful success/failure stakes',()=>{
  const base=createDefaultDiplomacyState();
  assert.throws(()=>attemptMediation({
    state:base,
    factionId:'rivermark',
    relation:0,
    charisma:10,
    now:1000,
    rng:{chance:()=>true}
  }),/too low/);

  const ready={...base,skill:{level:20,xp:0}};
  const success=attemptMediation({
    state:ready,
    factionId:'rivermark',
    relation:0,
    charisma:10,
    now:1000,
    rng:{chance:()=>true}
  });
  assert.equal(success.relation,2);
  assert.equal(success.state.mediationAvailableAt.rivermark,1000+MEDIATION_COOLDOWN_MS);

  const failure=attemptMediation({
    state:ready,
    factionId:'greenwald',
    relation:0,
    charisma:10,
    now:1000,
    rng:{chance:()=>false}
  });
  assert.equal(failure.relation,-1);
});

test('faction requests rotate every six hours and can be completed once per window',()=>{
  const faction=factions.karnholm;
  const first=currentFactionRequest(faction,0);
  const second=currentFactionRequest(faction,FACTION_REQUEST_WINDOW_MS);
  assert.notEqual(first.itemId,second.itemId);

  const state=createDefaultDiplomacyState();
  assert.equal(canCompleteFactionRequest(state,first),true);
  const result=completeFactionRequest({
    state,
    request:first,
    relation:0,
    baseItemPrice:12
  });
  assert.equal(result.relation,3);
  assert.equal(result.xp,60);
  assert.equal(result.goldReward,12);
  assert.equal(canCompleteFactionRequest(result.state,first),false);
  assert.throws(()=>completeFactionRequest({
    state:result.state,
    request:first,
    relation:3,
    baseItemPrice:12
  }),/already completed/);
});

test('request gold reward is only half base value to prevent reputation tasks becoming trade arbitrage',()=>{
  const request={factionId:'greenwald',window:3,itemId:'iron-ingot',quantity:2};
  const result=completeFactionRequest({
    state:createDefaultDiplomacyState(),
    request,
    relation:40,
    baseItemPrice:18
  });
  assert.equal(result.goldReward,18);
  assert.equal(result.relation,43);
});

test('honored faction market item unlocks only at relation fifty',()=>{
  assert.equal(honoredFactionItemUnlocked(49.99),false);
  assert.equal(honoredFactionItemUnlocked(50),true);
  assert.equal(honoredFactionItemUnlocked(100),true);
});
