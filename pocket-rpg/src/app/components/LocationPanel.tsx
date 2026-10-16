import React from 'react';
import {useGame} from '../GameProvider';
import {locations} from '../../content/locations';
import {canPerformAction,getRecoveryView} from '../game-controller';

export function LocationPanel(){
  const{state,commands}=useGame();
  const l=locations[state.world.locationId];
  const now=Date.now();
  const recoveryLocked=!canPerformAction(state.injuries,'travel',now);
  const locked=Boolean(state.combat)||recoveryLocked;
  const recovery=getRecoveryView(state.injuries,now);

  return <section>
    <h2>{l.label}</h2>
    {state.world.travel?<p>Переход...</p>:locked?
      <p>{state.combat?'Переходы недоступны во время боя.':recovery.kind==='unconscious'?'Переходы недоступны без сознания.':'Переходы недоступны во время принудительного отдыха.'}</p>:
      <div>{l.neighbors.map(id=><button key={id} onClick={()=>commands.travelTo(id)}>Перейти: {locations[id].label}</button>)}</div>}
    {l.enemies.length>0&&!state.combat&&<button disabled={!canPerformAction(state.injuries,'combat',now)} onClick={commands.startEncounter}>Искать противника</button>}
  </section>;
}
