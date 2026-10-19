import { addSkillXp,skillDepthMultiplier,type SkillState } from './skills.js';

export const SKILL_TREE_MAX_LEVELS=4;
export const SKILL_TREE_MAX_CHILDREN=8;
export const SKILL_BONUS_PER_LEVEL=0.002;
export const SIBLING_SPILLOVER_RATIO=0.10;
export const FAILED_ACTION_XP_RATIO=0.25;
export const ACTION_XP_BASE=20;
export const SKILL_UNLOCK_THRESHOLDS=[10,20,35,50,70,85,100] as const;

export interface SkillNodeDefinition {
  id:string;
  parentId:string|null;
  depth:number;
  label:string;
}

export interface SkillAbilityDefinition {
  id:string;
  label:string;
  skillId:string;
  unlockLevel:typeof SKILL_UNLOCK_THRESHOLDS[number];
}

export interface WeightedSkillUse {
  skillId:string;
  weight:number;
}

export interface SkillTreeValidation {
  ok:boolean;
  errors:string[];
}

export function validateSkillTree(
  nodes:readonly SkillNodeDefinition[]
):SkillTreeValidation{
  const errors:string[]=[];
  const byId=new Map<string,SkillNodeDefinition>();
  for(const node of nodes){
    if(byId.has(node.id))errors.push(`duplicate skill id: ${node.id}`);
    byId.set(node.id,node);
    if(!Number.isInteger(node.depth)||node.depth<0||node.depth>=SKILL_TREE_MAX_LEVELS){
      errors.push(`invalid depth for ${node.id}`);
    }
  }

  const childCounts=new Map<string,number>();
  for(const node of nodes){
    if(node.parentId===null){
      if(node.depth!==0)errors.push(`root ${node.id} must have depth 0`);
      continue;
    }
    const parent=byId.get(node.parentId);
    if(!parent){
      errors.push(`missing parent for ${node.id}`);
      continue;
    }
    if(node.depth!==parent.depth+1){
      errors.push(`depth mismatch for ${node.id}`);
    }
    const count=(childCounts.get(parent.id)??0)+1;
    childCounts.set(parent.id,count);
    if(count>SKILL_TREE_MAX_CHILDREN){
      errors.push(`too many children for ${parent.id}`);
    }
  }

  for(const node of nodes){
    const seen=new Set<string>();
    let current:SkillNodeDefinition|undefined=node;
    while(current?.parentId){
      if(seen.has(current.id)){
        errors.push(`cycle at ${node.id}`);
        break;
      }
      seen.add(current.id);
      current=byId.get(current.parentId);
    }
  }

  return {ok:errors.length===0,errors};
}

export function validateSkillAbilities(
  nodes:readonly SkillNodeDefinition[],
  abilities:readonly SkillAbilityDefinition[]
):SkillTreeValidation{
  const errors:string[]=[];
  const nodeIds=new Set(nodes.map(node=>node.id));
  const abilityIds=new Set<string>();
  for(const ability of abilities){
    if(abilityIds.has(ability.id))errors.push(`duplicate ability id: ${ability.id}`);
    abilityIds.add(ability.id);
    if(!nodeIds.has(ability.skillId))errors.push(`missing skill for ability ${ability.id}`);
    if(!(SKILL_UNLOCK_THRESHOLDS as readonly number[]).includes(ability.unlockLevel)){
      errors.push(`invalid unlock level for ability ${ability.id}`);
    }
  }
  return {ok:errors.length===0,errors};
}

export function actionXp(success:boolean,base=ACTION_XP_BASE):number{
  const normalized=Math.max(0,base);
  return success?normalized:normalized*FAILED_ACTION_XP_RATIO;
}

export function weightedSkillXp(
  baseXp:number,
  node:SkillNodeDefinition,
  weight:number
):number{
  if(weight<0.5||weight>1)throw new Error('skill weight must be between 0.5 and 1');
  return Math.max(0,baseXp)*weight*skillDepthMultiplier(node.depth);
}

export function applyWeightedSkillUse(
  states:Record<string,SkillState>,
  nodes:readonly SkillNodeDefinition[],
  uses:readonly WeightedSkillUse[],
  baseXp:number
):Record<string,SkillState>{
  const byId=new Map(nodes.map(node=>[node.id,node]));
  const next={...states};
  for(const use of uses){
    const node=byId.get(use.skillId);
    if(!node)throw new Error(`unknown skill: ${use.skillId}`);
    const current=next[use.skillId]??{level:0,xp:0};
    next[use.skillId]=addSkillXp(
      current,
      weightedSkillXp(baseXp,node,use.weight)
    );
  }
  return next;
}

export function skillPrimaryBonus(level:number):number{
  return Math.max(0,Math.min(100,level))*SKILL_BONUS_PER_LEVEL;
}

export function siblingSpilloverBonus(sourceLevel:number):number{
  return skillPrimaryBonus(sourceLevel)*SIBLING_SPILLOVER_RATIO;
}

export function multiplicativeSkillMultiplier(
  bonuses:readonly number[]
):number{
  return bonuses.reduce(
    (multiplier,bonus)=>multiplier*(1+Math.max(0,bonus)),
    1
  );
}

export function unlockedThresholds(level:number):number[]{
  const normalized=Math.max(0,Math.min(100,level));
  return SKILL_UNLOCK_THRESHOLDS.filter(threshold=>normalized>=threshold);
}

export function isAbilityUnlocked(
  ability:SkillAbilityDefinition,
  states:Record<string,SkillState>
):boolean{
  return (states[ability.skillId]?.level??0)>=ability.unlockLevel;
}

export function visibleSkillNodes(
  nodes:readonly SkillNodeDefinition[]
):SkillNodeDefinition[]{
  return nodes.map(node=>({...node}));
}

export function addAbilityXp(
  state:SkillState,
  amount:number
):SkillState{
  return addSkillXp(state,amount);
}

export function availableAbilities(
  abilities:readonly SkillAbilityDefinition[],
  states:Record<string,SkillState>
):SkillAbilityDefinition[]{
  return abilities
    .filter(ability=>isAbilityUnlocked(ability,states))
    .map(ability=>({...ability}));
}
