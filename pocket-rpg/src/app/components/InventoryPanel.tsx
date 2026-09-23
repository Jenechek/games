import React from 'react';import {useGame} from '../GameProvider';
export function InventoryPanel(){const{state}=useGame();return <section><h2>Инвентарь</h2>{state.inventory.stacks.map(x=><div key={x.itemId}>{x.itemId} × {x.quantity}</div>)}</section>}
