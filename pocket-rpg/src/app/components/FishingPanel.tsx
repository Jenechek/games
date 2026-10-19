import React from 'react';
import {useGame} from '../GameProvider';
import {locations} from '../../content/locations';
import {canStartFishingAction,currentLoadRatio} from '../game-controller';

export function FishingPanel(){
  const{state,commands}=useGame();
  if(!locations[state.world.locationId]?.fishing)return null;
  const ratio=currentLoadRatio(state.inventory,state.attributes);
  const locked=!canStartFishingAction(
    state.injuries,
    Boolean(state.combat),
    Boolean(state.farmingWork),
    ratio,
    Date.now()
  );
  return <section>
    <h2>Рыбалка</h2>
    <p>Навык: {state.skillProgression.fishing.level} · XP: {state.skillProgression.fishing.xp.toFixed(1)}</p>
    <button disabled={!state.fishing&&locked} onClick={state.fishing?commands.stopFishingCmd:commands.startFishingCmd}>
      {state.fishing?'Остановить':'Начать рыбалку'}
    </button>
    {locked&&!state.fishing&&<p>Рыбалка сейчас недоступна: проверьте бой, восстановление, работу на поле или перегруз.</p>}
  </section>;
}
