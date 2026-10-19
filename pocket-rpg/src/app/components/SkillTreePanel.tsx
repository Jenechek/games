import React from 'react';
import {skills} from '../../content/skills';
import {
  SKILL_BONUS_PER_LEVEL,
  SIBLING_SPILLOVER_RATIO,
  SKILL_UNLOCK_THRESHOLDS
} from '../../game-core/progression/skill-tree';

function NodeList({parentId}:{parentId:string|null}){
  const nodes=skills.filter(node=>node.parentId===parentId);
  if(nodes.length===0)return null;

  return <ul>
    {nodes.map(node=><li key={node.id}>
      <span>{node.label}</span>
      <NodeList parentId={node.id}/>
    </li>)}
  </ul>;
}

export function SkillTreePanel(){
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
    <NodeList parentId={null}/>
  </section>;
}
