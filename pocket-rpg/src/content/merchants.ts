export interface MerchantDefinition {
  id:string;
  label:string;
  items:string[];
}

export const merchants:Record<string,MerchantDefinition>={
  'tillanium-general':{
    id:'tillanium-general',
    label:'Торговец Тилланиума',
    items:[
      'healing-potion',
      'weak-injury-medicine',
      'medium-injury-medicine',
      'strong-injury-medicine',
      'iron-short-sword',
      'wooden-shield',
      'basic-fishing-rod',
      'iron-ingot',
      'arcane-ink',
      'dried-fish',
      'grain-sack'
    ]
  },
  'karnholm-quartermaster':{
    id:'karnholm-quartermaster',
    label:'Интендант Карнхольма',
    items:[
      'iron-ingot',
      'iron-short-sword',
      'heavy-armor',
      'battle-tonic',
      'healing-potion',
      'weak-injury-medicine',
      'medium-injury-medicine',
      'grain-sack'
    ]
  },
  'ellaria-apothecary':{
    id:'ellaria-apothecary',
    label:'Лавка Элларии',
    items:[
      'arcane-ink',
      'focus-tonic',
      'mana-draught',
      'healing-potion',
      'strong-injury-medicine',
      'medicinal-herb',
      'medicinal-herb-rare',
      'iron-ingot'
    ]
  },
  'rivermark-market':{
    id:'rivermark-market',
    label:'Речной рынок Ривермарка',
    items:[
      'dried-fish',
      'roach',
      'perch',
      'carp',
      'pike',
      'silver-eel',
      'basic-fishing-rod',
      'grain-sack',
      'iron-ingot'
    ]
  },
  'greenwald-market':{
    id:'greenwald-market',
    label:'Рынок Гринвальда',
    items:[
      'grain-sack',
      'wheat',
      'turnip',
      'flax',
      'plant-fiber',
      'medicinal-herb',
      'wild-berries',
      'travel-bag',
      'light-armor',
      'iron-ingot',
      'dried-fish'
    ]
  }
};
