import test from 'node:test';
import assert from 'node:assert/strict';
import { MemorySaveStore, decodeSave, encodeSave } from '../dist/storage/indexed-db.js';
import { migrateSave } from '../dist/storage/migrations.js';
import { reconstructState } from '../dist/game-core/game-state.js';
import { cleanInjuryState } from '../dist/game-core/injuries/injuries.js';

test('save load round trip preserves durable state', async () => {
  const store = new MemorySaveStore();
  const state = {
    character:{level:2,xp:20,gold:15},
    world:{locationId:'tillanium',travel:null,arrivalCount:0},
    inventory:{stacks:[{itemId:'healing-potion',quantity:2}]},
    injuries:cleanInjuryState()
  };
  await store.save(state,1000);
  assert.deepEqual(await store.load(),state);
});

test('corrupted save returns null',()=>{
  assert.equal(decodeSave('{not json'),null);
  assert.equal(decodeSave(JSON.stringify({schemaVersion:999,state:{}})),null);
});

test('reconstructing finished travel is idempotent',()=>{
  const s={
    character:{level:1,xp:0,gold:0},
    inventory:{stacks:[]},
    injuries:cleanInjuryState(),
    world:{locationId:'tillanium',arrivalCount:0,travel:{fromId:'tillanium',destinationId:'city-gate',startedAt:1000,arrivesAt:5000}}
  };
  const once=reconstructState(s,6000),twice=reconstructState(once,6000);
  assert.equal(once.world.locationId,'city-gate');
  assert.equal(twice.world.arrivalCount,1);
});

test('valid schema v1 save migrates to schema v2 with clean injury state',()=>{
  const oldState={
    character:{level:3,xp:44,gold:71},
    world:{locationId:'meadow',travel:null,arrivalCount:2},
    inventory:{stacks:[{itemId:'healing-potion',quantity:1}]}
  };
  const migrated=migrateSave({schemaVersion:1,savedAt:1234,state:oldState});
  assert.equal(migrated?.schemaVersion,2);
  assert.deepEqual(migrated?.state.character,oldState.character);
  assert.deepEqual(migrated?.state.world,oldState.world);
  assert.deepEqual(migrated?.state.inventory,oldState.inventory);
  assert.deepEqual(migrated?.state.injuries,cleanInjuryState());
});

test('new saves use schema v2 and preserve injury state',()=>{
  const injuries=cleanInjuryState();
  injuries.severity.head=2;
  injuries.unconsciousUntil=15_000;
  injuries.restUntil=120_000;
  const state={
    character:{level:2,xp:7,gold:11},
    world:{locationId:'forest-edge',travel:null,arrivalCount:1},
    inventory:{stacks:[]},
    injuries
  };
  const raw=encodeSave(state,999);
  const envelope=JSON.parse(raw);
  assert.equal(envelope.schemaVersion,2);
  assert.deepEqual(decodeSave(raw),state);
});

test('reconstructState normalizes expired recovery timestamps',()=>{
  const injuries=cleanInjuryState();
  injuries.unconsciousUntil=5_000;
  injuries.restUntil=10_000;
  const state={
    character:{level:1,xp:0,gold:0},
    world:{locationId:'tillanium',travel:null,arrivalCount:0},
    inventory:{stacks:[]},
    injuries
  };
  const reconstructed=reconstructState(state,20_000);
  assert.equal(reconstructed.injuries.unconsciousUntil,null);
  assert.equal(reconstructed.injuries.restUntil,null);
});
