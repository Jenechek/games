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
  ARMOR_SKILL_IDS,
  BLOCKING_SKILL_IDS,
  MAGIC_SKILL_IDS,
  WEAPON_SKILL_IDS,
  createDefaultSkillProgression,
  upgradeSkillProgressionV15
} from '../dist/game-core/progression/skill-progress.js';
import {
  createDefaultClassState,
  choosePlayerClass,
  effectiveSummonDefinitions
} from '../dist/game-core/classes/classes.js';
import {
  createDefaultEquipmentLoadout,
  createLegacyEquipmentInstance
} from '../dist/game-core/items/equipment.js';
import {
  SUMMON_FULL_RECOVERY_MS,
  createDefaultSummonRoster,
  summonCreature
} from '../dist/game-core/summons/summons.js';
import {
  balancedAttributesForLegacyLevel,
  createDefaultUniversityState
} from '../dist/game-core/university/retraining.js';
import {starterRecipeIds} from '../dist/content/crafting.js';
import {summonDefinitions} from '../dist/content/summons.js';
import {playerClasses} from '../dist/content/classes.js';
import {itemDefs} from '../dist/content/items.js';

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
function legacyV13State(level=10){
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
      diplomacy:{...legacy.diplomacy.skill},
      weapons:{level:0,xp:0},
      'one-handed':{level:0,xp:0},
      swords:{level:0,xp:0},
      'short-sword':{level:0,xp:0}
    }
  };
}
function legacyV14State(level=10){
  return {
    ...legacyV13State(level),
    equipmentLoadout:createDefaultEquipmentLoadout()
  };
}
function legacyV15State(level=10){
  const legacy=legacyV14State(level);
  return {
    ...legacy,
    skillProgression:{
      ...legacy.skillProgression,
      armor:{level:0,xp:0},
      'body-armor':{level:0,xp:0},
      'light-armor':{level:0,xp:0},
      'heavy-armor':{level:0,xp:0},
      shields:{level:0,xp:0}
    }
  };
}
function fullState(level=10){
  const legacy=legacyV15State(level);
  return {
    ...legacy,
    skillProgression:upgradeSkillProgressionV15(legacy.skillProgression)
  };
}

function addEquipment(state,itemId,instanceId='eq-1'){
  const instance=createLegacyEquipmentInstance(instanceId,itemDefs[itemId]);
  state.inventory={
    stacks:state.inventory.stacks.map(stack=>({...stack})),
    equipment:[...(state.inventory.equipment??[]),instance]
  };
  const match=/^eq-(\d+)$/.exec(instanceId);
  state.crafting={
    ...state.crafting,
    nextEquipmentId:Math.max(
      state.crafting.nextEquipmentId,
      (match?Number(match[1]):0)+1
    )
  };
  return instance;
}

test('schema v15 migrates to v16 preserving defense loadout and adding zero magic',()=>{
  const old=legacyV15State();
  old.skillProgression.armor={level:4,xp:10};
  old.skillProgression['light-armor']={level:7,xp:21};
  addEquipment(old,'light-armor');
  old.equipmentLoadout.body='eq-1';

  const migrated=migrateSave({schemaVersion:15,savedAt:1000,state:old});
  assert.equal(migrated?.schemaVersion,16);
  assert.equal(migrated?.state.equipmentLoadout.body,'eq-1');
  assert.deepEqual(migrated?.state.skillProgression.armor,{level:4,xp:10});
  assert.deepEqual(migrated?.state.skillProgression['light-armor'],{level:7,xp:21});
  for(const id of MAGIC_SKILL_IDS){
    assert.deepEqual(migrated?.state.skillProgression[id],{level:0,xp:0});
  }
});

