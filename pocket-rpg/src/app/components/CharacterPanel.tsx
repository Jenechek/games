import React from 'react';
import {useGame} from '../GameProvider';
import {characterXpRequired} from '../../game-core/progression/character';

const labels:any={
  strength:'Сила',
  agility:'Ловкость',
  intuition:'Интуиция',
  vitality:'Живучесть',
  wisdom:'Мудрость',
  luck:'Удача',
  charisma:'Харизма',
  intelligence:'Интеллект'
};

export function CharacterPanel(){
  const{state}=useGame();
  const required=characterXpRequired(state.level);
  const profileTotal=Object.values(state.attributeXp).reduce((sum,value)=>sum+value,0);
  const influences=Object.entries(state.attributeXp)
    .filter(([,value])=>value>0)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,3);

  return <section>
    <h2>Персонаж</h2>
    <p>
      Уровень: {state.level} · XP: {state.xp.toFixed(0)} / {required.toFixed(0)}
    </p>
    <div className="grid">
      {Object.entries(state.attributes).map(([key,value])=>
        <span key={key}>{labels[key]}: {Number(value).toFixed(2).replace(/\.00$/,'')}</span>
      )}
    </div>
    {profileTotal>0&&<p>
      Текущий профиль уровня:{' '}
      {influences.map(([key,value])=>
        `${labels[key]} ${Math.round(value/profileTotal*100)}%`
      ).join(' · ')}
    </p>}
    <p>Золото: {state.gold.toFixed(0)}</p>
  </section>;
}
