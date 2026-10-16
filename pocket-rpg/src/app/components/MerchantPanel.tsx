import React from 'react';
import {useGame} from '../GameProvider';
import {canPerformAction} from '../game-controller';

const offers=[
  ['healing-potion','Лечебное зелье',10],
  ['weak-injury-medicine','Слабое средство от травм',12],
  ['medium-injury-medicine','Среднее средство от травм',28],
  ['strong-injury-medicine','Сильное средство от травм',60],
  ['iron-ingot','Железный слиток',8],
  ['wood-plank','Деревянная доска',4],
  ['leather','Кожа',6],
  ['recipe-medium-injury-medicine','Рецепт: среднее средство',25],
  ['recipe-strong-injury-medicine','Рецепт: сильное средство',55],
  ['recipe-iron-short-sword','Рецепт: железный короткий меч',45],
  ['recipe-wooden-shield','Рецепт: деревянный щит',35],
  ['recipe-light-armor','Рецепт: лёгкая броня',35]
] as const;

export function MerchantPanel(){
  const{state,commands}=useGame();
  if(state.world.locationId!=='tillanium')return null;
  const locked=!canPerformAction(state.injuries,'merchant',Date.now());
  return <section>
    <h2>Торговец</h2>
    {locked&&<p>Торговля недоступна во время восстановления.</p>}
    <div className="merchant-offers">
      {offers.map(([id,label,price])=>
        <button key={id} disabled={locked} onClick={()=>commands.buy(id,price)}>
          Купить: {label} — {price}
        </button>
      )}
    </div>
    <button disabled={locked} onClick={()=>commands.sell('healing-potion',10)}>
      Продать лечебное зелье
    </button>
  </section>;
}
