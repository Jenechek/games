import React from 'react';
import {useGame} from '../GameProvider';
import {canPerformAction} from '../game-controller';

export function MerchantPanel(){
  const{state,commands}=useGame();
  if(state.world.locationId!=='tillanium')return null;
  const locked=!canPerformAction(state.injuries,'merchant',Date.now());
  return <section>
    <h2>Торговец</h2>
    {locked&&<p>Торговля недоступна во время восстановления.</p>}
    <button disabled={locked} onClick={()=>commands.buy('healing-potion',10)}>Купить лечебное зелье — 10</button>
    <button disabled={locked} onClick={()=>commands.buy('weak-injury-medicine',12)}>Купить слабое средство — 12</button>
    <button disabled={locked} onClick={()=>commands.buy('medium-injury-medicine',28)}>Купить среднее средство — 28</button>
    <button disabled={locked} onClick={()=>commands.buy('strong-injury-medicine',60)}>Купить сильное средство — 60</button>
    <button disabled={locked} onClick={()=>commands.sell('healing-potion',10)}>Продать лечебное зелье</button>
  </section>;
}
