import test from 'node:test';
import assert from 'node:assert/strict';
import {inventoryMass} from '../dist/game-core/items/inventory.js';
import {itemDefs} from '../dist/content/items.js';
import {buyItem,sellItem} from '../dist/game-core/economy/merchant.js';
import {acceptLootItems} from '../dist/game-core/loot/loot.js';
import {startFishing,advanceFishing} from '../dist/game-core/peaceful/fishing.js';
import {SeededRng} from '../dist/game-core/rng.js';
import {
  applyGatheringResults,
  applyHarvestResults,
  useInjuryMedicine
} from '../dist/app/game-controller.js';
import {cleanInjuryState} from '../dist/game-core/injuries/injuries.js';

function instance(){
  return {
    instanceId:'crafted-1',
    baseItemId:'travel-bag',
    rarity:'quality',
    upgradeLevel:0,
    properties:[]
  };
}
function inventory(){
  return {stacks:[{itemId:'healing-potion',quantity:2}],instances:[instance()]};
}

test('inventory mass includes equipment instance base weight',()=>{
  assert.equal(inventoryMass(inventory(),itemDefs),1.6);
});

test('merchant stack buy and sell preserve equipment instances',()=>{
  const base={gold:100,inventory:inventory(),pressure:{},pressureUpdatedAt:0};
  const bought=buyItem(base,'wild-herb',1,1000,2);
  assert.deepEqual(bought.inventory.instances,[instance()]);
  const sold=sellItem(bought,'wild-herb',1,2000,2);
  assert.deepEqual(sold.inventory.instances,[instance()]);
});

test('accepting loot preserves equipment instances',()=>{
  const next=acceptLootItems(
    inventory(),
    [{itemId:'wild-herb',quantity:1}],
    ['wild-herb']
  );
  assert.deepEqual(next.instances,[instance()]);
});

test('fishing preserves equipment instances while adding fish',()=>{
  const started=startFishing(
    {inventory:inventory(),fishingXp:0},
    'worms',
    0,
    1
  );
  const next=advanceFishing(started,5000,new SeededRng(4),'meadow',10);
  assert.deepEqual(next.inventory.instances,[instance()]);
});

test('gathering and farming stack merges preserve equipment instances',()=>{
  const gathered=applyGatheringResults(inventory(),[
    {resourceId:'wild-herb',itemId:'wild-herb',quantity:1,rare:false}
  ]);
  assert.deepEqual(gathered.instances,[instance()]);

  const harvested=applyHarvestResults(inventory(),[
    {cropId:'wheat',itemId:'wheat',quantity:1,rare:false}
  ]);
  assert.deepEqual(harvested.instances,[instance()]);
});

test('injury medicine stack consumption preserves equipment instances',()=>{
  const inv={
    stacks:[{itemId:'weak-injury-medicine',quantity:1}],
    instances:[instance()]
  };
  const injuries=cleanInjuryState();
  injuries.severity.head=2;
  const result=useInjuryMedicine(
    inv,
    injuries,
    'weak',
    1000,
    false,
    new SeededRng(3)
  );
  assert.equal(result.ok,true);
  assert.deepEqual(result.inventory.instances,[instance()]);
});
