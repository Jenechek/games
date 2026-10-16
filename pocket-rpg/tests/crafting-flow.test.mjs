import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanInjuryState} from '../dist/game-core/injuries/injuries.js';
import {
  craftingActionReason,
  canUseCraftingWorkshop,
  replaceInventoryInstance,
  recipeScrollEntries
} from '../dist/app/game-controller.js';

test('crafting workshop guard blocks combat recovery and missing workshop but ignores overload',()=>{
  const injuries=cleanInjuryState();
  assert.equal(
    craftingActionReason(injuries,false,['forge','tailor','alchemy'],'forge',1.8,1000),
    null
  );
  assert.equal(
    craftingActionReason(injuries,true,['forge'],'forge',1,1000),
    'combat'
  );
  assert.equal(
    craftingActionReason(injuries,false,['tailor'],'forge',1,1000),
    'workshop'
  );
  injuries.unconsciousUntil=10000;
  assert.equal(
    craftingActionReason(injuries,false,['forge'],'forge',1,1000),
    'recovery'
  );
});

test('workshop guard accepts the exact required workshop',()=>{
  const injuries=cleanInjuryState();
  assert.equal(canUseCraftingWorkshop(injuries,false,['forge','tailor'],'forge',1000),true);
  assert.equal(canUseCraftingWorkshop(injuries,false,['tailor'],'forge',1000),false);
});

test('replacing one crafted instance preserves stacks and every other instance',()=>{
  const inventory={
    stacks:[{itemId:'wild-herb',quantity:2}],
    instances:[
      {instanceId:'crafted-1',baseItemId:'travel-bag',rarity:'common',upgradeLevel:0,properties:[]},
      {instanceId:'crafted-2',baseItemId:'wooden-shield',rarity:'rare',upgradeLevel:3,properties:['steadfast']}
    ]
  };
  const replacement={
    instanceId:'crafted-1',
    baseItemId:'travel-bag',
    rarity:'common',
    upgradeLevel:1,
    properties:[]
  };
  assert.deepEqual(
    replaceInventoryInstance(inventory,replacement),
    {
      stacks:[{itemId:'wild-herb',quantity:2}],
      instances:[
        replacement,
        inventory.instances[1]
      ]
    }
  );
});


test('recipe learning is a non-workshop action but still blocked by combat and recovery',()=>{
  const injuries=cleanInjuryState();
  assert.equal(
    craftingActionReason(injuries,false,[],'forge',1,1000),
    'workshop'
  );
  // Learning uses the general crafting action rather than workshop availability.
  injuries.unconsciousUntil=10000;
  assert.equal(
    craftingActionReason(injuries,false,['forge'],'forge',1,1000),
    'recovery'
  );
});


test('recipe scroll entries can be surfaced from inventory independently of workshop UI',()=>{
  const inventory={
    stacks:[
      {itemId:'wild-herb',quantity:2},
      {itemId:'recipe-light-armor',quantity:1},
      {itemId:'recipe-iron-short-sword',quantity:2}
    ],
    instances:[]
  };
  assert.deepEqual(recipeScrollEntries(inventory),[
    {itemId:'recipe-light-armor',recipeId:'light-armor',quantity:1},
    {itemId:'recipe-iron-short-sword',recipeId:'iron-short-sword',quantity:2}
  ]);
});
