import React from 'react';
import {useGame} from '../GameProvider';
import {locations} from '../../content/locations';
import {canPerformAction} from '../game-controller';

export function FishingPanel(){
  const{state,commands}=useGame();
  if(!locations[state.world.locationId]?.fishing)return null;
  const locked=!canPerformAction(state.injuries,'fishing',Date.now());
  return <section>
    <h2>Рыбалка</h2>
    <p>Опыт: {state.fishingXp.toFixed(1)}</p>
    <button disabled={!state.fishing&&locked} onClick={state.fishing?commands.stopFishingCmd:commands.startFishingCmd}>
      {state.fishing?'Остановить':'Начать рыбалку'}
    </button>
    {locked&&!state.fishing&&<p>Рыбалка недоступна во время восстановления.</p>}
  </section>;
}
