import type {CraftRecipe} from '../game-core/crafting/types.js';

export const craftRecipes:Record<string,CraftRecipe>={
  'healing-potion':{
    id:'healing-potion',label:'Лечебное зелье',workshop:'alchemy',discipline:'alchemy',
    skillRequired:0,xp:20,
    materials:[{materialType:'wild-herb',quantity:2},{materialType:'wild-berries',quantity:1}],
    output:{kind:'stack',itemId:'healing-potion',quantity:1}
  },
  'weak-injury-medicine':{
    id:'weak-injury-medicine',label:'Слабое средство от травм',workshop:'alchemy',discipline:'alchemy',
    skillRequired:0,xp:24,
    materials:[{materialType:'medicinal-herb',quantity:1},{materialType:'wild-herb',quantity:1}],
    output:{kind:'stack',itemId:'weak-injury-medicine',quantity:1}
  },
  'medium-injury-medicine':{
    id:'medium-injury-medicine',label:'Среднее средство от травм',workshop:'alchemy',discipline:'alchemy',
    skillRequired:20,xp:36,
    materials:[{materialType:'medicinal-herb',quantity:2},{materialType:'wild-berries',quantity:2}],
    output:{kind:'stack',itemId:'medium-injury-medicine',quantity:1}
  },
  'strong-injury-medicine':{
    id:'strong-injury-medicine',label:'Сильное средство от травм',workshop:'alchemy',discipline:'alchemy',
    skillRequired:50,xp:60,
    materials:[
      {materialType:'medicinal-herb',quantity:2,minClass:1},
      {materialType:'wild-berries',quantity:1,minClass:1}
    ],
    output:{kind:'stack',itemId:'strong-injury-medicine',quantity:1}
  },
  'travel-bag':{
    id:'travel-bag',label:'Походная сумка',workshop:'tailor',discipline:'crafting',
    skillRequired:0,xp:25,
    materials:[{materialType:'leather',quantity:2},{materialType:'plant-fiber',quantity:3}],
    output:{kind:'equipment',baseItemId:'travel-bag'}
  },
  'light-armor':{
    id:'light-armor',label:'Лёгкая броня',workshop:'tailor',discipline:'crafting',
    skillRequired:20,xp:40,
    materials:[{materialType:'leather',quantity:3},{materialType:'flax',quantity:2}],
    output:{kind:'equipment',baseItemId:'light-armor'}
  },
  'wooden-shield':{
    id:'wooden-shield',label:'Деревянный щит',workshop:'forge',discipline:'crafting',
    skillRequired:20,xp:40,
    materials:[{materialType:'wood-plank',quantity:4},{materialType:'plant-fiber',quantity:2}],
    output:{kind:'equipment',baseItemId:'wooden-shield'}
  },
  'iron-short-sword':{
    id:'iron-short-sword',label:'Железный короткий меч',workshop:'forge',discipline:'crafting',
    skillRequired:35,xp:55,
    materials:[{materialType:'iron-ingot',quantity:3},{materialType:'wood-plank',quantity:1}],
    output:{kind:'equipment',baseItemId:'iron-short-sword'}
  }
};
