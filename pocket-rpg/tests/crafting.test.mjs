import test from 'node:test';
import assert from 'node:assert/strict';
import {SeededRng} from '../dist/game-core/rng.js';
import {
  createDefaultCraftingState,
  recipeMaterialSelection,
  craftRarityProbabilities,
  sampleCraftRarity,
  craftReadiness,
  craftRecipe,
  effectiveInstanceStats,
  upgradeCost,
  upgradeItem,
  rerollItemProperty,
  eligiblePropertyIds
} from '../dist/game-core/crafting/crafting.js';
import {craftRecipes} from '../dist/content/crafting.js';

function inv(stacks,instances=[]){return {stacks,instances};}
function withSkill(level){
  const state=createDefaultCraftingState();
  state.craftingSkill={level,xp:0};
  state.alchemySkill={level,xp:0};
  state.knownRecipeIds=Object.keys(craftRecipes);
  return state;
}

test('default crafting state has separate crafting and alchemy skills and monotonic instance id',()=>{
  assert.deepEqual(createDefaultCraftingState(),{
    craftingSkill:{level:0,xp:0},
    alchemySkill:{level:0,xp:0},
    knownRecipeIds:['healing-potion','weak-injury-medicine','travel-bag'],
    nextInstanceNumber:1
  });
});

test('material selection uses exact material type quantity and consumes higher class first',()=>{
  const inventory=inv([
    {itemId:'wild-herb',quantity:3},
    {itemId:'wild-herb-rare',quantity:1},
    {itemId:'wild-berries',quantity:1}
  ]);
  const selection=recipeMaterialSelection(craftRecipes['healing-potion'],inventory);
  assert.deepEqual(selection.picks,[
    {itemId:'wild-herb-rare',quantity:1,materialClass:1},
    {itemId:'wild-herb',quantity:1,materialClass:0},
    {itemId:'wild-berries',quantity:1,materialClass:0}
  ]);
  assert.equal(selection.complete,true);
  assert.equal(selection.weightedAverageClass,1/3);
});

test('rarity preview uses material class skill luck and unlocked rarity cap',()=>{
  const state=withSkill(20);
  const inventory=inv([
    {itemId:'leather',quantity:2},
    {itemId:'plant-fiber',quantity:3}
  ]);
  assert.deepEqual(
    craftRarityProbabilities(craftRecipes['travel-bag'],state,inventory,10),
    {common:0.6,quality:0.4,rare:0,epic:0}
  );

  const high=withSkill(100);
  const rareMaterials=inv([
    {itemId:'leather',quantity:2},
    {itemId:'plant-fiber-rare',quantity:3}
  ]);
  const probs=craftRarityProbabilities(craftRecipes['travel-bag'],high,rareMaterials,10);
  assert.equal(probs.epic,0.6);
  assert.equal(probs.rare,0.4);
});

test('sampling rarity uses the same probability table deterministically',()=>{
  const probs={common:0.6,quality:0.4,rare:0,epic:0};
  assert.equal(sampleCraftRarity(probs,{next:()=>0.59}),'common');
  assert.equal(sampleCraftRarity(probs,{next:()=>0.60}),'quality');
  assert.equal(sampleCraftRarity(probs,{next:()=>0.99}),'quality');
});

test('craft readiness checks known recipe workshop skill and materials',()=>{
  const state=createDefaultCraftingState();
  assert.deepEqual(
    craftReadiness(state,inv([]),'iron-short-sword','forge'),
    {ok:false,reasons:['recipe','skill','materials']}
  );

  state.knownRecipeIds.push('iron-short-sword');
  state.craftingSkill={level:35,xp:0};
  const ready=craftReadiness(
    state,
    inv([{itemId:'iron-ingot',quantity:3},{itemId:'wood-plank',quantity:1}]),
    'iron-short-sword',
    'forge'
  );
  assert.deepEqual(ready,{ok:true,reasons:[]});
  assert.deepEqual(
    craftReadiness(state,inv([{itemId:'iron-ingot',quantity:3},{itemId:'wood-plank',quantity:1}]),'iron-short-sword','tailor'),
    {ok:false,reasons:['workshop']}
  );
});

test('alchemy consumes exact materials adds stack and grants alchemy xp',()=>{
  const state=createDefaultCraftingState();
  const inventory=inv([
    {itemId:'wild-herb',quantity:2},
    {itemId:'wild-berries',quantity:1}
  ]);
  const result=craftRecipe(state,inventory,'healing-potion','alchemy',10,new SeededRng(1));
  assert.equal(result.output.kind,'stack');
  assert.deepEqual(result.inventory.stacks,[{itemId:'healing-potion',quantity:1}]);
  assert.equal(result.state.alchemySkill.xp,20);
  assert.equal(result.state.craftingSkill.xp,0);
  assert.equal(result.state.nextInstanceNumber,1);
});

