import React from 'react';
import {useGame} from '../GameProvider';
import {cities} from '../../content/cities';
import {craftingRecipes,equipmentUpgradeMaterialType} from '../../content/crafting';
import {itemDefs} from '../../content/items';
import {
  equipmentUpgradeCost,
  maxCraftableCount,
  REROLL_GOLD_COST
} from '../../game-core/crafting/crafting';

const rarityLabels={
  common:'Обычный',
  quality:'Качественный',
  rare:'Редкий',
  epic:'Эпический',
  unique:'Уникальный'
} as const;

export function CraftingPanel(){
  const {state,commands}=useGame();
  const city=cities[state.world.locationId];
  if(!city)return null;

  const recipes=Object.values(craftingRecipes).filter(recipe=>city.workshops.includes(recipe.workshop));

  return <section>
    <h2>Мастерские</h2>
    <p>Ремесло: {state.skillProgression.crafting.level} · Алхимия: {state.skillProgression.alchemy.level}</p>
    <p>Крафт мгновенный и без риска провала. По умолчанию используются материалы низшего доступного класса.</p>
    {recipes.map(recipe=>{
      const skill=state.skillProgression[recipe.skillId];
      const unlocked=state.crafting.knownRecipeIds.includes(recipe.id)&&skill.level>=recipe.requiredSkill;
      const max=maxCraftableCount(state.inventory,recipe,itemDefs,'lowest',99);
      const ingredients=recipe.ingredients.map(ingredient=>
        `${ingredient.materialType} ×${ingredient.quantity}${ingredient.minClass&&ingredient.minClass>1?` (класс ${ingredient.minClass}+)`:''}`
      ).join(', ');
      return <div key={recipe.id}>
        <strong>{recipe.label}</strong>
        <div>Навык: {recipe.requiredSkill} · Материалы: {ingredients}</div>
        <button disabled={!unlocked||max<1||Boolean(state.combat)} onClick={()=>commands.craft(recipe.id,1,'lowest')}>Создать 1</button>
        <button disabled={!unlocked||max<2||Boolean(state.combat)} onClick={()=>commands.craft(recipe.id,max,'lowest')}>Создать максимум ({max})</button>
        <button disabled={!unlocked||max<1||Boolean(state.combat)} onClick={()=>commands.craft(recipe.id,1,'highest')}>Использовать лучшие материалы</button>
      </div>;
    })}

    {(state.inventory.equipment??[]).filter(instance=>equipmentUpgradeMaterialType[instance.itemId]).length>0&&<>
      <h3>Улучшение экипировки</h3>
      {(state.inventory.equipment??[])
        .filter(instance=>equipmentUpgradeMaterialType[instance.itemId])
        .map(instance=>{
          const def=itemDefs[instance.itemId];
          const cost=instance.upgradeLevel<5?equipmentUpgradeCost(instance.upgradeLevel+1,instance.itemClass):null;
          return <div key={instance.instanceId}>
            <strong>{def?.label??instance.itemId}</strong> — класс {instance.itemClass}, {rarityLabels[instance.rarity]}, +{instance.upgradeLevel}
            {cost&&<div>Следующее улучшение: {cost.gold} золота, обычные материалы ×{cost.commonUnits}, особые ×{cost.specialUnits}</div>}
            <button disabled={!cost||Boolean(state.combat)} onClick={()=>commands.upgradeEquipment(instance.instanceId)}>
              {cost?'Улучшить':'Максимум +5'}
            </button>
            {instance.properties.map((property,index)=><div key={`${instance.instanceId}-${index}`}>
              {property.label}: {property.value.toFixed(2)} {property.rerollable&&
                <button disabled={state.gold<REROLL_GOLD_COST||Boolean(state.combat)} onClick={()=>commands.rerollEquipment(instance.instanceId,index)}>
                  Перебросить ({REROLL_GOLD_COST} золота)
                </button>}
            </div>)}
          </div>;
        })}
    </>}
  </section>;
}