test('schema v14 migrates to v16 preserving loadout and zeroing defense and magic',()=>{
  const old=legacyV14State();
  old.skillProgression.weapons={level:4,xp:10};
  old.character.attributes.strength=12;
  addEquipment(old,'iron-short-sword');
  old.equipmentLoadout.mainHand='eq-1';

  const migrated=migrateSave({schemaVersion:14,savedAt:1000,state:old});
  assert.equal(migrated?.schemaVersion,16);
  assert.equal(migrated?.state.equipmentLoadout.mainHand,'eq-1');
  assert.deepEqual(migrated?.state.skillProgression.weapons,{level:4,xp:10});
  for(const id of [...ARMOR_SKILL_IDS,...BLOCKING_SKILL_IDS,...MAGIC_SKILL_IDS]){
    assert.deepEqual(migrated?.state.skillProgression[id],{level:0,xp:0});
  }
});

test('schema v12 migrates to v16 preserving professions and zeroing later combat skills',()=>{
  const old=legacyV12State();
  old.skillProgression.fishing={level:4,xp:91.25};
  old.skillProgression.farming={level:7,xp:12.5};
  old.farming.skill={...old.skillProgression.farming};

  const migrated=migrateSave({schemaVersion:12,savedAt:1000,state:old});
  assert.equal(migrated?.schemaVersion,16);
  assert.deepEqual(migrated?.state.skillProgression.fishing,{level:4,xp:91.25});
  assert.deepEqual(migrated?.state.skillProgression.farming,{level:7,xp:12.5});
  for(const id of [
    ...WEAPON_SKILL_IDS,
    ...ARMOR_SKILL_IDS,
    ...BLOCKING_SKILL_IDS,
    ...MAGIC_SKILL_IDS
  ]){
    assert.deepEqual(migrated?.state.skillProgression[id],{level:0,xp:0});
  }
});

test('current v16 round trip preserves magic defense skills and loadout',async()=>{
  const store=new MemorySaveStore();
  const state=fullState();
  addEquipment(state,'light-armor','eq-1');
  addEquipment(state,'wooden-shield','eq-2');
  state.equipmentLoadout.body='eq-1';
  state.equipmentLoadout.offHand='eq-2';
  state.skillProgression.armor={level:10,xp:2};
  state.skillProgression.shields={level:13,xp:5};
  state.skillProgression.magic={level:14,xp:6};
  state.skillProgression.arcane={level:15,xp:7};
  state.skillProgression.concentration={level:16,xp:8};
  state.skillProgression['arcane-focus']={level:17,xp:9};

  await store.save(state,1500);
  const loaded=await store.load();
  assert.deepEqual(loaded?.skillProgression,state.skillProgression);
  assert.deepEqual(loaded?.equipmentLoadout,state.equipmentLoadout);
});

test('current encoded saves use schema v16 and canonical mirrors remain authoritative',()=>{
  const state=fullState();
  state.skillProgression.trading={level:20,xp:42};
  state.economy.trading={level:1,xp:1};

  const envelope=JSON.parse(encodeSave(state,999));
  assert.equal(envelope.schemaVersion,16);
  assert.deepEqual(envelope.state.skillProgression.trading,{level:20,xp:42});
  assert.deepEqual(envelope.state.economy.trading,{level:20,xp:42});
});

test('v16 rejects missing unknown or malformed magic skill entries',()=>{
  const base=fullState();

  const missing={...base.skillProgression};
  delete missing['arcane-focus'];
  assert.equal(migrateSave({
    schemaVersion:16,
    savedAt:1,
    state:{...base,skillProgression:missing}
  }),null);

  assert.equal(migrateSave({
    schemaVersion:16,
    savedAt:1,
    state:{...base,skillProgression:{
      ...base.skillProgression,
      unknown:{level:0,xp:0}
    }}
  }),null);

  assert.equal(migrateSave({
    schemaVersion:16,
    savedAt:1,
    state:{...base,skillProgression:{
      ...base.skillProgression,
      magic:{level:101,xp:0}
    }}
  }),null);
});

