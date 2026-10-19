import React from 'react';
import {useGame} from '../GameProvider';

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
  return <section>
    <h2>Персонаж</h2>
    <p>Уровень: {state.level} · XP: {state.xp.toFixed(0)}</p>
    <div className="grid">
      {Object.entries(state.attributes).map(([key,value])=>
        <span key={key}>{labels[key]}: {Number(value).toFixed(2).replace(/\.00$/,'')}</span>
      )}
    </div>
    <p>Золото: {state.gold.toFixed(0)}</p>
  </section>;
}
