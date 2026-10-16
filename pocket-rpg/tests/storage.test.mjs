import test from 'node:test';
import assert from 'node:assert/strict';
import { MemorySaveStore, decodeSave, encodeSave } from '../dist/storage/indexed-db.js';
import { migrateSave } from '../dist/storage/migrations.js';
import { reconstructState } from '../dist/game-core/game-state.js';
import { cleanInjuryState } from '../dist/game-core/injuries/injuries.js';
import { createDefaultFarmingState } from '../dist/game-core/peaceful/farming/farming.js';
import { createDefaultGatheringState } from '../dist/game-core/peaceful/gathering/gathering.js';
import { createDefaultCraftingState } from '../dist/game-core/crafting/crafting.js';

function fullState() {
  return {
    character:{level:2,xp:20,gold:15},
    world:{locationId:'tillanium',travel:null,arrivalCount:0},
    inventory:{stacks:[{itemId:'healing-potion',quantity:2}],instances:[]},
    injuries:cleanInjuryState(),
    farming:createDefaultFarmingState(),
    gathering:createDefaultGatheringState(),
    crafting:createDefaultCraftingState()
  };
}

test('save load round trip preserves durable v5 state', async () => {
  const store = new MemorySaveStore();
  const state = fullState();
  state.farming.fields.push({
    id:'field-1',
    locationId:'tillanium-fields',
    cycleCropId:'wheat',
    cells:[
      {plantedAt:1_000,maturesAt:301_000},
      null,
      null,
      null
    ]
  });
  state.farming.nextFieldNumber = 2;

  await store.save(state,1000);
  assert.deepEqual(await store.load(),state);
});

test('saving legacy v2 state normalizes it to v5 with defaults', async () => {
  const store = new MemorySaveStore();
  const legacy = {
    character:{level:2,xp:20,gold:15},
    world:{locationId:'tillanium',travel:null,arrivalCount:0},
    inventory:{stacks:[]},
    injuries:cleanInjuryState()
  };
  await store.save(legacy,1000);
  const loaded = await store.load();
  assert.deepEqual(loaded?.farming, createDefaultFarmingState());
  assert.deepEqual(loaded?.gathering, createDefaultGatheringState());
  assert.deepEqual(loaded?.crafting, createDefaultCraftingState());
  assert.deepEqual(loaded?.inventory.instances, []);
  assert.deepEqual(loaded?.injuries, legacy.injuries);
});

test('corrupted save returns null',()=>{
  assert.equal(decodeSave('{not json'),null);
  assert.equal(decodeSave(JSON.stringify({schemaVersion:999,state:{}})),null);
});

test('reconstructing finished travel is idempotent and keeps farming timestamps untouched',()=>{
  const s=fullState();
  s.world={locationId:'tillanium',arrivalCount:0,travel:{fromId:'tillanium',destinationId:'city-gate',startedAt:1000,arrivesAt:5000}};
  s.farming.fields.push({
    id:'field-1',
    locationId:'tillanium-fields',
    cycleCropId:'wheat',
    cells:[{plantedAt:1000,maturesAt:301000},null,null,null]
  });
  s.farming.nextFieldNumber=2;
  const once=reconstructState(s,6000),twice=reconstructState(once,6000);
  assert.equal(once.world.locationId,'city-gate');
  assert.equal(twice.world.arrivalCount,1);
  assert.equal(twice.farming.fields[0].cells[0].maturesAt,301000);
});

test('valid schema v1 save migrates directly to schema v5 with defaults',()=>{
  const oldState={
    character:{level:3,xp:44,gold:71},
    world:{locationId:'meadow',travel:null,arrivalCount:2},
    inventory:{stacks:[{itemId:'healing-potion',quantity:1}]}
  };
  const migrated=migrateSave({schemaVersion:1,savedAt:1234,state:oldState});
  assert.equal(migrated?.schemaVersion,5);
  assert.deepEqual(migrated?.state.character,oldState.character);
  assert.deepEqual(migrated?.state.world,oldState.world);
  assert.deepEqual(migrated?.state.inventory,{...oldState.inventory,instances:[]});
  assert.deepEqual(migrated?.state.injuries,cleanInjuryState());
  assert.deepEqual(migrated?.state.farming,createDefaultFarmingState());
  assert.deepEqual(migrated?.state.gathering,createDefaultGatheringState());
  assert.deepEqual(migrated?.state.crafting,createDefaultCraftingState());
});

