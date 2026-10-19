import React from 'react';
import {useGame} from '../GameProvider';
import {summonDefinitions} from '../../content/summons';

export function SummonsPanel(){
  const{state}=useGame();
  if(state.summons.active.length===0)return null;

  return <section>
    <h2>Призывы</h2>
    {state.summons.active.map(instance=>{
      const def=summonDefinitions[instance.definitionId];
      if(!def)return null;
      return <div key={instance.instanceId}>
        <strong>{def.label}</strong>
        <div>
          HP: {Math.ceil(instance.hp)}/{def.maxHp} ·
          Выносливость: {Math.ceil(instance.stamina)}/{def.maxStamina}
        </div>
      </div>;
    })}
  </section>;
}
