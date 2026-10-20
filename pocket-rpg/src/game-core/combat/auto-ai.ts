import type { SeededRng } from '../rng.js';
import type { ActionSelection, CombatState } from './types.js';
export function chooseAutoAction(state:CombatState,actor:'player'|'enemy',rng:SeededRng):ActionSelection {
  const self=state[actor];
  const style=self.hp/self.maxHp<.35?'defensive':(rng.chance(.35)?'aggressive':'balanced');
  // Enemy spell attacks require one main action and a predictable three-round cadence.
  // Near defeat, cautious enemies favor ordinary attacks to conserve mana.
  if(actor==='enemy'&&state.round%3===0&&self.hp/self.maxHp>=.2){
    if(self.id==='bandit'&&self.mana>=20)
      return {style,main:{type:'magic',manaCost:20,skillPath:[],effect:{kind:'damage',damageType:'arcane',amount:12}}};
    if(self.id==='old-treant'&&self.mana>=30)
      return {style,main:{type:'magic',manaCost:30,skillPath:[],effect:{kind:'damage',damageType:'frost',amount:15}}};
  }
  return {style,main:{type:'attack'}};
}
