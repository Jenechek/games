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
  return {
    ...legacyV4State(),
    inventory:{stacks:[{itemId:'healing-potion',quantity:2}],equipment:[]},
    crafting:createDefaultCraftingState(starterRecipeIds)
  };
}

function fullState(){
  return {
    ...legacyV5State(),
    economy:createDefaultEconomyState()
  };
}

test('save load round trip preserves durable v6 economy state',async()=>{
  const store=new MemorySaveStore();
  const state=fullState();
  state.crafting.skills.alchemy={level:20,xp:12.5};
  state.economy.trading={level:3,xp:44};
  state.economy.pressures.tillanium={
    'healing-potion':{value:0.15,updatedAt:1000}
  };
  state.economy.factionRelations.karnholm=25;

  await store.save(state,2000);
  assert.deepEqual(await store.load(),state);
});

test('schema v5 migrates to v6 with neutral economy defaults',()=>{
  const old=legacyV5State();
  const migrated=migrateSave({schemaVersion:5,savedAt:1000,state:old});
  assert.equal(migrated?.schemaVersion,6);
  assert.deepEqual(migrated?.state.economy,createDefaultEconomyState());
  assert.deepEqual(migrated?.state.crafting,old.crafting);
});

test('schema v4 still migrates equipment stacks and receives economy state',()=>{
  const old=legacyV4State();
  old.inventory.stacks=[
    {itemId:'iron-short-sword',quantity:2},
    {itemId:'medicinal-herb-rare',quantity:3},
    {itemId:'wild-herb',quantity:2}
  ];
  const migrated=migrateSave({schemaVersion:4,savedAt:1000,state:old});
  assert.equal(migrated?.schemaVersion,6);
  assert.equal(migrated?.state.inventory.equipment.length,2);
  assert.deepEqual(migrated?.state.inventory.equipment.map(item=>item.instanceId),['eq-1','eq-2']);
  assert.equal(migrated?.state.inventory.stacks.find(item=>item.itemId==='medicinal-herb-rare')?.itemClass,2);
  assert.equal(migrated?.state.crafting.nextEquipmentId,3);
  assert.equal(migrated?.state.economy.trading.level,0);
});

test('saving a legacy v4 state normalizes all later durable systems',async()=>{
  const store=new MemorySaveStore();
  const legacy=legacyV4State();
  await store.save(legacy,1000);
  const loaded=await store.load();
  assert.deepEqual(loaded?.crafting.skills,createDefaultCraftingState(starterRecipeIds).skills);
  assert.deepEqual(loaded?.economy,createDefaultEconomyState());
  assert.deepEqual(loaded?.inventory.equipment,[]);
});

test('valid schema v1 save migrates directly to v6 defaults',()=>{
  const oldState={
    character:{level:3,xp:44,gold:71},
    world:{locationId:'meadow',travel:null,arrivalCount:2},
    inventory:{stacks:[{itemId:'healing-potion',quantity:1}]}
  };
  const migrated=migrateSave({schemaVersion:1,savedAt:1234,state:oldState});
  assert.equal(migrated?.schemaVersion,6);
  assert.deepEqual(migrated?.state.injuries,cleanInjuryState());
  assert.deepEqual(migrated?.state.farming,createDefaultFarmingState());
  assert.deepEqual(migrated?.state.gathering,createDefaultGatheringState());
  assert.equal(migrated?.state.crafting.skills.crafting.level,0);
  assert.equal(migrated?.state.economy.trading.level,0);
});

test('current encoded saves use schema v6 and preserve trading pressure',()=>{
  const state=fullState();
  state.injuries.severity.head=2;
  state.gathering.skill={level:7,xp:42};
  state.crafting.skills.crafting={level:35,xp:5};
  state.economy.pressures.greenwald={
    'grain-sack':{value:-0.2,updatedAt:900}
  };
  const raw=encodeSave(state,999);
  const envelope=JSON.parse(raw);
  assert.equal(envelope.schemaVersion,6);
  assert.deepEqual(decodeSave(raw),state);
});

test('corrupted and unknown saves fail closed',()=>{
  assert.equal(decodeSave('{not json'),null);
  assert.equal(decodeSave(JSON.stringify({schemaVersion:999,state:{}})),null);
});

test('malformed v6 economy data fails closed',()=>{
  const base=fullState();

  assert.equal(migrateSave({
    schemaVersion:6,
    savedAt:1,
    state:{...base,economy:{...base.economy,trading:{level:101,xp:0}}}
  }),null);

  assert.equal(migrateSave({
    schemaVersion:6,
    savedAt:1,
    state:{...base,economy:{...base.economy,pressures:{unknown:{'grain-sack':{value:0.1,updatedAt:1}}}}}
  }),null);

  assert.equal(migrateSave({
    schemaVersion:6,
    savedAt:1,
    state:{...base,economy:{...base.economy,pressures:{tillanium:{unknown:{value:0.1,updatedAt:1}}}}}
  }),null);

  assert.equal(migrateSave({
    schemaVersion:6,
    savedAt:1,
    state:{...base,economy:{...base.economy,factionRelations:{...base.economy.factionRelations,karnholm:101}}}
  }),null);
});

test('malformed v5 equipment and crafting structures still fail closed',()=>{
  const base=legacyV5State();
  assert.equal(migrateSave({
    schemaVersion:5,
    savedAt:1,
    state:{...base,crafting:{...base.crafting,skills:{...base.crafting.skills,alchemy:{level:101,xp:0}}}}
  }),null);

  assert.equal(migrateSave({
    schemaVersion:5,
    savedAt:1,
    state:{...base,inventory:{stacks:[{itemId:'iron-short-sword',quantity:1}],equipment:[]}}
  }),null);
});

test('reconstructing finished travel is idempotent and leaves economy untouched',()=>{
  const state=fullState();
  state.world={locationId:'tillanium',arrivalCount:0,travel:{fromId:'tillanium',destinationId:'city-gate',startedAt:1000,arrivesAt:5000}};
  state.economy.trading={level:10,xp:17};
  const economyBefore=state.economy;
  const once=reconstructState(state,6000);
  const twice=reconstructState(once,6000);
  assert.equal(once.world.locationId,'city-gate');
  assert.equal(twice.world.arrivalCount,1);
  assert.equal(twice.economy,economyBefore);
});

test('runtime peaceful sessions are never serialized into durable save',()=>{
  const state={
    ...fullState(),
    farmingWork:{type:'establish',locationId:'meadow',startedAt:0,nextAt:30000},
    gatheringSession:{focus:'herbs',nextAt:5000,cycleMs:5000}
  };
  const envelope=JSON.parse(encodeSave(state,123));
  assert.equal('farmingWork' in envelope.state,false);
  assert.equal('gatheringSession' in envelope.state,false);
});

test('malformed legacy farming and gathering data still fail closed',()=>{
  const v4=legacyV4State();
  assert.equal(migrateSave({
    schemaVersion:4,
    savedAt:1,
    state:{...v4,farming:{...v4.farming,skill:{level:101,xp:0}}}
  }),null);
  assert.equal(migrateSave({
    schemaVersion:4,
    savedAt:1,
    state:{...v4,gathering:{skill:{level:101,xp:0},discoveredResourceIds:[]}}
  }),null);
});
