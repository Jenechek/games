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
  return {
    ...v8,
    character:{...v8.character,attributeXp:emptyAttributeProfile()}
  };
}
function legacyV10State(level=10){
  return {
    ...legacyV9State(level),
    summons:createDefaultSummonRoster()
  };
}
function fullState(level=10){
  return {
    ...legacyV10State(level),
    classState:createDefaultClassState()
  };
}

test('save load round trip preserves v11 class progression and scaled summons',async()=>{
  const store=new MemorySaveStore();
  const state=fullState(10);
  state.classState=choosePlayerClass(state.classState,'tamer');
  state.classState={...state.classState,skill:{level:20,xp:37}};
  const effective=effectiveSummonDefinitions(
    state.classState,
    playerClasses,
    summonDefinitions
  );
  state.summons=summonCreature({
    roster:state.summons,
    definition:effective['war-beast'],
    limit:3,
    now:1200
  });
  assert.equal(state.summons.active[0].hp,81);
  state.summons.active[0].hp=60;

  await store.save(state,1500);
  assert.deepEqual(await store.load(),state);
});

test('schema v10 migrates to v11 without assigning a class',()=>{
  const old=legacyV10State(10);
  const migrated=migrateSave({schemaVersion:10,savedAt:1000,state:old});
  assert.equal(migrated?.schemaVersion,11);
  assert.deepEqual(migrated?.state.summons,old.summons);
  assert.deepEqual(migrated?.state.classState,createDefaultClassState());
});

test('schema v9 still adds empty summons and empty class state',()=>{
  const old=legacyV9State(10);
  const migrated=migrateSave({schemaVersion:9,savedAt:1000,state:old});
  assert.equal(migrated?.schemaVersion,11);
  assert.deepEqual(migrated?.state.character,old.character);
  assert.deepEqual(migrated?.state.summons,createDefaultSummonRoster());
  assert.deepEqual(migrated?.state.classState,createDefaultClassState());
});

test('older schemas still migrate through all later systems',()=>{
  const old=legacyV4State();
  old.inventory.stacks=[
    {itemId:'iron-short-sword',quantity:2},
    {itemId:'medicinal-herb-rare',quantity:3}
  ];
  const migrated=migrateSave({schemaVersion:4,savedAt:1000,state:old});
  assert.equal(migrated?.schemaVersion,11);
  assert.equal(migrated?.state.inventory.equipment.length,2);
  assert.equal(migrated?.state.crafting.nextEquipmentId,3);
  assert.equal(migrated?.state.economy.trading.level,0);
  assert.equal(migrated?.state.diplomacy.skill.level,0);
  assert.deepEqual(migrated?.state.university,createDefaultUniversityState());
  assert.deepEqual(migrated?.state.character.attributes,balancedAttributesForLegacyLevel(2));
  assert.deepEqual(migrated?.state.character.attributeXp,emptyAttributeProfile());
  assert.deepEqual(migrated?.state.summons,createDefaultSummonRoster());
  assert.deepEqual(migrated?.state.classState,createDefaultClassState());
});

test('saving legacy state normalizes into schema v11',async()=>{
  const store=new MemorySaveStore();
  await store.save(legacyV4State(),1000);
  const loaded=await store.load();
  assert.deepEqual(loaded?.character.attributes,balancedAttributesForLegacyLevel(2));
  assert.deepEqual(loaded?.character.attributeXp,emptyAttributeProfile());
  assert.deepEqual(loaded?.summons,createDefaultSummonRoster());
  assert.deepEqual(loaded?.classState,createDefaultClassState());
});

test('current encoded saves use schema v11',()=>{
  const state=fullState();
  state.character.attributeXp.wisdom=42;
  const raw=encodeSave(state,999);
  const envelope=JSON.parse(raw);
  assert.equal(envelope.schemaVersion,11);
  assert.deepEqual(decodeSave(raw),state);
});

test('v11 accepts tamer class-scaled summon HP above base maximum',()=>{
  const state=fullState();
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
  assert.notEqual(migrateSave({schemaVersion:11,savedAt:200,state}),null);
});

test('v11 rejects invalid class ids and nonzero skill without a class',()=>{
  const base=fullState();
  assert.equal(migrateSave({
    schemaVersion:11,
    savedAt:1,
    state:{...base,classState:{classId:'unknown',skill:{level:0,xp:0}}}
  }),null);
  assert.equal(migrateSave({
    schemaVersion:11,
    savedAt:1,
    state:{...base,classState:{classId:null,skill:{level:1,xp:0}}}
  }),null);
});

test('v11 rejects summons outside selected class unlocks and limits',()=>{
  const base=fullState();
  base.classState=choosePlayerClass(base.classState,'mage');

  const war=summonCreature({
    roster:createDefaultSummonRoster(),
    definition:summonDefinitions['war-beast'],
    limit:3,
    now:100
  });
  assert.equal(migrateSave({
    schemaVersion:11,
    savedAt:1,
    state:{...base,summons:war}
  }),null);

  const tamer=fullState();
  tamer.classState=choosePlayerClass(tamer.classState,'tamer');
  const swift=summonCreature({
    roster:createDefaultSummonRoster(),
    definition:summonDefinitions['swift-beast'],
    limit:3,
    now:100
  });
  assert.equal(migrateSave({
    schemaVersion:11,
    savedAt:1,
    state:{...tamer,summons:swift}
  }),null);

  let mageRoster=createDefaultSummonRoster();
  mageRoster=summonCreature({
    roster:mageRoster,
    definition:summonDefinitions['guardian-elemental'],
    limit:3,
    now:100
  });
  mageRoster=summonCreature({
    roster:mageRoster,
    definition:summonDefinitions['guardian-elemental'],
    limit:3,
    now:200
  });
  assert.equal(migrateSave({
    schemaVersion:11,
    savedAt:1,
    state:{...base,summons:mageRoster}
  }),null);
});

test('reconstructing state completes retraining and heals tamer summon to scaled maximum',()=>{
  const state=fullState(10);
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
  const effective=effectiveSummonDefinitions(
    state.classState,
    playerClasses,
    summonDefinitions
  );
  state.summons=summonCreature({
    roster:state.summons,
    definition:effective['war-beast'],
    limit:3,
    now:1000
  });
  state.summons.active[0].hp=20;
  state.summons.active[0].stamina=20;

  const now=1000+Math.max(RETRAINING_DURATION_MS,SUMMON_FULL_RECOVERY_MS);
  const once=reconstructState(state,now);
  const twice=reconstructState(once,now);
  assert.equal(once.university.pending,null);
  assert.equal(once.summons.active[0].hp,81);
  assert.equal(once.summons.active[0].stamina,100);
  assert.deepEqual(twice.summons,once.summons);
});

test('corrupted and unknown saves fail closed',()=>{
  assert.equal(decodeSave('{not json'),null);
  assert.equal(decodeSave(JSON.stringify({schemaVersion:999,state:{}})),null);
});
