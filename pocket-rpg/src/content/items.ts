import type { ItemDefinition } from '../game-core/items/items.js';
export const itemDefs:Record<string,ItemDefinition>={
  'iron-short-sword':{id:'iron-short-sword',label:'Железный короткий меч',weight:3,slot:'mainHand',rarity:'common',requirements:{attributes:{strength:12},skills:{'short-sword':1}},stats:{damage:10}},
  'rare-short-sword':{id:'rare-short-sword',label:'Редкий короткий меч',weight:3,slot:'mainHand',rarity:'rare',requirements:{attributes:{strength:20},skills:{'short-sword':20}},stats:{damage:16}},
  'wooden-shield':{id:'wooden-shield',label:'Деревянный щит',weight:4,slot:'offHand',rarity:'common',stats:{mitigation:0.08,blockChance:0.12}},
  'light-armor':{id:'light-armor',label:'Лёгкая броня',weight:5,slot:'body',rarity:'common',stats:{mitigation:0.05,evasion:0.08}},
  'heavy-armor':{id:'heavy-armor',label:'Тяжёлая броня',weight:12,slot:'body',rarity:'common',stats:{mitigation:0.18}},
  'travel-bag':{id:'travel-bag',label:'Походная сумка',weight:1,slot:'bag',rarity:'common',stats:{capacity:20}},
  'healing-potion':{id:'healing-potion',label:'Лечебное зелье',weight:0.3,rarity:'common',stats:{healing:25}},
  'basic-fishing-rod':{id:'basic-fishing-rod',label:'Простая удочка',weight:1.2,rarity:'common',requirements:{skills:{fishing:0}},stats:{fishingSpeed:1,rareChance:0}}
};
