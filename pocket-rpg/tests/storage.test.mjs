import test from 'node:test';
import assert from 'node:assert/strict';
import {MemorySaveStore,decodeSave,encodeSave} from '../dist/storage/indexed-db.js';
import {migrateSave} from '../dist/storage/migrations.js';
import {reconstructState} from '../dist/game-core/game-state.js';
import {cleanInjuryState} from '../dist/game-core/injuries/injuries.js';
import {createDefaultFarmingState} from '../dist/game-core/peaceful/farming/farming.js';
import {createDefaultGatheringState} from '../dist/game-core/peaceful/gathering/gathering.js';
import {createDefaultCraftingState} from '../dist/game-core/crafting/crafting.js';
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

function fullState(){
  return {
    ...legacyV4State(),
    inventory:{stacks:[{itemId:'healing-potion',quantity:2}],equipment:[]},
    crafting:createDefaultCraftingState(starterRecipeIds)
  };
}

test('save load round trip preserves durable v5 state',async()=>{
  const store=new MemorySaveStore();
  const state=fullState();
  state.farming.fields.push({
    id:'field-1',
    locationId:'tillanium-fields',
    cycleCropId:'wheat',
    cells:[{plantedAt:1000,maturesAt:301000},null,null,null]
  });
  state.farming.nextFieldNumber=2;
  state.crafting.skills.alchemy={level:20,xp:12.5};

  await store.save(state,1000);
  assert.deepEqual(await store.load(),state);
});

test('schema v4 migrates equipment stacks into individual instances and material classes',()=>{
  const old=legacyV4State();
  old.inventory.stacks=[
    {itemId:'iron-short-sword',quantity:2},
    {itemId:'medicinal-herb-rare',quantity:3},
    {itemId:'wild-herb',quantity:2}
  ];
  const migrated=migrateSave({schemaVersion:4,savedAt:1000,state:old});
  assert.equal(migrated?.schemaVersion,5);
  assert.equal(migrated?.state.inventory.equipment.length,2);
  assert.deepEqual(migrated?.state.inventory.equipment.map(item=>item.instanceId),['eq-1','eq-2']);
  assert.equal(migrated?.state.inventory.stacks.find(item=>item.itemId==='medicinal-herb-rare')?.itemClass,2);
  assert.equal(migrated?.state.inventory.stacks.find(item=>item.itemId==='wild-herb')?.itemClass,1);
  assert.equal(migrated?.state.crafting.nextEquipmentId,3);
  assert.deepEqual(migrated?.state.crafting.knownRecipeIds,starterRecipeIds);
});

test('saving a legacy v4 state normalizes it to current v5 defaults',async()=>{
  const store=new MemorySaveStore();
  const legacy=legacyV4State();
  await store.save(legacy,1000);
  const loaded=await store.load();
  assert.deepEqual(loaded?.crafting.skills,createDefaultCraftingState(starterRecipeIds).skills);
  assert.deepEqual(loaded?.inventory.equipment,[]);
  assert.deepEqual(loaded?.injuries,legacy.injuries);
});

test('valid schema v1 save migrates directly to v5 defaults',()=>{
  const oldState={
    character:{level:3,xp:44,gold:71},
    world:{locationId:'meadow',travel:null,arrivalCount:2},
    inventory:{stacks:[{itemId:'healing-potion',quantity:1}]}
  };
  const migrated=migrateSave({schemaVersion:1,savedAt:1234,state:oldState});
  assert.equal(migrated?.schemaVersion,5);
  assert.deepEqual(migrated?.state.injuries,cleanInjuryState());
  assert.deepEqual(migrated?.state.farming,createDefaultFarmingState());
  assert.deepEqual(migrated?.state.gathering,createDefaultGatheringState());
  assert.equal(migrated?.state.crafting.skills.crafting.level,0);
});

test('valid schema v2 and v3 preserve already-existing durable systems',()=>{
  const injuries=cleanInjuryState();
  injuries.severity.head=2;
  const v2={
    character:{level:2,xp:7,gold:11},
    world:{locationId:'forest-edge',travel:null,arrivalCount:1},
    inventory:{stacks:[]},
    injuries
  };
  const m2=migrateSave({schemaVersion:2,savedAt:999,state:v2});
  assert.deepEqual(m2?.state.injuries,injuries);
  assert.deepEqual(m2?.state.farming,createDefaultFarmingState());

  const v3={...legacyV4State()};
  delete v3.gathering;
  v3.farming.skill={level:20,xp:12.5};
  const m3=migrateSave({schemaVersion:3,savedAt:777,state:v3});
  assert.deepEqual(m3?.state.farming,v3.farming);
  assert.deepEqual(m3?.state.gathering,createDefaultGatheringState());
});

test('current encoded saves use schema v5 and preserve crafting state',()=>{
  const state=fullState();
  state.injuries.severity.head=2;
  state.gathering.skill={level:7,xp:42};
  state.crafting.skills.crafting={level:35,xp:5};
  const raw=encodeSave(state,999);
  const envelope=JSON.parse(raw);
  assert.equal(envelope.schemaVersion,5);
  assert.deepEqual(decodeSave(raw),state);
});

test('corrupted and unknown saves fail closed',()=>{
  assert.equal(decodeSave('{not json'),null);
  assert.equal(decodeSave(JSON.stringify({schemaVersion:999,state:{}})),null);
});

test('malformed v5 equipment and crafting structures fail closed',()=>{
  const base=fullState();
  assert.equal(migrateSave({
    schemaVersion:5,
    savedAt:1,
    state:{...base,crafting:{...base.crafting,skills:{...base.crafting.skills,alchemy:{level:101,xp:0}}}}
  }),null);

  assert.equal(migrateSave({
    schemaVersion:5,
    savedAt:1,
    state:{...base,crafting:{...base.crafting,knownRecipeIds:['unknown-recipe']}}
  }),null);

  assert.equal(migrateSave({
    schemaVersion:5,
    savedAt:1,
    state:{...base,inventory:{stacks:[{itemId:'iron-short-sword',quantity:1}],equipment:[]}}
  }),null);

  assert.equal(migrateSave({
    schemaVersion:5,
    savedAt:1,
    state:{...base,inventory:{stacks:[],equipment:[{
      instanceId:'eq-2',
      itemId:'light-armor',
      itemClass:1,
      rarity:'common',
      upgradeLevel:0,
      stats:{mitigation:0.05},
      properties:[]
    }]},crafting:{...base.crafting,nextEquipmentId:2}}
  }),null);
});

test('reconstructing finished travel is idempotent and does not advance crafting',()=>{
  const state=fullState();
  state.world={locationId:'tillanium',arrivalCount:0,travel:{fromId:'tillanium',destinationId:'city-gate',startedAt:1000,arrivesAt:5000}};
  state.crafting.skills.alchemy={level:10,xp:17};
  const craftingBefore=state.crafting;
  const once=reconstructState(state,6000);
  const twice=reconstructState(once,6000);
  assert.equal(once.world.locationId,'city-gate');
  assert.equal(twice.world.arrivalCount,1);
  assert.equal(twice.crafting,craftingBefore);
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