test('valid schema v2 save migrates to schema v5 and preserves injuries',()=>{
  const injuries=cleanInjuryState();
  injuries.severity.head=2;
  const oldState={
    character:{level:2,xp:7,gold:11},
    world:{locationId:'forest-edge',travel:null,arrivalCount:1},
    inventory:{stacks:[]},
    injuries
  };
  const migrated=migrateSave({schemaVersion:2,savedAt:999,state:oldState});
  assert.equal(migrated?.schemaVersion,5);
  assert.deepEqual(migrated?.state.injuries,injuries);
  assert.deepEqual(migrated?.state.farming,createDefaultFarmingState());
  assert.deepEqual(migrated?.state.gathering,createDefaultGatheringState());
  assert.deepEqual(migrated?.state.crafting,createDefaultCraftingState());
  assert.deepEqual(migrated?.state.inventory.instances,[]);
});

test('new saves use schema v5 and preserve crafting item instances',()=>{
  const state=fullState();
  state.injuries.severity.head=2;
  state.injuries.unconsciousUntil=15_000;
  state.farming.skill={level:20,xp:12.5};
  state.farming.fields=[{
    id:'field-1',
    locationId:'meadow',
    cycleCropId:'turnip',
    cells:[
      {plantedAt:1_000,maturesAt:901_000},
      null,
      null,
      null,
      null,
      null
    ]
  }];
  state.farming.nextFieldNumber=2;
  state.gathering.skill={level:7,xp:42};
  state.gathering.discoveredResourceIds=['wild-herb','plant-fiber'];
  state.crafting.craftingSkill={level:50,xp:12};
  state.crafting.knownRecipeIds.push('iron-short-sword');
  state.crafting.nextInstanceNumber=2;
  state.inventory.instances=[{
    instanceId:'crafted-1',
    baseItemId:'travel-bag',
    rarity:'rare',
    upgradeLevel:3,
    properties:['roomy','light']
  }];
  const raw=encodeSave(state,999);
  const envelope=JSON.parse(raw);
  assert.equal(envelope.schemaVersion,5);
  assert.deepEqual(decodeSave(raw),state);
});

test('reconstructState normalizes expired recovery timestamps without mutating farming state',()=>{
  const state=fullState();
  state.injuries.unconsciousUntil=5_000;
  state.injuries.restUntil=10_000;
  const farmingBefore=state.farming;
  const reconstructed=reconstructState(state,20_000);
  assert.equal(reconstructed.injuries.unconsciousUntil,null);
  assert.equal(reconstructed.injuries.restUntil,null);
  assert.equal(reconstructed.farming,farmingBefore);
});

test('malformed schema v2 injury state fails closed', () => {
  const base = {
    character:{level:1,xp:0,gold:0},
    world:{locationId:'tillanium',travel:null,arrivalCount:0},
    inventory:{stacks:[]}
  };
  assert.equal(migrateSave({
    schemaVersion:2,
    savedAt:1,
    state:{...base,injuries:{}}
  }), null);
  assert.equal(migrateSave({
    schemaVersion:2,
    savedAt:1,
    state:{...base,injuries:{
      severity:{head:4,torso:0,leftArm:0,rightArm:0,leftLeg:0,rightLeg:0},
      unconsciousUntil:null,
      restUntil:null
    }}
  }), null);
});

test('partial v1 and v2 core state fail closed instead of reaching the UI', () => {
  assert.equal(migrateSave({
    schemaVersion:1,
    savedAt:1,
    state:{character:{},world:{},inventory:{}}
  }), null);

  const injuries=cleanInjuryState();
  assert.equal(migrateSave({
    schemaVersion:2,
    savedAt:1,
    state:{
      character:{level:1,xp:0},
      world:{locationId:'tillanium',travel:null,arrivalCount:0},
      inventory:{stacks:[]},
      injuries
    }
  }), null);
});

