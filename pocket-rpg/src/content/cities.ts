import type { WorkshopKind } from '../game-core/crafting/types.js';
import type { FactionId } from '../game-core/diplomacy/types.js';

export interface CityDefinition {
  id:string;
  label:string;
  merchantId:string;
  workshops:WorkshopKind[];
  factionId:FactionId|null;
  specialization:string;
}

export const cities:Record<string,CityDefinition>={
  tillanium:{
    id:'tillanium',
    label:'Тилланиум',
    merchantId:'tillanium-general',
    workshops:['tailor','alchemist'],
    factionId:null,
    specialization:'Нейтральный торговый центр'
  },
  karnholm:{
    id:'karnholm',
    label:'Карнхольм',
    merchantId:'karnholm-quartermaster',
    workshops:['tailor'],
    factionId:'karnholm',
    specialization:'Военный город: железо и тяжёлая экипировка'
  },
  ellaria:{
    id:'ellaria',
    label:'Эллария',
    merchantId:'ellaria-apothecary',
    workshops:['alchemist'],
    factionId:'ellaria',
    specialization:'Магический центр: алхимия и редкие реагенты'
  },
  rivermark:{
    id:'rivermark',
    label:'Ривермарк',
    merchantId:'rivermark-market',
    workshops:[],
    factionId:'rivermark',
    specialization:'Речной город: рыба и снасти'
  },
  greenwald:{
    id:'greenwald',
    label:'Гринвальд',
    merchantId:'greenwald-market',
    workshops:['tailor'],
    factionId:'greenwald',
    specialization:'Сельскохозяйственный регион: растения и сырьё'
  }
};
