import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EQUIPMENT_SLOTS,
  canEquip,
  createDefaultEquipmentLoadout,
  createLegacyEquipmentInstance,
  equipInstance,
  equipmentStatTotals,
  equipmentStatValues,
  equipmentSlotStatValues,
  isEquippedInstance,
  pruneInvalidEquipmentLoadout,
  unequipSlot,
  validateEquipmentLoadout
} from '../dist/game-core/items/equipment.js';
import {currentLoadRatio} from '../dist/app/game-controller.js';
import {itemDefs} from '../dist/content/items.js';

const attributes=(strength=20)=>({
  strength,
  agility:10,
  intuition:10,
  vitality:10,
  wisdom:10,
  luck:10,
  charisma:10,
  intelligence:10
});

function inventoryWith(...ids){
  return {
    stacks:[],
    equipment:ids.map((itemId,index)=>
      createLegacyEquipmentInstance(`eq-${index+1}`,itemDefs[itemId])
    )
  };
}

test('loadout exposes exactly four persistent slots',()=>{
  assert.deepEqual(EQUIPMENT_SLOTS,['mainHand','offHand','body','bag']);
  assert.deepEqual(createDefaultEquipmentLoadout(),{
    mainHand:null,
    offHand:null,
    body:null,
    bag:null
  });
});

test('starter short sword has no circular skill gate but still checks strength',()=>{
  const sword=itemDefs['iron-short-sword'];
  assert.equal(canEquip({
    attributes:attributes(11),
    skills:{'short-sword':0}
  },sword).ok,false);
  assert.equal(canEquip({
    attributes:attributes(12),
    skills:{'short-sword':0}
  },sword).ok,true);
});

test('rare short sword keeps level twenty skill requirement',()=>{
  const sword=itemDefs['rare-short-sword'];
  assert.equal(canEquip({
    attributes:attributes(20),
    skills:{'short-sword':19}
  },sword).ok,false);
  assert.equal(canEquip({
    attributes:attributes(20),
    skills:{'short-sword':20}
  },sword).ok,true);
});

test('equipping replaces the previous item in the same slot without deleting it',()=>{
  const inventory=inventoryWith('iron-short-sword','rare-short-sword');
  let loadout=createDefaultEquipmentLoadout();
  loadout=equipInstance({
    loadout,
    inventory,
    instanceId:'eq-1',
    itemDefs,
    character:{attributes:attributes(20),skills:{'short-sword':20}}
  }).loadout;
  loadout=equipInstance({
    loadout,
    inventory,
    instanceId:'eq-2',
    itemDefs,
    character:{attributes:attributes(20),skills:{'short-sword':20}}
  }).loadout;

  assert.equal(loadout.mainHand,'eq-2');
  assert.equal(inventory.equipment.length,2);
  assert.equal(isEquippedInstance(loadout,'eq-1'),false);
  assert.equal(isEquippedInstance(loadout,'eq-2'),true);
  assert.equal(unequipSlot(loadout,'mainHand').mainHand,null);
});

test('loadout validation rejects missing wrong duplicate and extra slots',()=>{
  const inventory=inventoryWith('iron-short-sword','wooden-shield');
  const valid={
    mainHand:'eq-1',
    offHand:'eq-2',
    body:null,
    bag:null
  };
  const character={attributes:attributes(20),skills:{'short-sword':20}};

  assert.equal(validateEquipmentLoadout(valid,inventory,itemDefs,character),true);
  assert.equal(validateEquipmentLoadout(
    {...valid,mainHand:'missing'},
    inventory,itemDefs,character
  ),false);
  assert.equal(validateEquipmentLoadout(
    {...valid,offHand:'eq-1'},
    inventory,itemDefs,character
  ),false);
  assert.equal(validateEquipmentLoadout(
    {...valid,body:'eq-1'},
    inventory,itemDefs,character
  ),false);
  assert.equal(validateEquipmentLoadout(
    {...valid,extra:null},
    inventory,itemDefs,character
  ),false);
});

