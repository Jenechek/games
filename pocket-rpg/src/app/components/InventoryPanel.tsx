import React from 'react';
import {useGame} from '../GameProvider';
import {itemDefs} from '../../content/items';
import {normalizedStackClass} from '../../game-core/items/inventory';

const rarityLabels={
  common:'обычный',
  quality:'качественный',
  rare:'редкий',
  epic:'эпический',
  unique:'уникальный'
} as const;

export function InventoryPanel(){
  const{state}=useGame();
  return <section>
    <h2>Инвентарь</h2>
    {state.inventory.stacks.map((stack,index)=>{
      const itemClass=normalizedStackClass(stack);
      return <div key={`${stack.itemId}-${itemClass}-${index}`}>
        {itemDefs[stack.itemId]?.label??stack.itemId} × {stack.quantity}{itemClass>1?` · класс ${itemClass}`:''}
      </div>;
    })}
    {(state.inventory.equipment??[]).length>0&&<>
      <h3>Экипировка в инвентаре</h3>
      {(state.inventory.equipment??[]).map(instance=><div key={instance.instanceId}>
        {itemDefs[instance.itemId]?.label??instance.itemId} · класс {instance.itemClass} · {rarityLabels[instance.rarity]} · +{instance.upgradeLevel}
        {instance.properties.length>0&&<span> · {instance.properties.map(property=>property.label).join(', ')}</span>}
      </div>)}
    </>}
  </section>;
}
