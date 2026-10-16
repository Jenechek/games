import type { EquipmentPropertyRollDefinition } from '../game-core/items/equipment.js';
import type { RecipeDefinition } from '../game-core/crafting/types.js';

export const craftingRecipes:Record<string,RecipeDefinition>={
  'tailor-light-armor':{
    id:'tailor-light-armor',
    label:'Лёгкая льняная броня',
    kind:'equipment',
    resultItemId:'light-armor',
    resultQuantity:1,
    skillId:'crafting',
    requiredSkill:0,
    workshop:'tailor',
    ingredients:[
      {materialType:'flax',quantity:6},
      {materialType:'plant-fiber',quantity:4}
    ],
    xp:30
  },
  'tailor-travel-bag':{
    id:'tailor-travel-bag',
    label:'Походная сумка',
    kind:'equipment',
    resultItemId:'travel-bag',
    resultQuantity:1,
    skillId:'crafting',
    requiredSkill:20,
    workshop:'tailor',
    ingredients:[
      {materialType:'flax',quantity:4},
      {materialType:'plant-fiber',quantity:6}
    ],
    xp:34
  },
  'alchemy-healing-potion':{
    id:'alchemy-healing-potion',
    label:'Лечебное зелье',
    kind:'stack',
    resultItemId:'healing-potion',
    resultQuantity:1,
    skillId:'alchemy',
    requiredSkill:0,
    workshop:'alchemist',
    ingredients:[
      {materialType:'medicinal-herb',quantity:2},
      {materialType:'wild-berries',quantity:1}
    ],
    xp:20
  },
  'alchemy-weak-injury-medicine':{
    id:'alchemy-weak-injury-medicine',
    label:'Слабое средство от травм',
    kind:'stack',
    resultItemId:'weak-injury-medicine',
    resultQuantity:1,
    skillId:'alchemy',
    requiredSkill:0,
    workshop:'alchemist',
    ingredients:[
      {materialType:'medicinal-herb',quantity:2},
      {materialType:'wild-herb',quantity:1}
    ],
    xp:20
  },
  'alchemy-focus-tonic':{
    id:'alchemy-focus-tonic',
    label:'Настой сосредоточения',
    kind:'stack',
    resultItemId:'focus-tonic',
    resultQuantity:1,
    skillId:'alchemy',
    requiredSkill:10,
    workshop:'alchemist',
    ingredients:[
      {materialType:'wild-berries',quantity:2},
      {materialType:'wild-herb',quantity:1}
    ],
    xp:24
  },
  'alchemy-mana-draught':{
    id:'alchemy-mana-draught',
    label:'Настой маны',
    kind:'stack',
    resultItemId:'mana-draught',
    resultQuantity:1,
    skillId:'alchemy',
    requiredSkill:20,
    workshop:'alchemist',
    ingredients:[
      {materialType:'wild-herb',quantity:2},
      {materialType:'medicinal-herb',quantity:1}
    ],
    xp:26
  },
  'alchemy-vigor-draught':{
    id:'alchemy-vigor-draught',
    label:'Настой выносливости',
    kind:'stack',
    resultItemId:'vigor-draught',
    resultQuantity:1,
    skillId:'alchemy',
    requiredSkill:20,
    workshop:'alchemist',
    ingredients:[
      {materialType:'turnip',quantity:1},
      {materialType:'wild-berries',quantity:2}
    ],
    xp:26
  },
  'alchemy-medium-injury-medicine':{
    id:'alchemy-medium-injury-medicine',
    label:'Среднее средство от травм',
    kind:'stack',
    resultItemId:'medium-injury-medicine',
    resultQuantity:1,
    skillId:'alchemy',
    requiredSkill:35,
    workshop:'alchemist',
    ingredients:[
      {materialType:'medicinal-herb',quantity:4},
      {materialType:'wild-herb',quantity:2}
    ],
    xp:32
  },
  'alchemy-battle-tonic':{
    id:'alchemy-battle-tonic',
    label:'Боевой тоник',
    kind:'stack',
    resultItemId:'battle-tonic',
    resultQuantity:1,
    skillId:'alchemy',
    requiredSkill:50,
    workshop:'alchemist',
    ingredients:[
      {materialType:'medicinal-herb',quantity:2},
      {materialType:'wheat',quantity:2},
      {materialType:'wild-berries',quantity:2}
    ],
    xp:40
  },
  'alchemy-strong-injury-medicine':{
    id:'alchemy-strong-injury-medicine',
    label:'Сильное средство от травм',
    kind:'stack',
    resultItemId:'strong-injury-medicine',
    resultQuantity:1,
    skillId:'alchemy',
    requiredSkill:70,
    workshop:'alchemist',
    ingredients:[
      {materialType:'medicinal-herb',quantity:1,minClass:2},
      {materialType:'wild-herb',quantity:1,minClass:2},
      {materialType:'flax',quantity:1,minClass:2}
    ],
    xp:55
  }
};

export const starterRecipeIds=Object.keys(craftingRecipes);

export const equipmentPropertyPools:Record<string,EquipmentPropertyRollDefinition[]>={
  mainHand:[
    {id:'precise',label:'Точное',stat:'accuracy',min:0.025,max:0.04},
    {id:'keen',label:'Острое',stat:'damage',min:1.5,max:2.5},
    {id:'balanced',label:'Сбалансированное',stat:'parry',min:0.02,max:0.035}
  ],
  offHand:[
    {id:'guarding',label:'Защитное',stat:'blockChance',min:0.025,max:0.04},
    {id:'reinforced',label:'Укреплённое',stat:'mitigation',min:0.02,max:0.035}
  ],
  body:[
    {id:'supple',label:'Гибкое',stat:'evasion',min:0.025,max:0.04},
    {id:'padded',label:'Плотное',stat:'mitigation',min:0.02,max:0.035}
  ],
  bag:[
    {id:'roomy',label:'Вместительное',stat:'capacity',min:3,max:5},
    {id:'field-ready',label:'Походное',stat:'capacity',min:2,max:4}
  ]
};

export const equipmentUpgradeMaterialType:Record<string,string>={
  'light-armor':'flax',
  'travel-bag':'plant-fiber'
};
