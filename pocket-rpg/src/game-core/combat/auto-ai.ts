import type { SeededRng } from '../rng.js';
import type { ActionSelection, CombatState } from './types.js';
export function chooseAutoAction(state:CombatState,actor:'player'|'enemy',rng:SeededRng):ActionSelection {
  const self=state[actor];
  const style=self.hp/self.maxHp<.35?'defensive':(rng.chance(.35)?'aggressive':'balanced');
  // Named enemies use a deterministic, limited spell cadence, not free extra actions.
  if(actor==='enemy'&&state.round%3===0){
    if(self.id==='bandit'&&self.mana>=20)
      return {style,main:{type:'magic',manaCost:20,skillPath:[],effect:{kind:'damage',damageType:'arcane',amount:12}}};
    if(self.id==='old-treant'&&self.mana>=30)
      return {style,main:{type:'magic',manaCost:30,skillPath:[],effect:{kind:'damage',damageType:'frost',amount:15}}};
  }
  return {style,main:{type:'attack'}};
}
