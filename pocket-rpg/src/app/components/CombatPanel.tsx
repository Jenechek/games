import React from 'react';
import {useGame} from '../GameProvider';
import {classAbilities,classAbilityAction} from '../../content/class-abilities';
import {itemDefs} from '../../content/items';
import {normalizedStackClass} from '../../game-core/items/inventory';
import {summonDefinitions} from '../../content/summons';
import {
  canCastMagicSpell,
  chooseMageAutoSpellId,
  isMagicSpellUnlocked,
  magicSpells,
  type MagicSpellId
} from '../../content/magic';

function effectLabel(id:string):string{
  if(id==='might')return 'Боевой тонус';
  if(id==='focus')return 'Сосредоточение';
  if(id==='ward')return 'Магический барьер';
  return id;
}

export function CombatPanel(){
  const{state,commands}=useGame();
  if(!state.combat)return null;
  const potionStacks=state.inventory.stacks.filter(stack=>Boolean(itemDefs[stack.itemId]?.combatUse));
  const itemUsed=state.combatItemUsedRound===state.combat.round;
  const isMage=['mage','battlemage','druid','paladin'].includes(state.classState.classId??'');
  const magicLevel=state.skillProgression.magic.level;
  const player=state.combat.player;
  const focus=player.effects?.find(effect=>effect.id==='focus');
  const ward=player.effects?.find(effect=>effect.id==='ward');

  const availabilityContext={
    magicLevel,
    mana:player.mana,
    hp:player.hp,
    maxHp:player.maxHp
  };
  const canCast=(spellId:MagicSpellId)=>
    isMage&&canCastMagicSpell(magicSpells[spellId],availabilityContext);

  const autoSpellId=isMage?chooseMageAutoSpellId({
    ...availabilityContext,
    focusRoundsRemaining:focus?.roundsRemaining,
    wardRoundsRemaining:ward?.roundsRemaining,
    magicResistance:state.combat.enemy.magicResistance,
    elementalResistances:state.combat.enemy.elementalResistances
  }):null;

  return <section>
    <h2>Бой — раунд {state.combat.round}</h2>
    <p>HP: {Math.round(player.hp)}/{player.maxHp} · Враг: {Math.round(state.combat.enemy.hp)}/{state.combat.enemy.maxHp}</p>
    <p>Мана: {Math.round(player.mana)}/{player.maxMana} · Выносливость: {Math.round(player.stamina)}/{player.maxStamina}</p>
    <p>Сопротивления врага: аркана {Math.round((state.combat.enemy.elementalResistances?.arcane??0)*100)}%, огонь {Math.round((state.combat.enemy.elementalResistances?.fire??0)*100)}%, холод {Math.round((state.combat.enemy.elementalResistances?.frost??0)*100)}%</p>
    <p>Насыщенность зельями: {player.toxicity??0}/100</p>
    {(state.combat.summons??[]).length>0&&<div>
      <strong>Призывы:</strong>
      {(state.combat.summons??[]).map(summon=><div key={summon.instanceId}>
        {summonDefinitions[summon.definitionId]?.label??summon.definitionId}:
        {' '}HP {Math.ceil(summon.hp)}/{summon.maxHp},
        {' '}выносливость {Math.ceil(summon.stamina)}/{summon.maxStamina}
      </div>)}
    </div>}
    {(player.effects??[]).map(effect=><div key={effect.id}>
      {effectLabel(effect.id)}: {Math.round(effect.magnitude*100)}% ({effect.roundsRemaining} р.)
    </div>)}
    {state.combatMode==='auto'&&<p>
      Намерение персонажа: {autoSpellId?magicSpells[autoSpellId].label:'обычная атака'}
    </p>}
    <button onClick={commands.togglePause}>{state.paused?'Продолжить':'Пауза'}</button>
    <button onClick={()=>commands.setMode(state.combatMode==='auto'?'manual':'auto')}>{state.combatMode==='auto'?'Ручной режим':'Автобой'}</button>
    {state.combatMode==='manual'&&<>
      <button onClick={commands.manualAttack}>Атаковать</button>
      {state.classState.classId&&<button disabled={!classAbilityAction(state.classState.classId,state.classState.skill.level,player)} onClick={commands.manualClassAbility}>{classAbilities[state.classState.classId].label} (навык класса 10)</button>}
      {isMage&&<div>
        {Object.values(magicSpells).map(spell=>{
          const unlocked=isMagicSpellUnlocked(spell,magicLevel);
          const available=canCast(spell.id);
          return <button
            key={spell.id}
            disabled={!available}
            onClick={()=>commands.manualCastMagic(spell.id)}
          >
            {spell.label} ({spell.manaCost} маны)
            {!unlocked&&` — Магия ${spell.requiredMagicLevel}`}
          </button>;
        })}
      </div>}
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
