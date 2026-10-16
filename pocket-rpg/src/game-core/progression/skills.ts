export interface SkillState { level:number; xp:number; }
export const SKILL_LEVEL_ONE_XP=250;
export const SKILL_LEVEL_GROWTH=1.15;
export const SKILL_DEPTH_GROWTH=1.65;
export function skillXpRequired(level:number):number { return SKILL_LEVEL_ONE_XP * (SKILL_LEVEL_GROWTH ** (level-1)); }
export function skillDepthMultiplier(depth:number):number { return SKILL_DEPTH_GROWTH ** depth; }
export function addSkillXp(state:SkillState, amount:number):SkillState {
  let level=state.level; let xp=state.xp+Math.max(0,amount);
  while(level<100) { const need=skillXpRequired(level+1); if(xp<need) break; xp-=need; level+=1; }
  if(level>=100) xp=0;
  return {level,xp};
}
