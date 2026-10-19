import React,{useState} from 'react';
import {useGame} from '../GameProvider';
import {locations} from '../../content/locations';
import {
  gatheringLocationView
} from '../../game-core/peaceful/gathering/gathering';
import type {GatheringFocus} from '../../game-core/peaceful/gathering/types';
import {
  currentLoadRatio,
  gatheringStartReason
} from '../game-controller';

const focusLabels:Record<GatheringFocus,string>={
  balanced:'Без фокуса',
  herbs:'Травы',
  berries:'Ягоды',
  fiber:'Волокно'
};

const reasonLabels={
  combat:'Сбор недоступен во время боя.',
  farming:'Сначала остановите работу на поле.',
  overload:'Сбор недоступен при перегрузе 120% и выше.',
  recovery:'Сбор недоступен во время восстановления.'
} as const;

export function GatheringPanel(){
  const {state,commands}=useGame();
  const location=locations[state.world.locationId];
  const gatheringSkill=state.skillProgression.gathering;
  const [focus,setFocus]=useState<GatheringFocus>('balanced');

  if(!location?.gathering)return null;

  const now=Date.now();
  const view=gatheringLocationView(state.world.locationId,state.gathering);
  const loadRatio=currentLoadRatio(state.inventory,state.attributes);
  const reason=gatheringStartReason(
    state.injuries,
    Boolean(state.combat),
    Boolean(state.farmingWork),
    loadRatio,
    now
  );
  const active=state.gatheringSession;
  const activeFocus=active?.focus??focus;
  const remaining=active?Math.max(0,Math.ceil((active.nextAt-now)/1000)):0;

  return <section className="gathering-panel">
    <h2>Сбор ресурсов</h2>
    <p>
      Навык: {gatheringSkill.level} · XP: {gatheringSkill.xp.toFixed(1)}
      {' · '}Нагрузка: {(loadRatio*100).toFixed(0)}%
    </p>

    <div className="gathering-knowledge">
      <strong>Что можно найти:</strong>
      <ul>
        {view.hints.map(hint=><li key={hint}>{hint}</li>)}
      </ul>
      {view.discovered.length>0
        ? <p>Изучено: {view.discovered.map(item=>item.label).join(', ')}</p>
        : <p>Точные ресурсы пока не изучены.</p>}
    </div>

    <div className="gathering-controls">
      <label>
        Фокус:
        <select
          value={activeFocus}
          disabled={Boolean(active)}
          onChange={event=>setFocus(event.target.value as GatheringFocus)}
        >
          {(Object.keys(focusLabels) as GatheringFocus[]).map(value=>
            <option key={value} value={value}>{focusLabels[value]}</option>
          )}
        </select>
      </label>

      {active
        ? <>
            <span>Следующий цикл: {remaining} сек.</span>
            <button onClick={commands.stopGatheringCmd}>Остановить сбор</button>
          </>
        : <button
            disabled={reason!==null}
            onClick={()=>commands.startGatheringCmd(focus)}
          >
            Начать сбор
          </button>}
    </div>

    {!active&&reason&&<p className="activity-warning">{reasonLabels[reason]}</p>}
  </section>;
}