test('v15 rejects magic keys because they did not exist in that schema',()=>{
  const old=legacyV15State();
  assert.equal(migrateSave({
    schemaVersion:15,
    savedAt:1,
    state:{
      ...old,
      skillProgression:{
        ...old.skillProgression,
        magic:{level:0,xp:0}
      }
    }
  }),null);
});

test('v16 still rejects missing wrong-slot and unmet loadout references',()=>{
  const state=fullState();
  state.character.attributes.strength=12;
  addEquipment(state,'iron-short-sword');
  state.equipmentLoadout.mainHand='eq-1';

  assert.equal(migrateSave({
    schemaVersion:16,
    savedAt:1,
    state:{...state,equipmentLoadout:{
      ...state.equipmentLoadout,
      mainHand:'missing'
    }}
  }),null);

  assert.equal(migrateSave({
    schemaVersion:16,
    savedAt:1,
    state:{...state,equipmentLoadout:{
      ...state.equipmentLoadout,
      offHand:'eq-1'
    }}
  }),null);

  assert.equal(migrateSave({
    schemaVersion:16,
    savedAt:1,
    state:{
      ...state,
      character:{
        ...state.character,
        attributes:{...state.character.attributes,strength:11}
      }
    }
  }),null);
});

test('v16 rejects drift between canonical profession skill and nested mirror',()=>{
  const state=fullState();
  state.skillProgression.diplomacy={level:20,xp:5};
  assert.equal(migrateSave({schemaVersion:16,savedAt:1,state}),null);
});

test('older schemas still migrate through v16 with all current defaults',()=>{
  const old=legacyV4State();
  old.inventory.stacks=[
    {itemId:'iron-short-sword',quantity:2},
    {itemId:'medicinal-herb-rare',quantity:3}
  ];
  const migrated=migrateSave({schemaVersion:4,savedAt:1000,state:old});
  assert.equal(migrated?.schemaVersion,16);
  assert.equal(migrated?.state.inventory.equipment.length,2);
  assert.equal(migrated?.state.crafting.nextEquipmentId,3);
  assert.deepEqual(migrated?.state.skillProgression,createDefaultSkillProgression());
  assert.deepEqual(migrated?.state.summons,createDefaultSummonRoster());
  assert.deepEqual(migrated?.state.classState,createDefaultClassState());
  assert.deepEqual(migrated?.state.equipmentLoadout,createDefaultEquipmentLoadout());
});

test('v16 supports class-scaled summons with magic progression and loadout',()=>{
  const state=fullState();
  addEquipment(state,'light-armor');
  state.equipmentLoadout.body='eq-1';
  state.skillProgression.magic={level:3,xp:2};
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
  assert.notEqual(migrateSave({schemaVersion:16,savedAt:200,state}),null);
});

test('reconstructing state preserves loadout magic skills and summon recovery',()=>{
  const state=fullState(10);
  addEquipment(state,'heavy-armor');
  state.equipmentLoadout.body='eq-1';
  state.skillProgression.magic={level:6,xp:12.5};
  state.skillProgression.arcane={level:6,xp:12.5};
  state.skillProgression.concentration={level:6,xp:12.5};
  state.skillProgression['arcane-focus']={level:6,xp:12.5};
  state.classState=choosePlayerClass(state.classState,'tamer');
  const effective=effectiveSummonDefinitions(state.classState,playerClasses,summonDefinitions);
  state.summons=summonCreature({
    roster:state.summons,
    definition:effective['war-beast'],
    limit:3,
    now:1000
  });
  state.summons.active[0].hp=20;

  const once=reconstructState(state,1000+SUMMON_FULL_RECOVERY_MS);
  assert.equal(once.equipmentLoadout.body,'eq-1');
  assert.equal(once.skillProgression['arcane-focus'].level,6);
  assert.equal(once.summons.active[0].hp,81);
});

test('corrupted and unknown saves fail closed',()=>{
  assert.equal(decodeSave('{not json'),null);
  assert.equal(decodeSave(JSON.stringify({schemaVersion:999,state:{}})),null);
});