test('malformed schema v3 farming structures fail closed', () => {
  const base=fullState();

  assert.equal(migrateSave({
    schemaVersion:3,
    savedAt:1,
    state:{...base,farming:{...base.farming,skill:{level:101,xp:0}}}
  }),null);

  assert.equal(migrateSave({
    schemaVersion:3,
    savedAt:1,
    state:{...base,farming:{...base.farming,knownSeedIds:['unknown-seed']}}
  }),null);

  assert.equal(migrateSave({
    schemaVersion:3,
    savedAt:1,
    state:{...base,farming:{
      ...base.farming,
      fields:[{
        id:'field-1',
        locationId:'meadow',
        cycleCropId:'wheat',
        cells:[{plantedAt:2000,maturesAt:1000},null,null,null]
      }],
      nextFieldNumber:2
    }}
  }),null);
});

test('runtime farming work is never serialized into the durable save', () => {
  const state={
    ...fullState(),
    farmingWork:{
      type:'establish',
      locationId:'meadow',
      startedAt:0,
      nextAt:30_000
    }
  };
  const raw=encodeSave(state,123);
  const envelope=JSON.parse(raw);
  assert.equal('farmingWork' in envelope.state,false);
});


test('schema v3 rejects fields outside agricultural locations and unsafe next field numbering', () => {
  const base=fullState();
  const field={
    id:'field-3',
    locationId:'dark-forest',
    cycleCropId:null,
    cells:[null,null,null,null]
  };
  assert.equal(migrateSave({
    schemaVersion:3,
    savedAt:1,
    state:{...base,farming:{...base.farming,fields:[field],nextFieldNumber:4}}
  }),null);

  const validField={...field,locationId:'meadow'};
  assert.equal(migrateSave({
    schemaVersion:3,
    savedAt:1,
    state:{...base,farming:{...base.farming,fields:[validField],nextFieldNumber:3}}
  }),null);
});


test('valid schema v3 save migrates to schema v5 and preserves farming',()=>{
  const state=fullState();
  const {gathering,crafting,...oldState}=state;
  oldState.farming.skill={level:20,xp:12.5};
  const migrated=migrateSave({schemaVersion:3,savedAt:777,state:oldState});
  assert.equal(migrated?.schemaVersion,5);
  assert.deepEqual(migrated?.state.farming,oldState.farming);
  assert.deepEqual(migrated?.state.gathering,createDefaultGatheringState());
  assert.deepEqual(migrated?.state.crafting,createDefaultCraftingState());
  assert.deepEqual(migrated?.state.inventory.instances,[]);
});

test('malformed schema v4 gathering data fails closed',()=>{
  const base=fullState();
  assert.equal(migrateSave({
    schemaVersion:4,
    savedAt:1,
    state:{...base,gathering:{skill:{level:101,xp:0},discoveredResourceIds:[]}}
  }),null);
  assert.equal(migrateSave({
    schemaVersion:4,
    savedAt:1,
    state:{...base,gathering:{skill:{level:0,xp:0},discoveredResourceIds:['unknown-resource']}}
  }),null);
  assert.equal(migrateSave({
    schemaVersion:4,
    savedAt:1,
    state:{...base,gathering:{skill:{level:0,xp:0},discoveredResourceIds:['wild-herb','wild-herb']}}
  }),null);
});

test('runtime gathering session is never serialized into durable save',()=>{
  const state={
    ...fullState(),
    gatheringSession:{focus:'herbs',nextAt:5000,cycleMs:5000}
  };
  const raw=encodeSave(state,123);
  const envelope=JSON.parse(raw);
  assert.equal(envelope.schemaVersion,5);
  assert.equal('gatheringSession' in envelope.state,false);
});


test('valid schema v4 save migrates to schema v5 preserving gathering and adding crafting',()=>{
  const state=fullState();
  const {crafting,...oldState}=state;
  oldState.inventory={stacks:[{itemId:'wild-herb',quantity:2}]};
  oldState.gathering.skill={level:12,xp:44};
  const migrated=migrateSave({schemaVersion:4,savedAt:88,state:oldState});
  assert.equal(migrated?.schemaVersion,5);
  assert.deepEqual(migrated?.state.gathering,oldState.gathering);
  assert.deepEqual(migrated?.state.crafting,createDefaultCraftingState());
  assert.deepEqual(migrated?.state.inventory,{...oldState.inventory,instances:[]});
});

