import type { GatheringCategory } from '../game-core/peaceful/gathering/types.js';

export interface GatheringResourceDefinition {
  id:string;
  label:string;
  category:GatheringCategory;
  yieldMin:number;
  yieldMax:number;
  xp:number;
  baseRareChance:number;
  unitWeight:number;
}

export interface GatheringPoolEntry {
  resourceId:string;
  weight:number;
}

export const gatheringResourceDefs:Record<string,GatheringResourceDefinition>={
  'wild-herb':{
    id:'wild-herb',label:'Дикорастущие травы',category:'herbs',
    yieldMin:1,yieldMax:3,xp:16,baseRareChance:0.01,unitWeight:0.10
  },
  'medicinal-herb':{
    id:'medicinal-herb',label:'Лечебные травы',category:'herbs',
    yieldMin:1,yieldMax:2,xp:26,baseRareChance:0.02,unitWeight:0.10
  },
  'wild-berries':{
    id:'wild-berries',label:'Дикие ягоды',category:'berries',
    yieldMin:1,yieldMax:3,xp:18,baseRareChance:0.015,unitWeight:0.15
  },
  'plant-fiber':{
    id:'plant-fiber',label:'Растительное волокно',category:'fiber',
    yieldMin:1,yieldMax:3,xp:20,baseRareChance:0.01,unitWeight:0.10
  }
};

export const gatheringPools:Record<string,GatheringPoolEntry[]>={
  'tillanium-fields':[
    {resourceId:'wild-herb',weight:45},
    {resourceId:'plant-fiber',weight:55}
  ],
  meadow:[
    {resourceId:'wild-herb',weight:40},
    {resourceId:'wild-berries',weight:35},
    {resourceId:'plant-fiber',weight:25}
  ],
  'forest-edge':[
    {resourceId:'medicinal-herb',weight:40},
    {resourceId:'wild-berries',weight:35},
    {resourceId:'plant-fiber',weight:25}
  ],
  'dark-forest':[
    {resourceId:'medicinal-herb',weight:55},
    {resourceId:'wild-berries',weight:25},
    {resourceId:'plant-fiber',weight:20}
  ]
};
