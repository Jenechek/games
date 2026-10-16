import type { SeededRng } from '../rng.js';
import type { ActionSelection, CombatState } from './types.js';
export function chooseAutoAction(state:CombatState,actor:'player'|'enemy',rng:SeededRng):ActionSelection {
  const self=state[actor];
  const style=self.hp/self.maxHp<.35?'defensive':(rng.chance(.35)?'aggressive':'balanced');
  return {style,main:{type:'attack'}};
}
