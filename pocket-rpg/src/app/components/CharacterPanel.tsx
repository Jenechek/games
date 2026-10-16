import React from 'react'; import { useGame } from '../GameProvider';
const labels:any={strength:'Сила',agility:'Ловкость',intuition:'Интуиция',vitality:'Живучесть',wisdom:'Мудрость',luck:'Удача',charisma:'Харизма',intelligence:'Интеллект'};
export function CharacterPanel(){const {state}=useGame();return <section><h2>Персонаж</h2><div className="grid">{Object.entries(state.attributes).map(([k,v])=><span key={k}>{labels[k]}: {v}</span>)}</div><p>Золото: {state.gold.toFixed(0)}</p></section>}
