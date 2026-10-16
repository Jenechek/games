import React,{useMemo,useState} from 'react';
import {useGame} from '../GameProvider';
import {cities} from '../../content/cities';
import type {AttributeId} from '../../game-core/types';
import {
  ATTRIBUTE_IDS,
  RETRAINING_DURATION_MS,
  UNIVERSITY_UNLOCK_LEVEL,
  retrainingPreview
} from '../../game-core/university/retraining';

const labels:Record<AttributeId,string>={
  strength:'Сила',
  agility:'Ловкость',
  intuition:'Интуиция',
  vitality:'Живучесть',
  wisdom:'Мудрость',
  luck:'Удача',
  charisma:'Харизма',
  intelligence:'Интеллект'
};

function remaining(until:number,now:number):string{
  const ms=Math.max(0,until-now);
  const minutes=Math.ceil(ms/60000);
  if(minutes<=0)return 'завершено';
  return minutes>=60
    ? `${Math.floor(minutes/60)} ч. ${minutes%60} мин.`
    : `${minutes} мин.`;
}

export function UniversityPanel(){
  const{state,commands}=useGame();
  const city=cities[state.world.locationId];
  if(!city?.university)return null;

  const[from,setFrom]=useState<AttributeId>('strength');
  const[to,setTo]=useState<AttributeId>('agility');
  const[percent,setPercent]=useState(50);
  const pending=state.university.pending;
  const now=Date.now();

  const preview=useMemo(()=>retrainingPreview({
    attributes:state.attributes,
    level:state.level,
    from,
    percent
  }),[state.attributes,state.level,from,percent]);

  return <section>
    <h2>{city.university.label}</h2>
    <p>{city.university.retrainerLabel}</p>
    <p>
      Переобучение открывается с уровня {UNIVERSITY_UNLOCK_LEVEL}.
      Один перенос длится {RETRAINING_DURATION_MS/(60*60*1000)} реальный час.
    </p>

    {state.level<UNIVERSITY_UNLOCK_LEVEL&&
      <p>Сейчас недоступно: уровень персонажа {state.level}.</p>}

    {pending?<>
      <h3>Переобучение идёт</h3>
      <p>
        {labels[pending.from]} → {labels[pending.to]}:
        {' '}{pending.amount.toFixed(2)} очка.
        Осталось: {remaining(pending.completesAt,now)}.
      </p>
      <p>Переобучение завершится автоматически, в том числе после закрытия игры.</p>
    </>:<>
      <label>
        Откуда:
        <select value={from} onChange={event=>setFrom(event.target.value as AttributeId)}>
          {ATTRIBUTE_IDS.map(id=><option key={id} value={id}>{labels[id]}</option>)}
        </select>
      </label>
      <label>
        Куда:
        <select value={to} onChange={event=>setTo(event.target.value as AttributeId)}>
          {ATTRIBUTE_IDS.map(id=><option key={id} value={id}>{labels[id]}</option>)}
        </select>
      </label>
      <label>
        Доля доступной части:
        <select value={percent} onChange={event=>setPercent(Number(event.target.value))}>
          {[25,50,75,100].map(value=><option key={value} value={value}>{value}%</option>)}
        </select>
      </label>

      <p>
        Специализация в доноре: {preview.donorSpecialization.toFixed(2)}.
        Доступно к переносу после защиты 20% и общего порога 5%:
        {' '}{preview.transferable.toFixed(2)}.
      </p>
      <p>Будет перенесено: {preview.amount.toFixed(2)}.</p>
      <button
        disabled={
          state.level<UNIVERSITY_UNLOCK_LEVEL
          ||from===to
          ||preview.amount<=0
          ||Boolean(state.combat)
        }
        onClick={()=>commands.startAttributeRetraining(from,to,percent)}
      >
        Начать переобучение
      </button>
    </>}
  </section>;
}
