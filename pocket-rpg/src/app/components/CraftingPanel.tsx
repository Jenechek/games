import React from 'react';
import {useGame} from '../GameProvider';
import {locations} from '../../content/locations';
import {craftRecipes} from '../../content/crafting';
import {itemDefs} from '../../content/items';
import {
  craftRarityProbabilities,
  craftReadiness,
  effectiveInstanceStats,
  recipeMaterialSelection,
  upgradeCost
} from '../../game-core/crafting/crafting';
import {
  craftingActionReason,
  currentLoadRatio
} from '../game-controller';

const workshopLabels={
  forge:'Кузница',
  tailor:'Портняжная мастерская',
  alchemy:'Алхимическая лаборатория'
} as const;

const rarityLabels={
  common:'Обычный',
  quality:'Качественный',
  rare:'Редкий',
  epic:'Эпический'
} as const;

const propertyLabels:Record<string,string>={
  keen:'Острый',
  reinforced:'Укреплённый',
  nimble:'Ловкий',
  steadfast:'Стойкий',
  roomy:'Вместительный',
  light:'Лёгкий',
  balanced:'Сбалансированный'
};

function materialCount(
  stacks:{itemId:string;quantity:number}[],
  materialType:string,
  minClass=0
){
  return stacks.reduce((sum,stack)=>{
    const rare=stack.itemId.endsWith('-rare');
    const base=rare?stack.itemId.slice(0,-5):stack.itemId;
    if(base!==materialType)return sum;
    if((rare?1:0)<minClass)return sum;
    return sum+stack.quantity;
  },0);
}

export function CraftingPanel(){
  const {state,commands}=useGame();
  const location=locations[state.world.locationId];
  const workshops=location?.workshops;
  if(!workshops?.length)return null;

  const now=Date.now();
  const loadRatio=currentLoadRatio(state.inventory,state.attributes);
  const known=state.crafting.knownRecipeIds
    .map(id=>craftRecipes[id])
    .filter(Boolean);

  const scrolls=state.inventory.stacks
    .filter(stack=>stack.itemId.startsWith('recipe-')&&stack.quantity>0)
    .map(stack=>({
      stack,
      recipeId:stack.itemId.slice('recipe-'.length)
    }))
    .filter(entry=>Boolean(craftRecipes[entry.recipeId]));

  return <section className="crafting-panel">
    <h2>Крафт и алхимия</h2>
    <p>
      Крафт: {state.crafting.craftingSkill.level} ур. · {state.crafting.craftingSkill.xp.toFixed(1)} XP
      {' · '}Алхимия: {state.crafting.alchemySkill.level} ур. · {state.crafting.alchemySkill.xp.toFixed(1)} XP
    </p>
    <p>Мастерские: {workshops.map(workshop=>workshopLabels[workshop]).join(', ')}</p>

    {scrolls.length>0&&<div className="recipe-scrolls">
      <h3>Рецепты в инвентаре</h3>
      {scrolls.map(({stack,recipeId})=>
        <button
          key={stack.itemId}
          onClick={()=>commands.learnRecipeCmd(recipeId)}
        >
          Изучить: {craftRecipes[recipeId].label} × {stack.quantity}
        </button>
      )}
    </div>}

    <div className="recipe-list">
      {known.map(recipe=>{
        const readiness=craftReadiness(
          state.crafting,
          state.inventory,
          recipe.id,
          recipe.workshop
        );
        const actionReason=craftingActionReason(
          state.injuries,
          Boolean(state.combat),
          workshops,
          recipe.workshop,
          loadRatio,
          now
        );
        const selection=recipeMaterialSelection(recipe,state.inventory);
        const probabilities=recipe.output.kind==='equipment'
          ? craftRarityProbabilities(recipe,state.crafting,state.inventory,state.attributes.luck)
          : null;

        return <div className="recipe-card" key={recipe.id}>
          <h3>{recipe.label}</h3>
          <p>{workshopLabels[recipe.workshop]} · навык {recipe.skillRequired}+</p>
          <ul>
            {recipe.materials.map(material=><li key={material.materialType}>
              {itemDefs[material.materialType]?.label??material.materialType}
              {material.minClass?' (редкий материал)':''}: {material.quantity}
              {' / '}
              {materialCount(state.inventory.stacks,material.materialType,material.minClass)}
            </li>)}
          </ul>
          {probabilities&&<p>
            Шанс качества: {Object.entries(probabilities)
              .filter(([,chance])=>chance>0)
              .map(([rarity,chance])=>`${rarityLabels[rarity as keyof typeof rarityLabels]} ${Math.round(chance*100)}%`)
              .join(' · ')}
          </p>}
          {!selection.complete&&<small>Не хватает материалов.</small>}
          <button
            disabled={!readiness.ok||actionReason!==null}
            onClick={()=>commands.craftRecipeCmd(recipe.id)}
          >
            Создать
          </button>
        </div>;
      })}
    </div>

    {(state.inventory.instances??[]).length>0&&<div className="crafted-list">
      <h3>Созданная экипировка</h3>
      {(state.inventory.instances??[]).map(instance=>{
        const stats=effectiveInstanceStats(instance);
        const recipe=craftRecipes[instance.baseItemId];
        const canWorkshop=recipe
          ? craftingActionReason(
              state.injuries,
              Boolean(state.combat),
              workshops,
              recipe.workshop,
              loadRatio,
              now
            )===null
          : false;
        const nextCost=upgradeCost(instance.upgradeLevel+1);
        return <div className="crafted-card" key={instance.instanceId}>
          <strong>{itemDefs[instance.baseItemId]?.label??instance.baseItemId}</strong>
          <p>{rarityLabels[instance.rarity]} · +{instance.upgradeLevel}</p>
          <p>
            Характеристики: {Object.entries(stats).map(([name,value])=>
              `${name}: ${Number(value.toFixed(3))}`
            ).join(' · ')||'—'}
          </p>
          <p>
            Свойства: {instance.properties.length
              ? instance.properties.map(id=>propertyLabels[id]??id).join(', ')
              : 'нет'}
          </p>
          <button
            disabled={!canWorkshop||instance.upgradeLevel>=5||state.gold<nextCost}
            onClick={()=>commands.upgradeCraftedCmd(instance.instanceId)}
          >
            Улучшить{instance.upgradeLevel<5?` — ${nextCost} золота`:''}
          </button>
          {instance.properties.map((property,index)=>
            <button
              key={index}
              disabled={!canWorkshop||state.gold<10}
              onClick={()=>commands.rerollCraftedCmd(instance.instanceId,index)}
            >
              Перебросить «{propertyLabels[property]??property}» — 10 золота
            </button>
          )}
        </div>;
      })}
    </div>}
  </section>;
}
