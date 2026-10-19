import React from 'react';
import {useGame} from '../GameProvider';
import {canPerformAction} from '../game-controller';
import {cities} from '../../content/cities';
import {factions} from '../../content/factions';
import {basePrices} from '../../content/economy';
import {itemDefs} from '../../content/items';
import {
  AUDIENCE_COOLDOWN_MS,
  MEDIATION_COOLDOWN_MS,
  canCompleteFactionRequest,
  currentFactionRequest,
  relationRank
} from '../../game-core/diplomacy/diplomacy';

const rankLabels={
  hostile:'Враждебные',
  cold:'Холодные',
  neutral:'Нейтральные',
  respected:'Уважение',
  honored:'Почёт',
  allied:'Союз'
} as const;

function remainingLabel(until:number,now:number):string{
  const remaining=Math.max(0,until-now);
  if(remaining<=0)return 'доступно';
  const minutes=Math.ceil(remaining/60000);
  if(minutes<60)return `${minutes} мин.`;
  const hours=Math.floor(minutes/60);
  const rest=minutes%60;
  return rest?`${hours} ч. ${rest} мин.`:`${hours} ч.`;
}

export function FactionPanel(){
  const{state,commands}=useGame();
  const city=cities[state.world.locationId];
  const factionId=city?.factionId;
  if(!factionId)return null;

  const faction=factions[factionId];
  const now=Date.now();
  const relation=state.economy.factionRelations[factionId]??0;
  const rank=relationRank(relation);
  const request=currentFactionRequest(faction,now);
  const requestItem=itemDefs[request.itemId];
  const completed=!canCompleteFactionRequest(state.diplomacy,request);
  const availableCount=state.inventory.stacks
    .filter(stack=>stack.itemId===request.itemId)
    .reduce((sum,stack)=>sum+stack.quantity,0);
  const reward=(basePrices[request.itemId]??0)*request.quantity*0.5;
  const audienceUntil=state.diplomacy.audienceAvailableAt[factionId]??0;
  const mediationUntil=state.diplomacy.mediationAvailableAt[factionId]??0;
  const locked=Boolean(state.combat)||!canPerformAction(state.injuries,'diplomacy',now);

  return <section>
    <h2>{faction.label}</h2>
    <p>{faction.description}</p>
    <p>
      Отношения: {relation.toFixed(0)} · {rankLabels[rank]} ·
      Дипломатия: {state.skillProgression.diplomacy.level}
    </p>

    <h3>Аудиенция</h3>
    <p>
      Короткая встреча с представителями фракции. Успех даёт +1 отношения.
      Повтор: раз в {AUDIENCE_COOLDOWN_MS/(60*60*1000)} ч.
    </p>
    <button
      disabled={locked||now<audienceUntil}
      onClick={commands.factionAudience}
    >
      Аудиенция — {remainingLabel(audienceUntil,now)}
    </button>

    <h3>Медиация</h3>
    <p>
      Открывается на навыке 20. Успех: +2 отношения, провал: −1.
      Повтор: раз в {MEDIATION_COOLDOWN_MS/(60*60*1000)} ч.
    </p>
    <button
      disabled={locked||state.skillProgression.diplomacy.level<20||now<mediationUntil}
      onClick={commands.factionMediation}
    >
      Провести медиацию — {remainingLabel(mediationUntil,now)}
    </button>

    <h3>Поручение фракции</h3>
    <p>
      Требуется: {requestItem?.label??request.itemId} ×{request.quantity}.
      В инвентаре: {availableCount}. Награда: +3 отношения, {reward.toFixed(2)} золота и опыт дипломатии.
    </p>
    <button
      disabled={locked||completed||availableCount<request.quantity}
      onClick={commands.completeFactionRequest}
    >
      {completed?'Поручение этого периода выполнено':'Передать требуемые товары'}
    </button>

    <h3>Репутационная награда</h3>
    <p>
      При отношении 50+ открывается локальный товар:
      {' '}{itemDefs[faction.honoredUnlockItemId]?.label??faction.honoredUnlockItemId}.
    </p>
  </section>;
}
