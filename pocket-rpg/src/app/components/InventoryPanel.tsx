import React from 'react';
import {useGame} from '../GameProvider';
import {itemDefs} from '../../content/items';
import {craftRecipes} from '../../content/crafting';
import {
  canUseCraftingAction,
  recipeScrollEntries
} from '../game-controller';

export function InventoryPanel(){
  const{state,commands}=useGame();
  const canLearn=canUseCraftingAction(
    state.injuries,
    Boolean(state.combat),
    Date.now()
  );
  const scrolls=recipeScrollEntries(state.inventory);

  return <section>
    <h2>Инвентарь</h2>
    {state.inventory.stacks.map(stack=>
      <div key={stack.itemId} className="inventory-row">
        <span>{itemDefs[stack.itemId]?.label??stack.itemId} × {stack.quantity}</span>
        {stack.itemId.startsWith('recipe-')&&craftRecipes[stack.itemId.slice(7)]&&
          <button
            disabled={!canLearn}
            onClick={()=>commands.learnRecipeCmd(stack.itemId.slice(7))}
          >
            Изучить
          </button>}
      </div>
    )}
    {scrolls.length>0&&!canLearn&&
      <small>Изучение рецептов сейчас недоступно.</small>}
    {(state.inventory.instances??[]).map(instance=>
      <div key={instance.instanceId}>
        {itemDefs[instance.baseItemId]?.label??instance.baseItemId}
        {' · '}{instance.rarity} · +{instance.upgradeLevel}
      </div>
    )}
  </section>;
}
