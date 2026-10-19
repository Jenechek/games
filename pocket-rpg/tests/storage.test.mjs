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
import {
  RETRAINING_DURATION_MS,
  balancedAttributesForLegacyLevel,
  createDefaultUniversityState,
  startRetraining
} from '../dist/game-core/university/retraining.js';
import {starterRecipeIds} from '../dist/content/crafting.js';

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
function fullState(level=10){
  return {
    ...legacyV7State(),
    character:{level,xp:12,gold:50,attributes:balancedAttributesForLegacyLevel(level)},
    university:createDefaultUniversityState()
  };
}

test('save load round trip preserves v8 attributes and pending retraining',async()=>{
  const store=new MemorySaveStore();
  const state=fullState(10);
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
  await store.save(state,1500);
  assert.deepEqual(await store.load(),state);
});

test('schema v7 migrates to v8 with balanced attributes and empty university state',()=>{
  const old=legacyV7State();
  old.character.level=10;
  const migrated=migrateSave({schemaVersion:7,savedAt:1000,state:old});
  assert.equal(migrated?.schemaVersion,8);
  assert.deepEqual(migrated?.state.character.attributes,balancedAttributesForLegacyLevel(10));
  assert.deepEqual(migrated?.state.university,createDefaultUniversityState());
  assert.deepEqual(migrated?.state.diplomacy,old.diplomacy);
});

test('older schemas still migrate through all later systems',()=>{
  const old=legacyV4State();
  old.inventory.stacks=[
    {itemId:'iron-short-sword',quantity:2},
    {itemId:'medicinal-herb-rare',quantity:3}
  ];
  const migrated=migrateSave({schemaVersion:4,savedAt:1000,state:old});
  assert.equal(migrated?.schemaVersion,8);
  assert.equal(migrated?.state.inventory.equipment.length,2);
  assert.equal(migrated?.state.crafting.nextEquipmentId,3);
  assert.equal(migrated?.state.economy.trading.level,0);
  assert.equal(migrated?.state.diplomacy.skill.level,0);
  assert.deepEqual(migrated?.state.university,createDefaultUniversityState());
  assert.deepEqual(migrated?.state.character.attributes,balancedAttributesForLegacyLevel(2));
});

test('saving legacy state normalizes character attributes into v8',async()=>{
  const store=new MemorySaveStore();
  const legacy=legacyV4State();
  await store.save(legacy,1000);
  const loaded=await store.load();
  assert.deepEqual(loaded?.character.attributes,balancedAttributesForLegacyLevel(2));
  assert.deepEqual(loaded?.university,createDefaultUniversityState());
});

test('current encoded saves use schema v8',()=>{
  const state=fullState();
  const raw=encodeSave(state,999);
  const envelope=JSON.parse(raw);
  assert.equal(envelope.schemaVersion,8);
  assert.deepEqual(decodeSave(raw),state);
});

test('malformed v8 attributes and university state fail closed',()=>{
  const base=fullState();

  assert.equal(migrateSave({
    schemaVersion:8,
    savedAt:1,
    state:{...base,character:{...base.character,attributes:{...base.character.attributes,strength:-1}}}
  }),null);

  assert.equal(migrateSave({
    schemaVersion:8,
    savedAt:1,
    state:{...base,university:{pending:{
      from:'strength',to:'strength',percent:50,amount:1,startedAt:0,completesAt:100
    }}}
  }),null);

  assert.equal(migrateSave({
    schemaVersion:8,
    savedAt:1,
    state:{...base,university:{pending:{
      from:'strength',to:'agility',percent:0,amount:1,startedAt:0,completesAt:100
    }}}
  }),null);
});

test('reconstructing a completed retraining applies it once and remains idempotent',()=>{
  const state=fullState(10);
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
  const beforeTotal=Object.values(state.character.attributes).reduce((sum,v)=>sum+v,0);
  const once=reconstructState(state,1000+RETRAINING_DURATION_MS);
  const twice=reconstructState(once,1000+RETRAINING_DURATION_MS);
  assert.equal(once.university.pending,null);
  assert.deepEqual(twice.character.attributes,once.character.attributes);
  const afterTotal=Object.values(once.character.attributes).reduce((sum,v)=>sum+v,0);
  assert.ok(Math.abs(afterTotal-beforeTotal)<1e-9);
});

test('corrupted and unknown saves fail closed',()=>{
  assert.equal(decodeSave('{not json'),null);
  assert.equal(decodeSave(JSON.stringify({schemaVersion:999,state:{}})),null);
});
