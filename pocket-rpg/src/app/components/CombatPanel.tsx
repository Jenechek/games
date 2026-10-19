import React from 'react';
import {useGame} from '../GameProvider';
import {itemDefs} from '../../content/items';
import {normalizedStackClass} from '../../game-core/items/inventory';
import {summonDefinitions} from '../../content/summons';
import {arcaneFocusSpell} from '../../content/magic';

export function CombatPanel(){
  const{state,commands}=useGame();
  if(!state.combat)return null;
  const potionStacks=state.inventory.stacks.filter(stack=>Boolean(itemDefs[stack.itemId]?.combatUse));
  const itemUsed=state.combatItemUsedRound===state.combat.round;
  const isMage=state.classState.classId==='mage';
  const focus=state.combat.player.effects?.find(effect=>effect.id==='focus');
  const canCastFocus=isMage&&state.combat.player.mana>=arcaneFocusSpell.manaCost;
  const autoUsesFocus=canCastFocus&&(!focus||focus.roundsRemaining<=1);

  return <section>
    <h2>Бой — раунд {state.combat.round}</h2>
    <p>HP: {Math.round(state.combat.player.hp)}/{state.combat.player.maxHp} · Враг: {Math.round(state.combat.enemy.hp)}/{state.combat.enemy.maxHp}</p>
    <p>Мана: {Math.round(state.combat.player.mana)}/{state.combat.player.maxMana} · Выносливость: {Math.round(state.combat.player.stamina)}/{state.combat.player.maxStamina}</p>
    <p>Насыщенность зельями: {state.combat.player.toxicity??0}/100</p>
    {(state.combat.summons??[]).length>0&&<div>
      <strong>Призывы:</strong>
      {(state.combat.summons??[]).map(summon=><div key={summon.instanceId}>
        {summonDefinitions[summon.definitionId]?.label??summon.definitionId}:
        {' '}HP {Math.ceil(summon.hp)}/{summon.maxHp},
        {' '}выносливость {Math.ceil(summon.stamina)}/{summon.maxStamina}
      </div>)}
    </div>}
    {(state.combat.player.effects??[]).map(effect=><div key={effect.id}>
      {effect.id==='might'?'Боевой тонус':'Сосредоточение'}: {Math.round(effect.magnitude*100)}% ({effect.roundsRemaining} р.)
    </div>)}
    {state.combatMode==='auto'&&<p>
      Намерение персонажа: {autoUsesFocus?arcaneFocusSpell.label:'обычная атака'}
    </p>}
    <button onClick={commands.togglePause}>{state.paused?'Продолжить':'Пауза'}</button>
    <button onClick={()=>commands.setMode(state.combatMode==='auto'?'manual':'auto')}>{state.combatMode==='auto'?'Ручной режим':'Автобой'}</button>
    {state.combatMode==='manual'&&<>
      <button onClick={commands.manualAttack}>Атаковать</button>
      {isMage&&<button
        disabled={!canCastFocus}
        onClick={commands.manualMagicFocus}
      >
        {arcaneFocusSpell.label} ({arcaneFocusSpell.manaCost} маны)
      </button>}
    </>}
    <select value={state.style} onChange={e=>commands.setStyle(e.target.value as any)}>
      <option value="balanced">Сбалансированный</option>
      <option value="aggressive">Агрессивный</option>
      <option value="defensive">Защитный</option>
      <option value="evasive">Уклонение</option>
    </select>
    {potionStacks.length>0&&<div>
      <strong>Предмет раунда:</strong>
      {potionStacks.map(stack=>{
        const itemClass=normalizedStackClass(stack);
        const def=itemDefs[stack.itemId];
        return <button
          key={`${stack.itemId}-${itemClass}`}
          disabled={itemUsed}
          onClick={()=>commands.useCombatConsumable(stack.itemId,itemClass)}
        >
          {def.label} кл.{itemClass} ×{stack.quantity}
        </button>;
      })}
    </div>}
  </section>;
}
