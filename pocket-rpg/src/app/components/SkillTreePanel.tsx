import React from 'react';
import {skills} from '../../content/skills';
import {useGame} from '../GameProvider';
import {
  SKILL_BONUS_PER_LEVEL,
  SIBLING_SPILLOVER_RATIO,
  SKILL_UNLOCK_THRESHOLDS
} from '../../game-core/progression/skill-tree';
import {PERSISTED_SKILL_IDS} from '../../game-core/progression/skill-progress';
import type {SkillProgressionState} from '../../game-core/progression/skill-progress';

function NodeList({
  parentId,
  progression
}:{
  parentId:string|null;
  progression:SkillProgressionState;
}){
  const nodes=skills.filter(node=>node.parentId===parentId);
  if(nodes.length===0)return null;

  return <ul>
    {nodes.map(node=>{
      const tracked=(PERSISTED_SKILL_IDS as readonly string[]).includes(node.id);
      const state=tracked
        ?progression[node.id as keyof typeof progression]
        :null;
      return <li key={node.id}>
        <span>
          {node.label}
          {state&&<> — ур. {state.level}, XP {state.xp.toFixed(1)}</>}
        </span>
        <NodeList parentId={node.id} progression={progression}/>
      </li>;
    })}
  </ul>;
}

export function SkillTreePanel(){
  const{state}=useGame();
  return <section>
    <h2>Навыки</h2>
    <p>Полное дерево текущего игрового контента видно с начала игры.</p>
    <p>
      Основной бонус: {(SKILL_BONUS_PER_LEVEL*100).toFixed(1)}% за уровень,
      максимум 20%. Прямой сосед получает {(SIBLING_SPILLOVER_RATIO*100).toFixed(0)}% основного бонуса.
    </p>
    <p>
      Пороги фиксированных открытий: {SKILL_UNLOCK_THRESHOLDS.join(' / ')}.
    </p>
    <p>
      Применимые бонусы предков и потомков складываются мультипликативно.
      Неудачное действие даёт 25% обычного XP.
    </p>
    <NodeList parentId={null} progression={state.skillProgression}/>
  </section>;
}
