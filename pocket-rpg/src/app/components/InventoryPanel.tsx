import React from 'react';
import {useGame} from '../GameProvider';
import {itemDefs} from '../../content/items';

export function InventoryPanel(){
  const{state}=useGame();
  return <section>
    <h2>Инвентарь</h2>
    {state.inventory.stacks.map(stack=>
      <div key={stack.itemId}>
        {itemDefs[stack.itemId]?.label??stack.itemId} × {stack.quantity}
      </div>
    )}
    {(state.inventory.instances??[]).map(instance=>
      <div key={instance.instanceId}>
        {itemDefs[instance.baseItemId]?.label??instance.baseItemId}
        {' · '}{instance.rarity} · +{instance.upgradeLevel}
      </div>
    )}
  </section>;
}
