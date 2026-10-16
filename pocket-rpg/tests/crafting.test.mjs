import test from 'node:test';
import assert from 'node:assert/strict';
import {SeededRng} from '../dist/game-core/rng.js';
import {
  craftRecipeBatch,
  craftingRarityProbabilities,
  createDefaultCraftingState,
  equipmentUpgradeCost,
  maxCraftableCount,
  REROLL_GOLD_COST,
  rerollEquipment,
  rollMaterialResultClass,
  upgradeEquipment
} from '../dist/game-core/crafting/crafting.js';
import {itemDefs} from '../dist/content/items.js';
import {
  craftingRecipes,
  equipmentPropertyPools
} from '../dist/content/crafting.js';

test('material result class uses weighted average with neighbor roll',()=>{
  const picks=[
    {itemId:'flax',itemClass:2,quantity:3},
    {itemId:'flax-rare',itemClass:3,quantity:7}
  ];
  assert.equal(rollMaterialResultClass(picks,{next:()=>0.69}),3);
  assert.equal(rollMaterialResultClass(picks,{next:()=>0.71}),2);
});

test('craft rarity starts common and epic remains uncommon at maximum skill',()=>{
  assert.deepEqual(craftingRarityProbabilities(0,10),{
    common:1,quality:0,rare:0,epic:0
  });
  const max=craftingRarityProbabilities(100,60);
  assert.equal(max.common,0);
  assert.ok(max.epic>0.1&&max.epic<0.2);
  assert.ok(max.quality>max.rare&&max.rare>max.epic);
});

test('batch equipment craft consumes exact materials and creates unique instances',()=>{
  const recipe=craftingRecipes['tailor-light-armor'];
  const state=createDefaultCraftingState(Object.keys(craftingRecipes));
  const inventory={
    stacks:[
      {itemId:'flax',quantity:12},
      {itemId:'plant-fiber',quantity:8}
    ],
    equipment:[]
  };
  const result=craftRecipeBatch({
    state,
    inventory,
    recipe,
    quantity:2,
    defs:itemDefs,
    propertyPools:equipmentPropertyPools,
    luck:10,
    rng:new SeededRng(12)
  });
  assert.equal(result.results.length,2);
  assert.equal(result.inventory.stacks.length,0);
  assert.equal(result.inventory.equipment.length,2);
  assert.notEqual(result.inventory.equipment[0].instanceId,result.inventory.equipment[1].instanceId);
  assert.ok(result.inventory.equipment.every(item=>item.rarity==='common'));
  assert.equal(result.state.skills.crafting.xp,60);
});

test('mixed material classes can raise crafted result class without changing recipe types',()=>{
  const recipe=craftingRecipes['tailor-light-armor'];
  const state=createDefaultCraftingState(Object.keys(craftingRecipes));
  const inventory={
    stacks:[
      {itemId:'flax',quantity:3},
      {itemId:'flax-rare',quantity:3,itemClass:2},
      {itemId:'plant-fiber',quantity:2},
      {itemId:'plant-fiber-rare',quantity:2,itemClass:2}
    ],
    equipment:[]
  };
  const result=craftRecipeBatch({
    state,
    inventory,
    recipe,
    quantity:1,
    defs:itemDefs,
    propertyPools:equipmentPropertyPools,
    luck:10,
    rng:new SeededRng(4),
    policy:'lowest'
  });
  assert.ok(result.results[0].itemClass===1||result.results[0].itemClass===2);
  assert.equal(result.inventory.equipment.length,1);
});

test('max craftable count respects all exact ingredient quantities',()=>{
  const recipe=craftingRecipes['alchemy-healing-potion'];
  const inventory={
    stacks:[
      {itemId:'medicinal-herb',quantity:5},
      {itemId:'wild-berries',quantity:8}
    ],
    equipment:[]
  };
  assert.equal(maxCraftableCount(inventory,recipe,itemDefs),2);
});

test('equipment upgrades are guaranteed, multiplicative and add milestone properties',()=>{
  const state={...createDefaultCraftingState(Object.keys(craftingRecipes)),skills:{crafting:{level:100,xp:0},alchemy:{level:0,xp:0}}};
  const crafted=craftRecipeBatch({
    state,
    inventory:{
      stacks:[
        {itemId:'flax',quantity:20},
        {itemId:'plant-fiber',quantity:20},
        {itemId:'flax-rare',quantity:4,itemClass:2}
      ],
      equipment:[]
    },
    recipe:craftingRecipes['tailor-light-armor'],
    quantity:1,
    defs:itemDefs,
    propertyPools:equipmentPropertyPools,
    luck:10,
    rng:new SeededRng(2)
  });
  let inventory=crafted.inventory;
  let gold=1000;
  const id=inventory.equipment[0].instanceId;
  const base={...inventory.equipment[0].stats};

  for(let level=1;level<=3;level+=1){
    const result=upgradeEquipment({
      state:crafted.state,
      inventory,
      gold,
      instanceId:id,
      materialType:'flax',
      defs:itemDefs,
      propertyPools:equipmentPropertyPools,
      rng:new SeededRng(level)
    });
    inventory=result.inventory;
    gold=result.gold;
  }
  const upgraded=inventory.equipment[0];
  assert.equal(upgraded.upgradeLevel,3);
  for(const [stat,value] of Object.entries(base)){
    assert.ok(Math.abs(upgraded.stats[stat]-value*(1.25**3))<0.001);
  }
  assert.equal(upgraded.properties.filter(property=>property.source==='upgrade3').length,1);
});

test('upgrade costs rise by level and item class while reroll cost stays fixed',()=>{
  assert.equal(equipmentUpgradeCost(1,1).gold,10);
  assert.equal(equipmentUpgradeCost(5,1).gold,80);
  assert.ok(equipmentUpgradeCost(5,5).gold>equipmentUpgradeCost(5,1).gold);
  assert.equal(REROLL_GOLD_COST,8);
});

test('reroll changes only selected rerollable property and charges fixed gold',()=>{
  const inventory={
    stacks:[],
    equipment:[{
      instanceId:'eq-1',
      itemId:'light-armor',
      itemClass:1,
      rarity:'rare',
      upgradeLevel:0,
      stats:{mitigation:0.06,evasion:0.09},
      properties:[
        {id:'supple',label:'Гибкое',stat:'evasion',value:0.03,rerollable:true,source:'inherent',introducedAtUpgrade:0}
      ]
    }]
  };
  const result=rerollEquipment({
    inventory,
    gold:100,
    instanceId:'eq-1',
    propertyIndex:0,
    defs:itemDefs,
    propertyPools:equipmentPropertyPools,
    rng:new SeededRng(8)
  });
  assert.equal(result.gold,92);
  assert.equal(result.inventory.equipment[0].properties.length,1);
  assert.equal(result.inventory.equipment[0].properties[0].rerollable,true);
});
