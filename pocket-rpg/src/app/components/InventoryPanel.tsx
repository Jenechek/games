import React from 'react';
import {useGame} from '../GameProvider';
import {itemDefs} from '../../content/items';
import {normalizedStackClass} from '../../game-core/items/inventory';
import {
  EQUIPMENT_SLOTS,
  canEquip,
  type EquipmentSlot
} from '../../game-core/items/equipment';

const rarityLabels={
  common:'обычный',
  quality:'качественный',
  rare:'редкий',
  epic:'эпический',
  unique:'уникальный'
} as const;

const slotLabels:Record<EquipmentSlot,string>={
  mainHand:'Основная рука',
  offHand:'Вторая рука',
  body:'Броня',
  bag:'Сумка'
};

export function InventoryPanel(){
  const{state,commands}=useGame();
  const skills=Object.fromEntries(
    Object.entries(state.skillProgression).map(([id,skill])=>[id,skill.level])
  );
  const equippedIds=new Set(
    EQUIPMENT_SLOTS
      .map(slot=>state.equipmentLoadout[slot])
      .filter((id):id is string=>Boolean(id))
  );

  return <section>
    <h2>Инвентарь</h2>
    <h3>Надето</h3>
    {EQUIPMENT_SLOTS.map(slot=>{
      const instanceId=state.equipmentLoadout[slot];
      const instance=(state.inventory.equipment??[]).find(
        entry=>entry.instanceId===instanceId
      );
      return <div key={slot}>
        <strong>{slotLabels[slot]}:</strong>{' '}
        {instance
          ?itemDefs[instance.itemId]?.label??instance.itemId
          :'пусто'}
        {instance&&<button
          disabled={Boolean(state.combat)}
          onClick={()=>commands.unequipEquipment(slot)}
        >
          Снять
        </button>}
      </div>;
    })}

    {state.inventory.stacks.map((stack,index)=>{
      const itemClass=normalizedStackClass(stack);
      return <div key={`${stack.itemId}-${itemClass}-${index}`}>
        {itemDefs[stack.itemId]?.label??stack.itemId} × {stack.quantity}{itemClass>1?` · класс ${itemClass}`:''}
      </div>;
    })}

    {(state.inventory.equipment??[]).length>0&&<>
      <h3>Экипировка в инвентаре</h3>
      {(state.inventory.equipment??[]).map(instance=>{
        const def=itemDefs[instance.itemId];
        const equipped=equippedIds.has(instance.instanceId);
        const requirement=def
          ?canEquip({attributes:state.attributes,skills},def)
          :{ok:false,reasons:['unknown']};
        return <div key={instance.instanceId}>
          {def?.label??instance.itemId} · класс {instance.itemClass} · {rarityLabels[instance.rarity]} · +{instance.upgradeLevel}
          {instance.properties.length>0&&<span> · {instance.properties.map(property=>property.label).join(', ')}</span>}
          {equipped
            ?<span> · надето</span>
            :<button
              disabled={Boolean(state.combat)||!requirement.ok}
              onClick={()=>commands.equipEquipment(instance.instanceId)}
            >
              Экипировать
            </button>}
          {!equipped&&!requirement.ok&&<span> · требования не выполнены</span>}
        </div>;
      })}
    </>}
  </section>;
}