test('schema v5 rejects malformed item instances and crafting state',()=>{
  const base=fullState();
  const goodInstance={
    instanceId:'crafted-1',
    baseItemId:'travel-bag',
    rarity:'rare',
    upgradeLevel:3,
    properties:['roomy','light']
  };

  assert.equal(migrateSave({
    schemaVersion:5,savedAt:1,
    state:{...base,inventory:{...base.inventory,instances:[{...goodInstance,rarity:'unique'}]}}
  }),null);

  assert.equal(migrateSave({
    schemaVersion:5,savedAt:1,
    state:{...base,inventory:{...base.inventory,instances:[{...goodInstance,upgradeLevel:6}]}}
  }),null);

  assert.equal(migrateSave({
    schemaVersion:5,savedAt:1,
    state:{...base,inventory:{...base.inventory,instances:[{...goodInstance,properties:['roomy','roomy']}]}}
  }),null);

  assert.equal(migrateSave({
    schemaVersion:5,savedAt:1,
    state:{...base,inventory:{...base.inventory,instances:[{...goodInstance,baseItemId:'healing-potion'}]}}
  }),null);

  assert.equal(migrateSave({
    schemaVersion:5,savedAt:1,
    state:{
      ...base,
      crafting:{...base.crafting,knownRecipeIds:['unknown-recipe']}
    }
  }),null);
});

test('schema v5 enforces collision-free crafted instance numbering',()=>{
  const base=fullState();
  const instance={
    instanceId:'crafted-3',
    baseItemId:'travel-bag',
    rarity:'common',
    upgradeLevel:0,
    properties:[]
  };
  assert.equal(migrateSave({
    schemaVersion:5,savedAt:1,
    state:{
      ...base,
      inventory:{...base.inventory,instances:[instance]},
      crafting:{...base.crafting,nextInstanceNumber:3}
    }
  }),null);

  const valid=migrateSave({
    schemaVersion:5,savedAt:1,
    state:{
      ...base,
      inventory:{...base.inventory,instances:[instance]},
      crafting:{...base.crafting,nextInstanceNumber:4}
    }
  });
  assert.equal(valid?.state.crafting.nextInstanceNumber,4);
});

test('runtime crafting UI state is never serialized',()=>{
  const state={...fullState(),craftPreview:{recipeId:'travel-bag'}};
  const envelope=JSON.parse(encodeSave(state,123));
  assert.equal(envelope.schemaVersion,5);
  assert.equal('craftPreview' in envelope.state,false);
});


test('schema v5 requires positive crafted ids and exact earned property count',()=>{
  const base=fullState();

  const zeroId={
    instanceId:'crafted-0',
    baseItemId:'travel-bag',
    rarity:'common',
    upgradeLevel:0,
    properties:[]
  };
  assert.equal(migrateSave({
    schemaVersion:5,savedAt:1,
    state:{
      ...base,
      inventory:{...base.inventory,instances:[zeroId]},
      crafting:{...base.crafting,nextInstanceNumber:1}
    }
  }),null);

  const missingRareProperty={
    instanceId:'crafted-1',
    baseItemId:'travel-bag',
    rarity:'rare',
    upgradeLevel:0,
    properties:[]
  };
  assert.equal(migrateSave({
    schemaVersion:5,savedAt:1,
    state:{
      ...base,
      inventory:{...base.inventory,instances:[missingRareProperty]},
      crafting:{...base.crafting,nextInstanceNumber:2}
    }
  }),null);

  const missingUpgradeProperty={
    instanceId:'crafted-1',
    baseItemId:'travel-bag',
    rarity:'common',
    upgradeLevel:3,
    properties:[]
  };
  assert.equal(migrateSave({
    schemaVersion:5,savedAt:1,
    state:{
      ...base,
      inventory:{...base.inventory,instances:[missingUpgradeProperty]},
      crafting:{...base.crafting,nextInstanceNumber:2}
    }
  }),null);
});
