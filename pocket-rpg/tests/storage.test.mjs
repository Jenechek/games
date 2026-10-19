import test from 'node:test';
import assert from 'node:assert/strict';
import {MemorySaveStore,decodeSave,encodeSave} from '../dist/storage/indexed-db.js';
import {migrateSave} from '../dist/storage/migrations.js';
import {reconstructState} from '../dist/game-core/game-state.js';
import {cleanInjuryState} from '../dist/game-core/injuries/injuries.js';
import {createDefaultFarmingState} from '../dist/game-core/peaceful/farming/farming.js';
import {createDefaultGatheringState} from '../dist/game-core/peaceful/gathering/gathering.js';
import {createDefaultCraftingState} from '../dist/game-core/crafting/crafting.js';
import {createDefaultEconomyState} from '../dist/game-core/economy/merchant.js';
import {createDefaultDiplomacyState} from '../dist/game-core/diplomacy/diplomacy.js';
import {emptyAttributeProfile} from '../dist/game-core/progression/character.js';
import {
  WEAPON_SKILL_IDS,
  collectLegacySkillProgression,
  createDefaultSkillProgression
} from '../dist/game-core/progression/skill-progress.js';
import {
  createDefaultClassState,
  choosePlayerClass,
  effectiveSummonDefinitions
} from '../dist/game-core/classes/classes.js';
import {
  SUMMON_FULL_RECOVERY_MS,
  createDefaultSummonRoster,
  summonCreature
} from '../dist/game-core/summons/summons.js';
import {
  RETRAINING_DURATION_MS,
  balancedAttributesForLegacyLevel,
  createDefaultUniversityState,
  startRetraining
} from '../dist/game-core/university/retraining.js';
import {starterRecipeIds} from '../dist/content/crafting.js';
import {summonDefinitions} from '../dist/content/summons.js';
import {playerClasses} from '../dist/content/classes.js';

function legacyV4State(){
  return {
    character:{level:2,xp:20,gold:15},
    world:{locationId:'tillanium',travel:null,arrivalCount:0},
    inventory:{stacks:[{itemId:'healing-potion',quantity:2}]},
    injuries:cleanInjuryState(),
    farming:createDefaultFarmingState(),
    gathering:createDefaultGatheringState()
  };
}
function legacyV5State(){
  return {
    ...legacyV4State(),
    inventory:{stacks:[{itemId:'healing-potion',quantity:2}],equipment:[]},
    crafting:createDefaultCraftingState(starterRecipeIds)
  };
}
function legacyV6State(){return {...legacyV5State(),economy:createDefaultEconomyState()};}
function legacyV7State(){return {...legacyV6State(),diplomacy:createDefaultDiplomacyState()};}
function legacyV8State(level=10){
  return {
    ...legacyV7State(),
    character:{level,xp:12,gold:50,attributes:balancedAttributesForLegacyLevel(level)},
    university:createDefaultUniversityState()
  };
}
function legacyV9State(level=10){
  const v8=legacyV8State(level);
  return {...v8,character:{...v8.character,attributeXp:emptyAttributeProfile()}};
}
function legacyV10State(level=10){
  return {...legacyV9State(level),summons:createDefaultSummonRoster()};
}
function legacyV11State(level=10){
  return {...legacyV10State(level),classState:createDefaultClassState()};
}
function legacyV12State(level=10){
  const legacy=legacyV11State(level);
  return {
    ...legacy,
    skillProgression:{
      fishing:{level:0,xp:0},
      farming:{...legacy.farming.skill},
      gathering:{...legacy.gathering.skill},
      crafting:{...legacy.crafting.skills.crafting},
      alchemy:{...legacy.crafting.skills.alchemy},
      trading:{...legacy.economy.trading},
      diplomacy:{...legacy.diplomacy.skill}
    }
  };
}
function fullState(level=10){
  const legacy=legacyV11State(level);
  return {
    ...legacy,
    skillProgression:collectLegacySkillProgression({
      farming:legacy.farming,
      gathering:legacy.gathering,
      crafting:legacy.crafting,
      economy:legacy.economy,
      diplomacy:legacy.diplomacy
    })
  };
}

test('schema v12 migrates to v13 preserving seven skills and adding zero weapon chain',()=>{
  const old=legacyV12State();
  old.skillProgression.fishing={level:4,xp:91.25};
  old.skillProgression.farming={level:7,xp:12.5};
  old.farming.skill={...old.skillProgression.farming};
  old.skillProgression.trading={level:11,xp:16.5};
  old.economy.trading={...old.skillProgression.trading};

  const migrated=migrateSave({schemaVersion:12,savedAt:1000,state:old});
  assert.equal(migrated?.schemaVersion,13);
  assert.deepEqual(migrated?.state.skillProgression.fishing,{level:4,xp:91.25});
  assert.deepEqual(migrated?.state.skillProgression.farming,{level:7,xp:12.5});
  assert.deepEqual(migrated?.state.skillProgression.trading,{level:11,xp:16.5});
  for(const id of WEAPON_SKILL_IDS){
    assert.deepEqual(migrated?.state.skillProgression[id],{level:0,xp:0});
  }
});

test('schema v11 migrates directly to v13 with default fishing and weapon progression',()=>{
  const old=legacyV11State();
  old.diplomacy.skill={level:12,xp:17.5};
  const migrated=migrateSave({schemaVersion:11,savedAt:1000,state:old});
  assert.equal(migrated?.schemaVersion,13);
  assert.deepEqual(migrated?.state.skillProgression.diplomacy,{level:12,xp:17.5});
  assert.deepEqual(migrated?.state.skillProgression.fishing,{level:0,xp:0});
  for(const id of WEAPON_SKILL_IDS){
    assert.deepEqual(migrated?.state.skillProgression[id],{level:0,xp:0});
  }
});