test('equipment crafting creates one instance at upgrade zero with rolled rarity and crafting xp',()=>{
  const state=withSkill(50);
  const inventory=inv([
    {itemId:'leather',quantity:2},
    {itemId:'plant-fiber',quantity:3}
  ]);
  const result=craftRecipe(state,inventory,'travel-bag','tailor',10,{next:()=>0.1});
  assert.equal(result.output.kind,'instance');
  assert.equal(result.output.instance.instanceId,'crafted-1');
  assert.equal(result.output.instance.baseItemId,'travel-bag');
  assert.equal(result.output.instance.rarity,'quality');
  assert.equal(result.output.instance.upgradeLevel,0);
  assert.deepEqual(result.output.instance.properties,[]);
  assert.deepEqual(result.inventory.instances,[result.output.instance]);
  assert.equal(result.state.craftingSkill.xp,25);
  assert.equal(result.state.nextInstanceNumber,2);
});

test('rare equipment starts with one unique eligible property',()=>{
  const state=withSkill(100);
  const inventory=inv([
    {itemId:'leather',quantity:2},
    {itemId:'plant-fiber-rare',quantity:3}
  ]);
  const result=craftRecipe(state,inventory,'travel-bag','tailor',10,{next:()=>0.1});
  assert.equal(result.output.kind,'instance');
  assert.equal(result.output.instance.rarity,'rare');
  assert.equal(result.output.instance.properties.length,1);
  assert.ok(eligiblePropertyIds('travel-bag').includes(result.output.instance.properties[0]));
});

test('effective stats apply rarity then upgrade multipliers then numeric property',()=>{
  const stats=effectiveInstanceStats({
    instanceId:'crafted-1',
    baseItemId:'travel-bag',
    rarity:'quality',
    upgradeLevel:2,
    properties:['roomy']
  });
  assert.equal(stats.capacity,37.8125);
});

test('upgrade costs are fixed and upgrades three and five add non-duplicate properties',()=>{
  assert.deepEqual([1,2,3,4,5].map(upgradeCost),[20,40,60,80,100]);

  let item={
    instanceId:'crafted-1',
    baseItemId:'travel-bag',
    rarity:'common',
    upgradeLevel:2,
    properties:[]
  };
  let result=upgradeItem(item,100,{next:()=>0});
  assert.equal(result.ok,true);
  assert.equal(result.gold,40);
  assert.equal(result.instance.upgradeLevel,3);
  assert.equal(result.instance.properties.length,1);

  item={...result.instance,upgradeLevel:4};
  result=upgradeItem(item,200,{next:()=>0});
  assert.equal(result.ok,true);
  assert.equal(result.instance.upgradeLevel,5);
  assert.equal(result.instance.properties.length,2);
  assert.equal(new Set(result.instance.properties).size,2);
});

test('upgrade failure does not spend gold or mutate instance',()=>{
  const item={
    instanceId:'crafted-1',
    baseItemId:'travel-bag',
    rarity:'common',
    upgradeLevel:0,
    properties:[]
  };
  const result=upgradeItem(item,19,{next:()=>0});
  assert.equal(result.ok,false);
  assert.equal(result.gold,19);
  assert.deepEqual(result.instance,item);
});

test('reroll costs ten gold excludes other properties and rejects when no alternative',()=>{
  const item={
    instanceId:'crafted-1',
    baseItemId:'travel-bag',
    rarity:'rare',
    upgradeLevel:5,
    properties:['roomy','light']
  };
  const result=rerollItemProperty(item,0,20,{next:()=>0});
  assert.equal(result.ok,true);
  assert.equal(result.gold,10);
  assert.notEqual(result.instance.properties[0],'roomy');
  assert.notEqual(result.instance.properties[0],'light');
  assert.equal(new Set(result.instance.properties).size,2);

  const narrow={
    instanceId:'crafted-2',
    baseItemId:'unknown',
    rarity:'rare',
    upgradeLevel:3,
    properties:['light','balanced']
  };
  const rejected=rerollItemProperty(narrow,0,20,{next:()=>0});
  assert.equal(rejected.ok,false);
  assert.equal(rejected.gold,20);
  assert.deepEqual(rejected.instance,narrow);
});