test('loadout validation and pruning enforce requirements after attributes change',()=>{
  const inventory=inventoryWith('rare-short-sword');
  const loadout={
    mainHand:'eq-1',
    offHand:null,
    body:null,
    bag:null
  };
  assert.equal(validateEquipmentLoadout(
    loadout,
    inventory,
    itemDefs,
    {attributes:attributes(20),skills:{'short-sword':20}}
  ),true);
  assert.equal(validateEquipmentLoadout(
    loadout,
    inventory,
    itemDefs,
    {attributes:attributes(19),skills:{'short-sword':20}}
  ),false);

  const pruned=pruneInvalidEquipmentLoadout({
    loadout,
    inventory,
    itemDefs,
    character:{attributes:attributes(19),skills:{'short-sword':20}}
  });
  assert.equal(pruned.mainHand,null);
});

test('equipped stats include base stats and rolled properties',()=>{
  const inventory=inventoryWith('wooden-shield','light-armor');
  inventory.equipment[0].properties.push({
    id:'reinforced',
    label:'Укреплённое',
    stat:'mitigation',
    value:0.03,
    rerollable:true,
    source:'inherent',
    introducedAtUpgrade:0
  });
  const loadout={
    mainHand:null,
    offHand:'eq-1',
    body:'eq-2',
    bag:null
  };
  const totals=equipmentStatTotals(loadout,inventory);
  assert.equal(totals.blockChance,0.12);
  assert.equal(totals.evasion,0.08);
  assert.ok(Math.abs(totals.mitigation-0.16)<1e-10);
  assert.deepEqual(equipmentStatValues(loadout,inventory,'mitigation'),[
    0.08,0.03,0.05
  ]);
});

test('equipped bag capacity is usable by normal load ratio calculation',()=>{
  const inventory=inventoryWith('travel-bag');
  inventory.stacks=[{itemId:'iron-ingot',quantity:20}];
  const loadout={
    mainHand:null,
    offHand:null,
    body:null,
    bag:'eq-1'
  };
  const capacity=equipmentStatTotals(loadout,inventory).capacity;
  assert.equal(capacity,20);
  const without=currentLoadRatio(inventory,{strength:10,vitality:10});
  const withBag=currentLoadRatio(
    inventory,
    {strength:10,vitality:10},
    capacity
  );
  assert.ok(withBag<without);
});


test('short sword items declare the authored weapon hierarchy explicitly',()=>{
  assert.deepEqual(itemDefs['iron-short-sword'].skillPath,[
    'weapons','one-handed','swords','short-sword'
  ]);
  assert.deepEqual(
    itemDefs['rare-short-sword'].skillPath,
    itemDefs['iron-short-sword'].skillPath
  );
});


test('armor and shield items declare combat skill paths',()=>{
  assert.deepEqual(itemDefs['light-armor'].skillPath,[
    'armor','body-armor','light-armor'
  ]);
  assert.deepEqual(itemDefs['heavy-armor'].skillPath,[
    'armor','body-armor','heavy-armor'
  ]);
  assert.deepEqual(itemDefs['wooden-shield'].skillPath,['shields']);
});


test('per-slot stat extraction keeps body and shield mitigation separate',()=>{
  const inventory=inventoryWith('wooden-shield','light-armor');
  const loadout={
    mainHand:null,
    offHand:'eq-1',
    body:'eq-2',
    bag:null
  };
  assert.deepEqual(
    equipmentSlotStatValues(loadout,inventory,'offHand','mitigation'),
    [0.08]
  );
  assert.deepEqual(
    equipmentSlotStatValues(loadout,inventory,'body','mitigation'),
    [0.05]
  );
  assert.deepEqual(
    equipmentSlotStatValues(loadout,inventory,'offHand','blockChance'),
    [0.12]
  );
});
