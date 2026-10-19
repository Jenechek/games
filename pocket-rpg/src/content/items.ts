import type { ItemDefinition } from '../game-core/items/items.js';
import { cropDefs } from './farming.js';
import { gatheringResourceDefs } from './gathering.js';
import { fishDefs } from './fishing.js';

const cropItemDefs:Record<string,ItemDefinition>={};
for(const crop of Object.values(cropDefs)){
  cropItemDefs[crop.id]={
    id:crop.id,
    label:crop.label,
    weight:crop.unitWeight,
    materialType:crop.id,
    materialClass:1
  };
  cropItemDefs[`${crop.id}-rare`]={
    id:`${crop.id}-rare`,
    label:`${crop.label} (редкий)`,
    weight:crop.unitWeight,
    materialType:crop.id,
    materialClass:2
  };
}

const gatheringItemDefs:Record<string,ItemDefinition>={};
for(const resource of Object.values(gatheringResourceDefs)){
  gatheringItemDefs[resource.id]={
    id:resource.id,
    label:resource.label,
    weight:resource.unitWeight,
    materialType:resource.id,
    materialClass:1
  };
  gatheringItemDefs[`${resource.id}-rare`]={
    id:`${resource.id}-rare`,
    label:`${resource.label} (редкий)`,
    weight:resource.unitWeight,
    materialType:resource.id,
    materialClass:2
  };
}

const fishItemDefs:Record<string,ItemDefinition>={};
for(const fish of Object.values(fishDefs)){
  fishItemDefs[fish.id]={
    id:fish.id,
    label:fish.label,
    weight:fish.weight
  };
}

export const itemDefs:Record<string,ItemDefinition>={
  'iron-short-sword':{id:'iron-short-sword',label:'Железный короткий меч',weight:3,slot:'mainHand',rarity:'common',requirements:{attributes:{strength:12},skills:{'short-sword':0}},stats:{damage:10}},
  'rare-short-sword':{id:'rare-short-sword',label:'Редкий короткий меч',weight:3,slot:'mainHand',rarity:'rare',requirements:{attributes:{strength:20},skills:{'short-sword':20}},stats:{damage:16}},
  'wooden-shield':{id:'wooden-shield',label:'Деревянный щит',weight:4,slot:'offHand',rarity:'common',stats:{mitigation:0.08,blockChance:0.12}},
  'light-armor':{id:'light-armor',label:'Лёгкая броня',weight:5,slot:'body',rarity:'common',stats:{mitigation:0.05,evasion:0.08}},
  'heavy-armor':{id:'heavy-armor',label:'Тяжёлая броня',weight:12,slot:'body',rarity:'common',stats:{mitigation:0.18}},
  'travel-bag':{id:'travel-bag',label:'Походная сумка',weight:1,slot:'bag',rarity:'common',stats:{capacity:20}},
  'healing-potion':{id:'healing-potion',label:'Лечебное зелье',weight:0.3,rarity:'common',stats:{healing:25},combatUse:{kind:'heal',amount:25,toxicity:70}},
  'focus-tonic':{id:'focus-tonic',label:'Настой сосредоточения',weight:0.25,rarity:'common',combatUse:{kind:'effect',effectId:'focus',magnitude:0.08,durationRounds:3,toxicity:60}},
  'mana-draught':{id:'mana-draught',label:'Настой маны',weight:0.25,rarity:'common',combatUse:{kind:'mana',amount:30,toxicity:45}},
  'vigor-draught':{id:'vigor-draught',label:'Настой выносливости',weight:0.25,rarity:'common',combatUse:{kind:'stamina',amount:30,toxicity:45}},
  'battle-tonic':{id:'battle-tonic',label:'Боевой тоник',weight:0.3,rarity:'quality',combatUse:{kind:'effect',effectId:'might',magnitude:0.10,durationRounds:3,toxicity:60}},
  'weak-injury-medicine':{id:'weak-injury-medicine',label:'Слабое средство от травм',weight:0.2,rarity:'common'},
  'medium-injury-medicine':{id:'medium-injury-medicine',label:'Среднее средство от травм',weight:0.3,rarity:'quality'},
  'strong-injury-medicine':{id:'strong-injury-medicine',label:'Сильное средство от травм',weight:0.4,rarity:'rare'},
  'basic-fishing-rod':{id:'basic-fishing-rod',label:'Простая удочка',weight:1.2,rarity:'common',requirements:{skills:{fishing:0}},stats:{fishingSpeed:1,rareChance:0}},
  worms:{id:'worms',label:'Черви',weight:0.1,rarity:'common'},
  spinner:{id:'spinner',label:'Блесна',weight:0.2,rarity:'common'},
  'iron-ingot':{id:'iron-ingot',label:'Железный слиток',weight:2,rarity:'common'},
  'arcane-ink':{id:'arcane-ink',label:'Арканные чернила',weight:0.5,rarity:'common'},
  'dried-fish':{id:'dried-fish',label:'Вяленая рыба',weight:1,rarity:'common'},
  'grain-sack':{id:'grain-sack',label:'Мешок зерна',weight:2,rarity:'common'},
  ...cropItemDefs,
  ...gatheringItemDefs,
  ...fishItemDefs
};
