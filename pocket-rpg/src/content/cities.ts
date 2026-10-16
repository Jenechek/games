import type { WorkshopKind } from '../game-core/crafting/types.js';
import type { FactionId } from '../game-core/diplomacy/types.js';

export interface UniversityDefinition {
  label:string;
  retrainerLabel:string;
}

export interface CityDefinition {
  id:string;
  label:string;
  merchantId:string;
  workshops:WorkshopKind[];
  factionId:FactionId|null;
  specialization:string;
  university?:UniversityDefinition;
}

export const cities:Record<string,CityDefinition>={
  tillanium:{
    id:'tillanium',
    label:'Тилланиум',
    merchantId:'tillanium-general',
    workshops:['tailor','alchemist'],
    factionId:null,
    specialization:'Нейтральный торговый центр',
    university:{label:'Университет Тилланиума',retrainerLabel:'Университетский наставник'}
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
    specialization:'Магический центр: алхимия и редкие реагенты',
    university:{label:'Арканный университет Элларии',retrainerLabel:'Наставник переобучения'}
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
