import type { FactionDefinition,FactionId } from '../game-core/diplomacy/types.js';

export const factions:Record<FactionId,FactionDefinition>={
  karnholm:{
    id:'karnholm',
    label:'Военный совет Карнхольма',
    cityId:'karnholm',
    description:'Ценит надёжность снабжения, дисциплину и практические договорённости.',
    requests:[
      {itemId:'grain-sack',quantity:2},
      {itemId:'healing-potion',quantity:2},
      {itemId:'medicinal-herb',quantity:3}
    ],
    honoredUnlockItemId:'rare-short-sword'
  },
  ellaria:{
    id:'ellaria',
    label:'Арканный синод Элларии',
    cityId:'ellaria',
    description:'Ценит знания, редкие материалы и аккуратное разрешение споров.',
    requests:[
      {itemId:'iron-ingot',quantity:1},
      {itemId:'flax',quantity:3},
      {itemId:'wild-berries',quantity:4}
    ],
    honoredUnlockItemId:'battle-tonic'
  },
  rivermark:{
    id:'rivermark',
    label:'Речная гильдия Ривермарка',
    cityId:'rivermark',
    description:'Ценит стабильную торговлю, снабжение и практическую взаимопомощь.',
    requests:[
      {itemId:'grain-sack',quantity:2},
      {itemId:'plant-fiber',quantity:4},
      {itemId:'healing-potion',quantity:2}
    ],
    honoredUnlockItemId:'spinner'
  },
  greenwald:{
    id:'greenwald',
    label:'Союз общин Гринвальда',
    cityId:'greenwald',
    description:'Ценит взаимную помощь, поставки дефицитных товаров и мирные решения.',
    requests:[
      {itemId:'iron-ingot',quantity:1},
      {itemId:'dried-fish',quantity:2},
      {itemId:'healing-potion',quantity:2}
    ],
    honoredUnlockItemId:'flax-rare'
  }
};

export const factionIds=Object.keys(factions) as FactionId[];
