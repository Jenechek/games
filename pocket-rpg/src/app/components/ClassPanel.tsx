import React from 'react';
import {useGame} from '../GameProvider';
import {playerClasses} from '../../content/classes';
import {summonDefinitions} from '../../content/summons';
import {
  classSummonLimit,
  unlockedSummonIds
} from '../../game-core/classes/classes';
import {skillXpRequired} from '../../game-core/progression/skills';

export function ClassPanel(){
  const{state,commands}=useGame();
  const classId=state.classState.classId;

  if(!classId){
    return <section>
      <h2>Класс</h2>
      <p>Доступны подтверждённые классы. Выбор класса не меняется автоматически.</p>
      {Object.values(playerClasses).map(def=><div key={def.id}>
        <h3>{def.label}</h3>
        <p>{def.description}</p>
        <button
          disabled={Boolean(state.combat)}
          onClick={()=>commands.chooseClass(def.id)}
        >
          Выбрать {def.label}
        </button>
      </div>)}
    </section>;
  }

  const definition=playerClasses[classId];
  const unlocked=new Set(unlockedSummonIds(state.classState,definition));
  const nextXp=state.classState.skill.level>=100
    ?null
    :skillXpRequired(state.classState.skill.level+1);

  return <section>
    <h2>Класс: {definition.label}</h2>
    <p>{definition.description}</p>
    <p>
      Классовый навык: {state.classState.skill.level}
      {nextXp!==null&&<> · XP {state.classState.skill.xp.toFixed(0)} / {nextXp.toFixed(0)}</>}
    </p>
    <p>
      Активные призывы: {state.summons.active.length} / {classSummonLimit(state.classState,playerClasses)}
    </p>
    <h3>Призывы класса</h3>
    {definition.summonUnlocks.map(unlock=>{
      const summon=summonDefinitions[unlock.summonId];
      const available=unlocked.has(unlock.summonId);
      return <div key={unlock.summonId}>
        <span>
          {summon?.label??unlock.summonId}
          {' '}— {available?'открыт':'навык '+unlock.requiredSkillLevel}
        </span>
        <button
          disabled={!available||Boolean(state.combat)}
          onClick={()=>commands.summonClassCreature(unlock.summonId)}
        >
          Призвать
        </button>
      </div>;
    })}
  </section>;
}
