import type { WorkshopKind } from '../game-core/crafting/types.js';

export interface CityDefinition {
  id:string;
  label:string;
  merchantId:string;
  workshops:WorkshopKind[];
}

export const cities:Record<string,CityDefinition>={
  tillanium:{
    id:'tillanium',
    label:'Тилланиум',
    merchantId:'tillanium-general',
    workshops:['tailor','alchemist']
  }
};
