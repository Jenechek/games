import React from 'react';
import {useGame} from '../GameProvider';
import {canPerformAction} from '../game-controller';
import {cities} from '../../content/cities';
import {merchants} from '../../content/merchants';
import {basePrices} from '../../content/economy';
import {itemDefs} from '../../content/items';
import {normalizedStackClass} from '../../game-core/items/inventory';
import {
  currentMarketEvent,
  equipmentSellQuote,
  stackBuyQuote,
  stackSellQuote
} from '../market-controller';

function money(value:number):string{
  return value.toFixed(2);
}

export function MerchantPanel(){
  const{state,commands}=useGame();
  const city=cities[state.world.locationId];
  if(!city)return null;

  const merchant=merchants[city.merchantId];
  if(!merchant)return null;

  const now=Date.now();
  const locked=Boolean(state.combat)||!canPerformAction(state.injuries,'merchant',now);
  const event=currentMarketEvent(city.id,now);
  const relation=city.factionId?state.economy.factionRelations[city.factionId]??0:0;

  return <section>
    <h2>{merchant.label}</h2>
    <p>{city.specialization}</p>
    <p>Торговля: {state.economy.trading.level} · Отношения: {relation.toFixed(0)}</p>
    {event&&<p>Рыночное событие: <strong>{event.label}</strong></p>}
    {locked&&<p>Торговля сейчас недоступна.</p>}

    <h3>Купить</h3>
    {merchant.items.map(itemId=>{
      const def=itemDefs[itemId];
      if(!def||!basePrices[itemId])return null;
      const itemClass=def.materialClass??1;
      let one=0;
      let five=0;
      try{
        one=stackBuyQuote(state.economy,city.id,itemId,itemClass,1,now,state.attributes.charisma).total;
        if(!def.slot){
          five=stackBuyQuote(state.economy,city.id,itemId,itemClass,5,now,state.attributes.charisma).total;
        }
      }catch{return null;}

      return <div key={itemId}>
        <strong>{def.label}</strong> — {money(one)}
        <button disabled={locked||state.gold<one} onClick={()=>commands.buy(itemId,1)}>Купить 1</button>
        {!def.slot&&<button disabled={locked||state.gold<five} onClick={()=>commands.buy(itemId,5)}>
          Купить 5 — {money(five)}
        </button>}
      </div>;
    })}

    <h3>Продать товары</h3>
    {state.inventory.stacks
      .filter(stack=>Boolean(basePrices[stack.itemId]))
      .map((stack,index)=>{
        const itemClass=normalizedStackClass(stack);
        const def=itemDefs[stack.itemId];
        let one=0;
        let all=0;
        try{
          one=stackSellQuote(state.economy,city.id,stack.itemId,itemClass,1,now,state.attributes.charisma).total;
          all=stackSellQuote(state.economy,city.id,stack.itemId,itemClass,stack.quantity,now,state.attributes.charisma).total;
        }catch{return null;}
        return <div key={`${stack.itemId}-${itemClass}-${index}`}>
          <strong>{def?.label??stack.itemId}</strong> ×{stack.quantity}{itemClass>1?` · класс ${itemClass}`:''}
          <button disabled={locked} onClick={()=>commands.sellStack(stack.itemId,itemClass,1)}>Продать 1 — {money(one)}</button>
          {stack.quantity>1&&<button disabled={locked} onClick={()=>commands.sellStack(stack.itemId,itemClass,stack.quantity)}>
            Продать всё — {money(all)}
          </button>}
        </div>;
      })}

    {(state.inventory.equipment??[]).some(instance=>Boolean(basePrices[instance.itemId]))&&<>
      <h3>Продать экипировку</h3>
      {(state.inventory.equipment??[])
        .filter(instance=>Boolean(basePrices[instance.itemId]))
        .map(instance=>{
          let price=0;
          try{
            price=equipmentSellQuote(state.economy,city.id,instance,now,state.attributes.charisma).total;
          }catch{return null;}
          const def=itemDefs[instance.itemId];
          return <div key={instance.instanceId}>
            <strong>{def?.label??instance.itemId}</strong> · класс {instance.itemClass} · +{instance.upgradeLevel}
            <button disabled={locked} onClick={()=>commands.sellEquipment(instance.instanceId)}>Продать — {money(price)}</button>
          </div>;
        })}
    </>}
  </section>;
}
