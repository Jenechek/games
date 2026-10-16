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
  return {...legacyV4State(),inventory:{stacks:[{itemId:'healing-potion',quantity:2}],equipment:[]},crafting:createDefaultCraftingState(starterRecipeIds)};
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
  return {
    ...v8,
    character:{...v8.character,attributeXp:emptyAttributeProfile()}
  };
}
function fullState(level=10){
  return {
    ...legacyV9State(level),
    summons:createDefaultSummonRoster()
  };
}

test('save load round trip preserves v10 source profile retraining and summons',async()=>{
  const store=new MemorySaveStore();
  const state=fullState(10);
  state.character.attributeXp.strength=120;
  state.character.attributeXp.charisma=30;
  state.character.attributes.strength+=12;
  state.character.attributes.agility-=6;
  state.character.attributes.intuition-=6;
  state.university=startRetraining({
    state:state.university,
    attributes:state.character.attributes,
    level:10,
    from:'strength',
    to:'charisma',
    percent:50,
    now:1000
  });
  state.summons=summonCreature({
    roster:state.summons,
    definition:summonDefinitions['guardian-elemental'],
    limit:1,
    now:1200
  });
  state.summons.active[0].hp=50;
  await store.save(state,1500);
  assert.deepEqual(await store.load(),state);
});

test('schema v9 migrates to v10 with empty summon roster',()=>{
  const old=legacyV9State(10);
  const migrated=migrateSave({schemaVersion:9,savedAt:1000,state:old});
  assert.equal(migrated?.schemaVersion,10);
  assert.deepEqual(migrated?.state.character,old.character);
  assert.deepEqual(migrated?.state.summons,createDefaultSummonRoster());
});

test('schema v8 still adds source profile and empty summons',()=>{
  const old=legacyV8State(10);
  const migrated=migrateSave({schemaVersion:8,savedAt:1000,state:old});
  assert.equal(migrated?.schemaVersion,10);
  assert.deepEqual(migrated?.state.character.attributes,old.character.attributes);
  assert.deepEqual(migrated?.state.character.attributeXp,emptyAttributeProfile());
  assert.deepEqual(migrated?.state.summons,createDefaultSummonRoster());
});

test('older schemas still migrate through all later systems',()=>{
  const old=legacyV4State();
  old.inventory.stacks=[
    {itemId:'iron-short-sword',quantity:2},
    {itemId:'medicinal-herb-rare',quantity:3}
  ];
  const migrated=migrateSave({schemaVersion:4,savedAt:1000,state:old});
  assert.equal(migrated?.schemaVersion,10);
  assert.equal(migrated?.state.inventory.equipment.length,2);
  assert.equal(migrated?.state.crafting.nextEquipmentId,3);
  assert.equal(migrated?.state.economy.trading.level,0);
  assert.equal(migrated?.state.diplomacy.skill.level,0);
  assert.deepEqual(migrated?.state.university,createDefaultUniversityState());
  assert.deepEqual(migrated?.state.character.attributes,balancedAttributesForLegacyLevel(2));
  assert.deepEqual(migrated?.state.character.attributeXp,emptyAttributeProfile());
  assert.deepEqual(migrated?.state.summons,createDefaultSummonRoster());
});

test('saving legacy state normalizes into schema v10',async()=>{
  const store=new MemorySaveStore();
  await store.save(legacyV4State(),1000);
  const loaded=await store.load();
  assert.deepEqual(loaded?.character.attributes,balancedAttributesForLegacyLevel(2));
  assert.deepEqual(loaded?.character.attributeXp,emptyAttributeProfile());
  assert.deepEqual(loaded?.university,createDefaultUniversityState());
  assert.deepEqual(loaded?.summons,createDefaultSummonRoster());
});

test('current encoded saves use schema v10',()=>{
  const state=fullState();
  state.character.attributeXp.wisdom=42;
  const raw=encodeSave(state,999);
  const envelope=JSON.parse(raw);
  assert.equal(envelope.schemaVersion,10);
  assert.deepEqual(decodeSave(raw),state);
});

test('malformed v10 summon roster fails closed',()=>{
  const base=fullState();
  const valid=summonCreature({
    roster:createDefaultSummonRoster(),
    definition:summonDefinitions['war-beast'],
    limit:3,
    now:100
  });

  assert.equal(migrateSave({
    schemaVersion:10,
    savedAt:1,
    state:{...base,summons:{
      ...valid,
      active:[{...valid.active[0],definitionId:'unknown'}]
    }}
  }),null);

  assert.equal(migrateSave({
    schemaVersion:10,
    savedAt:1,
    state:{...base,summons:{
      ...valid,
      active:[{...valid.active[0],hp:0}]
    }}
  }),null);

  assert.equal(migrateSave({
    schemaVersion:10,
    savedAt:1,
    state:{...base,summons:{...valid,nextInstanceId:1}}
  }),null);
});

test('malformed source profile still fails closed',()=>{
  const base=fullState();
  assert.equal(migrateSave({
    schemaVersion:10,
    savedAt:1,
    state:{...base,character:{
      ...base.character,
      attributeXp:{...base.character.attributeXp,strength:-1}
    }}
  }),null);
});

test('reconstructing state completes retraining and heals summons offline',()=>{
  const state=fullState(10);
  state.character.attributeXp.intelligence=88;
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
  state.summons=summonCreature({
    roster:state.summons,
    definition:summonDefinitions['war-beast'],
    limit:3,
    now:1000
  });
  state.summons.active[0].hp=14;
  state.summons.active[0].stamina=20;

  const once=reconstructState(state,1000+Math.max(RETRAINING_DURATION_MS,SUMMON_FULL_RECOVERY_MS));
  const twice=reconstructState(once,1000+Math.max(RETRAINING_DURATION_MS,SUMMON_FULL_RECOVERY_MS));
  assert.equal(once.university.pending,null);
  assert.equal(once.summons.active[0].hp,70);
  assert.equal(once.summons.active[0].stamina,100);
  assert.deepEqual(twice.character.attributes,once.character.attributes);
  assert.deepEqual(twice.summons,once.summons);
});

test('corrupted and unknown saves fail closed',()=>{
  assert.equal(decodeSave('{not json'),null);
  assert.equal(decodeSave(JSON.stringify({schemaVersion:999,state:{}})),null);
});
