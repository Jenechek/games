import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LEGACY_PERSISTED_SKILL_IDS_V12,
  PERSISTED_SKILL_IDS,
  WEAPON_SKILL_IDS,
  collectLegacySkillProgression,
  createDefaultSkillProgression,
  mirrorsMatchProgression,
  skillStatesEqual,
  synchronizeSkillMirrors,
  upgradeSkillProgressionV12
} from '../dist/game-core/progression/skill-progress.js';
import {createDefaultFarmingState} from '../dist/game-core/peaceful/farming/farming.js';
import {createDefaultGatheringState} from '../dist/game-core/peaceful/gathering/gathering.js';
import {createDefaultCraftingState} from '../dist/game-core/crafting/crafting.js';
import {createDefaultEconomyState} from '../dist/game-core/economy/merchant.js';
import {createDefaultDiplomacyState} from '../dist/game-core/diplomacy/diplomacy.js';

function legacy(){
  return {
    farming:createDefaultFarmingState(),
    gathering:createDefaultGatheringState(),
    crafting:createDefaultCraftingState([]),
    economy:createDefaultEconomyState(),
    diplomacy:createDefaultDiplomacyState()
  };
}

test('canonical persisted skill ids include existing professions and authored weapon chain',()=>{
  assert.deepEqual(LEGACY_PERSISTED_SKILL_IDS_V12,[
    'fishing','farming','gathering','crafting','alchemy','trading','diplomacy'
  ]);
  assert.deepEqual(WEAPON_SKILL_IDS,[
    'weapons','one-handed','swords','short-sword'
  ]);
  assert.deepEqual(PERSISTED_SKILL_IDS,[
    'fishing','farming','gathering','crafting','alchemy','trading','diplomacy',
    'weapons','one-handed','swords','short-sword'
  ]);
  assert.deepEqual(createDefaultSkillProgression(),{
    fishing:{level:0,xp:0},
    farming:{level:0,xp:0},
    gathering:{level:0,xp:0},
    crafting:{level:0,xp:0},
    alchemy:{level:0,xp:0},
    trading:{level:0,xp:0},
    diplomacy:{level:0,xp:0},
    weapons:{level:0,xp:0},
    'one-handed':{level:0,xp:0},
    swords:{level:0,xp:0},
    'short-sword':{level:0,xp:0}
  });
});

test('legacy subsystem skill states are collected without changing values',()=>{
  const state=legacy();
  state.farming.skill={level:3,xp:12.5};
  state.gathering.skill={level:4,xp:22.5};
  state.crafting.skills.crafting={level:5,xp:32.5};
  state.crafting.skills.alchemy={level:6,xp:42.5};
  state.economy.trading={level:7,xp:52.5};
  state.diplomacy.skill={level:8,xp:62.5};

  const progression=collectLegacySkillProgression({
    ...state,
    fishing:{level:2,xp:7.5}
  });
  assert.deepEqual(progression,{
    fishing:{level:2,xp:7.5},
    farming:{level:3,xp:12.5},
    gathering:{level:4,xp:22.5},
    crafting:{level:5,xp:32.5},
    alchemy:{level:6,xp:42.5},
    trading:{level:7,xp:52.5},
    diplomacy:{level:8,xp:62.5},
    weapons:{level:0,xp:0},
    'one-handed':{level:0,xp:0},
    swords:{level:0,xp:0},
    'short-sword':{level:0,xp:0}
  });
});

test('canonical progression overwrites legacy mirrors deterministically',()=>{
  const state=legacy();
  const progression=createDefaultSkillProgression();
  progression.farming={level:11,xp:1};
  progression.gathering={level:12,xp:2};
  progression.crafting={level:13,xp:3};
  progression.alchemy={level:14,xp:4};
  progression.trading={level:15,xp:5};
  progression.diplomacy={level:16,xp:6};

  const synced=synchronizeSkillMirrors(state,progression);
  assert.deepEqual(synced.farming.skill,progression.farming);
  assert.deepEqual(synced.gathering.skill,progression.gathering);
  assert.deepEqual(synced.crafting.skills.crafting,progression.crafting);
  assert.deepEqual(synced.crafting.skills.alchemy,progression.alchemy);
  assert.deepEqual(synced.economy.trading,progression.trading);
  assert.deepEqual(synced.diplomacy.skill,progression.diplomacy);
  assert.equal(mirrorsMatchProgression({...synced,progression}),true);
});

test('mirror matching detects drift but ignores fishing because it has no legacy mirror',()=>{
  const state=legacy();
  const progression=createDefaultSkillProgression();
  progression.fishing={level:20,xp:99};
  assert.equal(mirrorsMatchProgression({...state,progression}),true);

  progression.trading={level:1,xp:0};
  assert.equal(mirrorsMatchProgression({...state,progression}),false);
});

test('skill state equality tolerates tiny floating point noise only',()=>{
  assert.equal(skillStatesEqual({level:3,xp:1},{level:3,xp:1+1e-10}),true);
  assert.equal(skillStatesEqual({level:3,xp:1},{level:4,xp:1}),false);
  assert.equal(skillStatesEqual({level:3,xp:1},{level:3,xp:1.01}),false);
});


test('v12 canonical progression upgrades by preserving seven skills and zeroing weapon chain',()=>{
  const legacy={
    fishing:{level:1,xp:1},
    farming:{level:2,xp:2},
    gathering:{level:3,xp:3},
    crafting:{level:4,xp:4},
    alchemy:{level:5,xp:5},
    trading:{level:6,xp:6},
    diplomacy:{level:7,xp:7}
  };
  const upgraded=upgradeSkillProgressionV12(legacy);
  for(const id of LEGACY_PERSISTED_SKILL_IDS_V12){
    assert.deepEqual(upgraded[id],legacy[id]);
  }
  for(const id of WEAPON_SKILL_IDS){
    assert.deepEqual(upgraded[id],{level:0,xp:0});
  }
});