test('save load round trip preserves v13 profession and weapon skills',async()=>{
  const store=new MemorySaveStore();
  const state=fullState();
  state.skillProgression.fishing={level:4,xp:91.25};
  state.skillProgression.weapons={level:2,xp:12};
  state.skillProgression['one-handed']={level:3,xp:13};
  state.skillProgression.swords={level:4,xp:14};
  state.skillProgression['short-sword']={level:5,xp:15};

  await store.save(state,1500);
  const loaded=await store.load();
  assert.deepEqual(loaded?.skillProgression,state.skillProgression);
});

test('save normalization keeps canonical map authoritative over compatibility mirrors',()=>{
  const state=fullState();
  state.skillProgression.trading={level:20,xp:42};
  state.economy.trading={level:1,xp:1};

  const envelope=JSON.parse(encodeSave(state,999));
  assert.equal(envelope.schemaVersion,13);
  assert.deepEqual(envelope.state.skillProgression.trading,{level:20,xp:42});
  assert.deepEqual(envelope.state.economy.trading,{level:20,xp:42});
});

test('v13 rejects drift between canonical profession skill and nested mirror',()=>{
  const state=fullState();
  state.skillProgression.diplomacy={level:20,xp:5};
  assert.equal(migrateSave({schemaVersion:13,savedAt:1,state}),null);
});

test('v13 rejects missing unknown or malformed weapon skill entries',()=>{
  const base=fullState();

  const missing={...base.skillProgression};
  delete missing['short-sword'];
  assert.equal(migrateSave({
    schemaVersion:13,
    savedAt:1,
    state:{...base,skillProgression:missing}
  }),null);

  assert.equal(migrateSave({
    schemaVersion:13,
    savedAt:1,
    state:{...base,skillProgression:{...base.skillProgression,unknown:{level:0,xp:0}}}
  }),null);

  assert.equal(migrateSave({
    schemaVersion:13,
    savedAt:1,
    state:{...base,skillProgression:{
      ...base.skillProgression,
      weapons:{level:101,xp:0}
    }}
  }),null);
});

test('v12 rejects weapon keys because they did not exist in that schema',()=>{
  const old=legacyV12State();
  assert.equal(migrateSave({
    schemaVersion:12,
    savedAt:1,
    state:{
      ...old,
      skillProgression:{
        ...old.skillProgression,
        weapons:{level:0,xp:0}
      }
    }
  }),null);
});

test('older schemas still migrate through v13 with default missing systems',()=>{
  const old=legacyV4State();
  old.inventory.stacks=[
    {itemId:'iron-short-sword',quantity:2},
    {itemId:'medicinal-herb-rare',quantity:3}
  ];
  const migrated=migrateSave({schemaVersion:4,savedAt:1000,state:old});
  assert.equal(migrated?.schemaVersion,13);
  assert.equal(migrated?.state.inventory.equipment.length,2);
  assert.equal(migrated?.state.crafting.nextEquipmentId,3);
  assert.deepEqual(migrated?.state.skillProgression,createDefaultSkillProgression());
  assert.deepEqual(migrated?.state.summons,createDefaultSummonRoster());
  assert.deepEqual(migrated?.state.classState,createDefaultClassState());
});

test('v13 still supports class-scaled summons alongside weapon progression',()=>{
  const state=fullState();
  state.skillProgression['short-sword']={level:20,xp:3};
  state.classState=choosePlayerClass(state.classState,'tamer');
  const effective=effectiveSummonDefinitions(
    state.classState,
    playerClasses,
    summonDefinitions
  );
  state.summons=summonCreature({
    roster:state.summons,
    definition:effective['war-beast'],
    limit:3,
    now:100
  });
  assert.equal(state.summons.active[0].hp,81);
  assert.notEqual(migrateSave({schemaVersion:13,savedAt:200,state}),null);
});

test('reconstructing state preserves weapon progression while completing timed systems',()=>{
  const state=fullState(10);
  state.skillProgression['short-sword']={level:6,xp:12.5};
  state.classState=choosePlayerClass(state.classState,'tamer');
  state.character.attributes.strength+=12;
  state.character.attributes.agility-=6;
  state.character.attributes.intuition-=6;
  state.university=startRetraining({
    state:state.university,
    attributes:state.character.attributes,
    level:10,
    from:'strength',
    to:'charisma',
    percent:100,
    now:1000
  });
  const effective=effectiveSummonDefinitions(state.classState,playerClasses,summonDefinitions);
  state.summons=summonCreature({
    roster:state.summons,
    definition:effective['war-beast'],
    limit:3,
    now:1000
  });
  state.summons.active[0].hp=20;

  const now=1000+Math.max(RETRAINING_DURATION_MS,SUMMON_FULL_RECOVERY_MS);
  const once=reconstructState(state,now);
  assert.deepEqual(once.skillProgression,state.skillProgression);
  assert.equal(once.university.pending,null);
  assert.equal(once.summons.active[0].hp,81);
});

test('corrupted and unknown saves fail closed',()=>{
  assert.equal(decodeSave('{not json'),null);
  assert.equal(decodeSave(JSON.stringify({schemaVersion:999,state:{}})),null);
});
