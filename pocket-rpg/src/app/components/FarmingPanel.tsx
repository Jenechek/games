import React from 'react';
import { useGame } from '../GameProvider';
import { locations } from '../../content/locations';
import { cropDefs } from '../../content/farming';
import {
  fieldCellSummary,
  fieldSlotLimit
} from '../../game-core/peaceful/farming/farming';
import { canStartFarmingAction, currentLoadRatio } from '../game-controller';

const workLabels={
  establish:'Подготовка поля',
  plant:'Посадка',
  harvest:'Сбор урожая'
} as const;

export function FarmingPanel(){
  const {state,commands}=useGame();
  const location=locations[state.world.locationId];
  if(!location?.agriculture)return null;

  const now=Date.now();
  const localFields=state.farming.fields.filter(field=>field.locationId===state.world.locationId);
  const slots=fieldSlotLimit(state.farming.skill.level);
  const loadRatio=currentLoadRatio(state.inventory,state.attributes);
  const locked=!canStartFarmingAction(
    state.injuries,
    Boolean(state.combat),
    loadRatio,
    now
  );
  const active=state.farmingWork;
  const remaining=active?Math.max(0,Math.ceil((active.nextAt-now)/1000)):0;

  return <section className="farming-panel">
    <h2>Фермерство</h2>
    <p>
      Навык: {state.farming.skill.level} · XP: {state.farming.skill.xp.toFixed(1)}
      {' · '}Поля: {state.farming.fields.length}/{slots}
    </p>
    <p>{location.agriculture==='safe'?'Безопасные сельскохозяйственные земли.':'Нейтральные земли: во время работы возможны редкие нападения.'}</p>

    {active&&<div className="farm-work">
      <strong>{workLabels[active.type]}</strong>
      <span>Следующий шаг: {remaining} сек.</span>
      <button onClick={commands.stopFarmingCmd}>Остановить работу</button>
    </div>}

    {!active&&state.farming.fields.length<slots&&
      <button disabled={locked} onClick={commands.establishField}>
        Подготовить новое поле — 30 сек.
      </button>}

    {localFields.length===0&&<p>В этой локации у вас пока нет поля.</p>}

    {localFields.map(field=>{
      const summary=fieldCellSummary(field,now);
      const cropId=field.cycleCropId;
      const allowedSeeds=cropId?[cropId]:state.farming.knownSeedIds;
      const fieldBusy=active!==null;

      return <div className="farm-field" key={field.id}>
        <h3>{field.id.replace('field-','Поле ')}</h3>
        <p>
          Пусто: {summary.empty} · Растёт: {summary.growing} · Созрело: {summary.mature}
        </p>
        {cropId&&<p>Текущий цикл: {cropDefs[cropId]?.label ?? cropId}</p>}

        {summary.empty>0&&allowedSeeds.map(seedId=>
          <button
            key={seedId}
            disabled={locked||fieldBusy}
            onClick={()=>commands.plantField(field.id,seedId)}
          >
            Посадить: {cropDefs[seedId]?.label ?? seedId}
          </button>
        )}

        <button
          disabled={locked||fieldBusy||summary.mature===0}
          onClick={()=>commands.harvestField(field.id)}
        >
          Собрать зрелый урожай ({summary.mature})
        </button>

        <button
          className="danger"
          disabled={fieldBusy}
          onClick={()=>commands.abandonField(field.id)}
          title="Поле и все растущие или зрелые культуры будут удалены безвозвратно"
        >
          Забросить поле — все посевы будут потеряны
        </button>
      </div>;
    })}
  </section>;
}
