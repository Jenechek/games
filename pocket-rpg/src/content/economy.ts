import type { MarketEventDefinition } from '../game-core/economy/types.js';

export const MARKET_EVENT_WINDOW_MS=6*60*60*1000;

export const basePrices:Record<string,number>={
  'healing-potion':10,
  'focus-tonic':18,
  'mana-draught':20,
  'vigor-draught':20,
  'battle-tonic':35,
  'weak-injury-medicine':12,
  'medium-injury-medicine':28,
  'strong-injury-medicine':60,
  'iron-short-sword':45,
  'wooden-shield':32,
  'light-armor':60,
  'heavy-armor':90,
  'travel-bag':50,
  'basic-fishing-rod':20,
  worms:1,
  spinner:15,
  'wheat':4,
  'wheat-rare':8,
  'turnip':5,
  'turnip-rare':10,
  'flax':6,
  'flax-rare':12,
  'wild-herb':4,
  'wild-herb-rare':8,
  'medicinal-herb':7,
  'medicinal-herb-rare':14,
  'wild-berries':4,
  'wild-berries-rare':8,
  'plant-fiber':5,
  'plant-fiber-rare':10,
  roach:5,
  perch:7,
  carp:11,
  pike:18,
  'silver-eel':36,
  'iron-ingot':18,
  'arcane-ink':22,
  'dried-fish':14,
  'grain-sack':12
};

export const cityPriceMultipliers:Record<string,Record<string,number>>={
  tillanium:{},
  karnholm:{
    'iron-ingot':0.65,
    'iron-short-sword':0.80,
    'heavy-armor':0.80,
    'battle-tonic':0.92,
    'medicinal-herb':1.35,
    'medicinal-herb-rare':1.35,
    'grain-sack':1.20,
    'wheat':1.15,
    'dried-fish':1.10
  },
  ellaria:{
    'arcane-ink':0.65,
    'focus-tonic':0.80,
    'mana-draught':0.80,
    'healing-potion':0.90,
    'medicinal-herb':0.85,
    'medicinal-herb-rare':0.85,
    'iron-ingot':1.20,
    'iron-short-sword':1.20,
    'heavy-armor':1.15,
    'grain-sack':1.10
  },
  rivermark:{
    'dried-fish':0.65,
    roach:0.75,
    perch:0.75,
    carp:0.78,
    pike:0.82,
    'silver-eel':0.90,
    'basic-fishing-rod':0.85,
    'grain-sack':1.15,
    'iron-ingot':1.15,
    'medicinal-herb':1.10
  },
  greenwald:{
    'grain-sack':0.65,
    wheat:0.72,
    'wheat-rare':0.72,
    turnip:0.75,
    'turnip-rare':0.75,
    flax:0.75,
    'flax-rare':0.75,
    'plant-fiber':0.80,
    'plant-fiber-rare':0.80,
    'medicinal-herb':0.90,
    'medicinal-herb-rare':0.90,
    'iron-ingot':1.25,
    'arcane-ink':1.15,
    'dried-fish':1.15
  }
};

export const marketEvents:MarketEventDefinition[]=[
  {
    id:'tillanium-caravan-fair',
    label:'Караванная ярмарка',
    cityId:'tillanium',
    phase:0,
    multipliers:{
      'iron-ingot':0.92,
      'arcane-ink':0.92,
      'dried-fish':0.92,
      'grain-sack':0.92
    }
  },
  {
    id:'karnholm-war-demand',
    label:'Военные заказы',
    cityId:'karnholm',
    phase:1,
    multipliers:{
      'iron-ingot':1.25,
      'iron-short-sword':1.25,
      'heavy-armor':1.25
    }
  },
  {
    id:'ellaria-symposium',
    label:'Магический симпозиум',
    cityId:'ellaria',
    phase:2,
    multipliers:{
      'arcane-ink':1.20,
      'focus-tonic':1.15,
      'mana-draught':1.15,
      'medicinal-herb':1.10,
      'medicinal-herb-rare':1.10
    }
  },
  {
    id:'rivermark-poor-catch',
    label:'Плохой улов',
    cityId:'rivermark',
    phase:3,
    multipliers:{
      'dried-fish':1.30,
      roach:1.30,
      perch:1.30,
      carp:1.30,
      pike:1.30,
      'silver-eel':1.30
    }
  },
  {
    id:'greenwald-rich-harvest',
    label:'Богатый урожай',
    cityId:'greenwald',
    phase:0,
    multipliers:{
      'grain-sack':0.85,
      wheat:0.85,
      'wheat-rare':0.85,
      turnip:0.85,
      'turnip-rare':0.85,
      flax:0.85,
      'flax-rare':0.85
    }
  }
];

export function cityPriceMultiplier(cityId:string,itemId:string):number{
  return cityPriceMultipliers[cityId]?.[itemId]??1;
}

export function activeMarketEvent(cityId:string,now:number):MarketEventDefinition|null{
  const phase=Math.floor(Math.max(0,now)/MARKET_EVENT_WINDOW_MS)%4;
  return marketEvents.find(event=>event.cityId===cityId&&event.phase===phase)??null;
}

export function eventPriceMultiplier(cityId:string,itemId:string,now:number):number{
  return activeMarketEvent(cityId,now)?.multipliers[itemId]??1;
}
