import React,{createContext,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {
  applyGatheringResults,
  applyHarvestResults,
  canPerformAction,
  canStartGatheringAction,
  canStartFarmingAction,
  canStartFishingAction,
  canStartFishingWithFarming,
  createNewGame,
  currentLoadRatio,
  rollFarmingInterruption,
  scaleFarmingAmbushStats,
  tickGame,
  travelCommand,
  useInjuryMedicine,
  type InjuryMedicineTier,
  type UiGameState
} from './game-controller';
import { SeededRng } from '../game-core/rng';
import type { AttributeId } from '../game-core/types';
import { locations } from '../content/locations';
import { enemies } from '../content/enemies';
import { resolveRound } from '../game-core/combat/resolution';
import { chooseAutoAction } from '../game-core/combat/auto-ai';
import type { CombatState, CombatStyle } from '../game-core/combat/types';
import { rollLoot, type LootResult } from '../game-core/loot/loot';
import { startFishing, advanceFishing, stopFishing, type FishingState } from '../game-core/peaceful/fishing';
import {
  abandonField,
  advanceFarmingWork,
  startFieldEstablishment,
  startHarvesting,
  startPlanting
} from '../game-core/peaceful/farming/farming';
import type { FarmingWork } from '../game-core/peaceful/farming/types';
import {
  advanceGathering,
  startGathering,
  stopGathering
} from '../game-core/peaceful/gathering/gathering';
import type {
  GatheringFocus,
  GatheringSession
} from '../game-core/peaceful/gathering/types';
import { gatheringResourceDefs } from '../content/gathering';
import { applyBuyPressure, applySellProgress } from '../game-core/economy/merchant';
import { IndexedDbSaveStore } from '../storage/indexed-db';
import { reconstructState } from '../game-core/game-state';
import { applyDefeatConsequences } from '../game-core/injuries/defeat';
import { injuryPenaltySummary } from '../game-core/injuries/injuries';
import type { InventoryState } from '../game-core/items/inventory';
import { addInventoryStack, normalizedStackClass, removeInventoryStack } from '../game-core/items/inventory';
import { itemDefs } from '../content/items';
import { createEquipmentInstance, createLegacyEquipmentInstance } from '../game-core/items/equipment';
import {
  craftRecipeBatch,
  rerollEquipment,
  upgradeEquipment
} from '../game-core/crafting/crafting';
import type { MaterialPolicy } from '../game-core/crafting/types';
import {
  craftingRecipes,
  equipmentPropertyPools,
  equipmentUpgradeMaterialType
} from '../content/crafting';
import { cities } from '../content/cities';
import { merchants } from '../content/merchants';
import { equipmentSellQuote, stackBuyQuote, stackSellQuote } from './market-controller';
import { applyCombatConsumable } from '../game-core/alchemy/consumables';
import {
  attemptAudience,
  attemptMediation,
  completeFactionRequest as resolveFactionRequest,
  currentFactionRequest,
  honoredFactionItemUnlocked
} from '../game-core/diplomacy/diplomacy';
import { factions } from '../content/factions';
import { basePrices } from '../content/economy';
import {
  UNIVERSITY_UNLOCK_LEVEL,
  startRetraining
} from '../game-core/university/retraining';

interface RuntimeState extends UiGameState {
  inventory:InventoryState;
  fishingXp:number;
  fishing?:FishingState|null;
  farmingWork:FarmingWork|null;
  gatheringSession:GatheringSession|null;
  combat?:CombatState|null;
  combatMode:'auto'|'manual'; paused:boolean; style:CombatStyle;
  combatItemUsedRound:number|null;
  loot?:LootResult|null;
  log:string[];
}
interface Commands {
  travelTo(id:string):void;
  startEncounter():void;
  manualAttack():void;
  togglePause():void;
  setMode(v:'auto'|'manual'):void;
  setStyle(v:CombatStyle):void;
  takeLoot(ids:string[]):void;
  startFishingCmd():void;
  stopFishingCmd():void;
  establishField():void;
  plantField(fieldId:string,cropId:string):void;
  harvestField(fieldId:string):void;
  stopFarmingCmd():void;
  abandonField(fieldId:string):void;
  startGatheringCmd(focus:GatheringFocus):void;
  stopGatheringCmd():void;
  buy(id:string,quantity:number):void;
  sellStack(id:string,itemClass:number,quantity:number):void;
  sellEquipment(instanceId:string):void;
  useInjuryMedicine(tier:InjuryMedicineTier):void;
  craft(recipeId:string,quantity:number,policy?:MaterialPolicy):void;
  upgradeEquipment(instanceId:string):void;
  rerollEquipment(instanceId:string,propertyIndex:number):void;
  useCombatConsumable(itemId:string,itemClass:number):void;
  factionAudience():void;
  factionMediation():void;
  completeFactionRequest():void;
  startAttributeRetraining(from:AttributeId,to:AttributeId,percent:number):void;
}
const Ctx=createContext<{state:RuntimeState;commands:Commands}|null>(null);

function initial():RuntimeState {
  const g=createNewGame();
  const inventory:InventoryState={stacks:[
    {itemId:'basic-fishing-rod',quantity:1},
    {itemId:'worms',quantity:1},
    {itemId:'healing-potion',quantity:2}
  ],equipment:[]};
  return {
    ...g,
    inventory,
    fishingXp:0,
    fishing:null,
    farmingWork:null,
    gatheringSession:null,
    combat:null,
    combatMode:'auto',
    paused:false,
    style:'balanced',
    combatItemUsedRound:null,
    loot:null,
    log:['Вы прибыли в Тилланиум.']
  };
}

function enemyCombat(id:string, state:RuntimeState, farmingAmbush=false):CombatState {
  const e=enemies[id];
  const penalties=injuryPenaltySummary(state.injuries);
  const playerMaxHp=Math.max(1,Math.round(100*penalties.maxHpMultiplier));
  const scaled=farmingAmbush
    ? scaleFarmingAmbushStats(e.maxHp,e.damage)
    : {maxHp:e.maxHp,damage:e.damage};
  return {
    round:1,
    player:{
      id:'player',hp:playerMaxHp,maxHp:playerMaxHp,
      mana:100,maxMana:100,stamina:100,maxStamina:100,
      stunned:false,shieldBlock:0,
      parry:.1*penalties.blockParryMultiplier,
      evasion:.08,
      accuracy:Math.max(0,.85-penalties.accuracyPenalty),
      damage:18*penalties.physicalAttackMultiplier,
      style:'balanced',
      toxicity:0,
      effects:[]
    },
    enemy:{
      id:e.id,hp:scaled.maxHp,maxHp:scaled.maxHp,
      mana:50,maxMana:50,stamina:100,maxStamina:100,
      stunned:false,shieldBlock:0,parry:0,evasion:.05,accuracy:.75,damage:scaled.damage,style:'balanced',
      toxicity:0,effects:[]
    }
  };
}

export function GameProvider({children}:{children:React.ReactNode}){
  const [state,setState]=useState<RuntimeState>(initial);
  const [hydrated,setHydrated]=useState(false);
  const rng=useRef(new SeededRng(1234567));
  const saveStore=useRef(new IndexedDbSaveStore());

  useEffect(()=>{
    saveStore.current.load().then(saved=>{
      if(saved){
        const restored=reconstructState(saved,Date.now());
        setState(s=>({
          ...s,
          level:restored.character.level,
          xp:restored.character.xp,
          gold:restored.character.gold,
          attributes:restored.character.attributes,
          world:restored.world,
          inventory:restored.inventory,
          injuries:restored.injuries,
          farming:restored.farming,
          gathering:restored.gathering,
          crafting:restored.crafting,
          economy:restored.economy,
          diplomacy:restored.diplomacy,
          university:restored.university,
          farmingWork:null,
          gatheringSession:null
        }));
      }
    }).catch(()=>{}).finally(()=>setHydrated(true));
  },[]);

  useEffect(()=>{
    if(!hydrated)return;
    const id=setTimeout(()=>{
      saveStore.current.save({
        character:{level:state.level,xp:state.xp,gold:state.gold,attributes:state.attributes},
        world:state.world,
        inventory:state.inventory,
        injuries:state.injuries,
        farming:state.farming,
        gathering:state.gathering,
        crafting:state.crafting,
        economy:state.economy,
        diplomacy:state.diplomacy,
        university:state.university
      }).catch(()=>{});
    },300);
    return()=>clearTimeout(id);
  },[hydrated,state.level,state.xp,state.gold,state.attributes,state.world,state.inventory,state.injuries,state.farming,state.gathering,state.crafting,state.economy,state.diplomacy,state.university]);

  useEffect(()=>{
    const id=setInterval(()=>setState(s=>{
      const now=Date.now();
      let n:RuntimeState={...s,...tickGame(s,now)};

      while(n.farmingWork && now>=n.farmingWork.nextAt){
        const agriculture=locations[n.farmingWork.locationId]?.agriculture;
        const stepAt=n.farmingWork.nextAt;
        const step=advanceFarmingWork(
          n.farming,
          n.farmingWork,
          stepAt,
          rng.current,
          n.attributes.luck
        );
        const inventory=applyHarvestResults(n.inventory,step.harvests);
        n={
          ...n,
          farming:step.state,
          farmingWork:step.work,
          inventory
        };

        if(currentLoadRatio(n.inventory,n.attributes)>=1.2){
          n={
            ...n,
            farmingWork:null,
            log:[...n.log,'Работа на поле остановлена: перегруз достиг 120%.']
          };
          break;
        }

        if(step.completedCells>0){
          const enemyId=rollFarmingInterruption(agriculture,rng.current);
          if(enemyId){
            n={
              ...n,
              farmingWork:null,
              fishing:null,
              combat:enemyCombat(enemyId,n,true),
              combatItemUsedRound:null,
              log:[...n.log,'Работу на поле прервал слабый противник.']
            };
            break;
          }
        }
      }

      if(n.gatheringSession && !n.farmingWork && canPerformAction(n.injuries,'gathering',now)){
        const gathered=advanceGathering(
          n.gathering,
          n.gatheringSession,
          now,
          rng.current,
          n.world.locationId,
          n.attributes.luck,
          0,
          results=>currentLoadRatio(
            applyGatheringResults(n.inventory,results),
            n.attributes
          )<1.2
        );
        const inventory=applyGatheringResults(n.inventory,gathered.results);
        const resultLog=gathered.results.map(result=>{
          const label=gatheringResourceDefs[result.resourceId]?.label ?? result.resourceId;
          return `Сбор: ${label} ×${result.quantity}${result.rare?' (редкий)':''}.`;
        });
        n={
          ...n,
          gathering:gathered.gathering,
          gatheringSession:gathered.session,
          inventory,
          log:resultLog.length?[...n.log,...resultLog]:n.log
        };
        if(currentLoadRatio(n.inventory,n.attributes)>=1.2){
          n={...n,gatheringSession:null,log:[...n.log,'Сбор остановлен: перегруз достиг 120%.']};
        }
      }

      if(n.fishing && !n.farmingWork && !n.gatheringSession && canPerformAction(n.injuries,'fishing',now)){
        const f=advanceFishing(
          n,
          now,
          rng.current,
          n.world.locationId,
          n.attributes.luck,
          inventory=>currentLoadRatio(inventory,n.attributes)<1.2
        );
        n={...n,...f};
        if(n.fishing===null){
          n={...n,log:[...n.log,'Рыбалка остановлена: перегруз достиг 120%.']};
        }
      }
      return n;
    }),250);
    return()=>clearInterval(id);
  },[]);

  function applyPlayerDefeat(s:RuntimeState):RuntimeState {
    return {
      ...s,
      combat:null,
      combatItemUsedRound:null,
      fishing:null,
      farmingWork:null,
      gatheringSession:null,
      injuries:applyDefeatConsequences(s.injuries,'ordinary',Date.now(),rng.current),
      log:[...s.log,'Поражение. Персонаж потерял сознание и получил травму.']
    };
  }

  useEffect(()=>{
    if(state.combatMode!=='auto'||state.paused||!state.combat)return;
    const id=setInterval(()=>setState(s=>{
      if(!s.combat||s.paused||s.combatMode!=='auto')return s;
      const pc=chooseAutoAction(s.combat,'player',rng.current);pc.style=s.style;
      const ec=chooseAutoAction(s.combat,'enemy',rng.current);
      const r=resolveRound(s.combat,{player:pc,enemy:ec},rng.current);
      if(r.state.player.hp<=0)return applyPlayerDefeat(s);
      if(r.state.enemy.hp<=0){
        const l=rollLoot({gold:[3,10],drops:[{itemId:'iron-short-sword',chance:.15}]},{luck:s.attributes.luck},rng.current);
        return{...s,combat:null,combatItemUsedRound:null,loot:l,gold:s.gold+l.gold,log:[...s.log,`Победа. Получено ${l.gold} золота.`]};
      }
      return{...s,combat:r.state,combatItemUsedRound:null,log:[...s.log,`Раунд ${s.combat.round} завершён.`]};
    }),5000);
    return()=>clearInterval(id);
  },[state.combatMode,state.paused,state.combat,state.style]);

  const commands=useMemo<Commands>(()=>({
    travelTo(id){
      setState(s=>{
        if(!canPerformAction(s.injuries,'travel',Date.now()))return{...s,log:[...s.log,'Сейчас нельзя путешествовать: персонаж восстанавливается.']};
        const ratio=currentLoadRatio(s.inventory,s.attributes);
        return{...s,...travelCommand(s,id,Date.now(),rng.current,ratio),fishing:null,farmingWork:null,gatheringSession:null};
      });
    },
    startEncounter(){
      setState(s=>{
        if(!canPerformAction(s.injuries,'combat',Date.now()))return{...s,log:[...s.log,'Сейчас нельзя вступать в бой: персонаж восстанавливается.']};
        const id=locations[s.world.locationId]?.enemies[0];
        return id?{...s,combat:enemyCombat(id,s),combatItemUsedRound:null,fishing:null,farmingWork:null,gatheringSession:null,log:[...s.log,`Бой: ${enemies[id].label}`]}:s;
      });
    },
    manualAttack(){
      setState(s=>{
        if(!s.combat)return s;
        const ec=chooseAutoAction(s.combat,'enemy',rng.current);
        const r=resolveRound(s.combat,{player:{main:{type:'attack'},style:s.style},enemy:ec},rng.current);
        if(r.state.player.hp<=0)return applyPlayerDefeat(s);
        if(r.state.enemy.hp<=0){
          const l=rollLoot({gold:[3,10],drops:[{itemId:'iron-short-sword',chance:.15}]},{luck:s.attributes.luck},rng.current);
          return{...s,combat:null,combatItemUsedRound:null,loot:l,gold:s.gold+l.gold,log:[...s.log,`Победа. Получено ${l.gold} золота.`]};
        }
        return{...s,combat:r.state,combatItemUsedRound:null};
      });
    },
    togglePause(){setState(s=>({...s,paused:!s.paused}));},
    setMode(v){setState(s=>({...s,combatMode:v}));},
    setStyle(v){setState(s=>({...s,style:v}));},
    takeLoot(ids){
      setState(s=>{
        if(!s.loot)return s;
        let inventory:InventoryState={
          stacks:s.inventory.stacks.map(stack=>({...stack})),
          equipment:[...(s.inventory.equipment??[])]
        };
        let crafting=s.crafting;
        for(const it of s.loot.items.filter(x=>ids.includes(x.itemId))){
          const def=itemDefs[it.itemId];
          if(def?.slot){
            for(let index=0;index<it.quantity;index+=1){
              const instance=createEquipmentInstance(
                `eq-${crafting.nextEquipmentId}`,
                def,
                1,
                def.rarity??'common',
                equipmentPropertyPools[def.slot]??[],
                rng.current
              );
              inventory.equipment=[...(inventory.equipment??[]),instance];
              crafting={...crafting,nextEquipmentId:crafting.nextEquipmentId+1};
            }
          }else{
            inventory=addInventoryStack(inventory,it.itemId,it.quantity,1);
          }
        }
        return{...s,inventory,crafting,loot:null};
      });
    },
    startFishingCmd(){
      setState(s=>{
        const now=Date.now();
        const ratio=currentLoadRatio(s.inventory,s.attributes);
        if(!canStartFishingAction(s.injuries,Boolean(s.combat),Boolean(s.farmingWork),ratio,now)){
          return{...s,log:[...s.log,'Сейчас нельзя рыбачить.']};
        }
        return locations[s.world.locationId]?.fishing
          ? {...startFishing(s,'worms',now,ratio),gatheringSession:null} as RuntimeState
          : s;
      });
    },
    stopFishingCmd(){setState(s=>stopFishing(s) as RuntimeState);},
    establishField(){
      setState(s=>{
        const location=locations[s.world.locationId];
        if(!location?.agriculture)return s;
        if(!canStartFarmingAction(
          s.injuries,
          Boolean(s.combat),
          currentLoadRatio(s.inventory,s.attributes),
          Date.now()
        ))return{...s,log:[...s.log,'Сейчас нельзя работать на поле.']};
        if(s.farmingWork)return s;
        try{
          return{
            ...s,
            fishing:null,
            gatheringSession:null,
            farmingWork:startFieldEstablishment(s.farming,s.world.locationId,Date.now()),
            log:[...s.log,'Начата подготовка нового поля.']
          };
        }catch{return s;}
      });
    },
    plantField(fieldId,cropId){
      setState(s=>{
        if(!canStartFarmingAction(
          s.injuries,
          Boolean(s.combat),
          currentLoadRatio(s.inventory,s.attributes),
          Date.now()
        )||s.farmingWork)return s;
        const field=s.farming.fields.find(candidate=>candidate.id===fieldId);
        if(!field||field.locationId!==s.world.locationId||!locations[s.world.locationId]?.agriculture)return s;
        try{
          return{
            ...s,
            fishing:null,
            gatheringSession:null,
            farmingWork:startPlanting(
              s.farming,
              fieldId,
              cropId,
              Date.now(),
              s.attributes.vitality,
              s.attributes.wisdom
            ),
            log:[...s.log,`Начата посадка: ${cropId}.`]
          };
        }catch{return s;}
      });
    },
    harvestField(fieldId){
      setState(s=>{
        if(!canStartFarmingAction(
          s.injuries,
          Boolean(s.combat),
          currentLoadRatio(s.inventory,s.attributes),
          Date.now()
        )||s.farmingWork)return s;
        const field=s.farming.fields.find(candidate=>candidate.id===fieldId);
        if(!field||field.locationId!==s.world.locationId||!locations[s.world.locationId]?.agriculture)return s;
        try{
          return{
            ...s,
            fishing:null,
            gatheringSession:null,
            farmingWork:startHarvesting(
              s.farming,
              fieldId,
              Date.now(),
              s.attributes.vitality,
              s.attributes.wisdom
            ),
            log:[...s.log,'Начат сбор урожая.']
          };
        }catch{return s;}
      });
    },
    stopFarmingCmd(){
      setState(s=>s.farmingWork?{...s,farmingWork:null,log:[...s.log,'Работа на поле остановлена. Незавершённый шаг потерян.']}:s);
    },
    abandonField(fieldId){
      setState(s=>{
        if(s.farmingWork && 'fieldId' in s.farmingWork && s.farmingWork.fieldId===fieldId)return s;
        return{...s,farming:abandonField(s.farming,fieldId),log:[...s.log,'Поле заброшено вместе со всеми посевами.']};
      });
    },
    startGatheringCmd(focus){
      setState(s=>{
        const now=Date.now();
        const ratio=currentLoadRatio(s.inventory,s.attributes);
        if(!canStartGatheringAction(s.injuries,Boolean(s.combat),Boolean(s.farmingWork),ratio,now)){
          return{...s,log:[...s.log,'Сейчас нельзя заниматься сбором ресурсов.']};
        }
        try{
          return{
            ...s,
            fishing:null,
            gatheringSession:startGathering(
              s.gathering,
              focus,
              now,
              s.world.locationId,
              s.attributes.agility,
              s.attributes.intuition,
              ratio
            ),
            log:[...s.log,'Начат сбор ресурсов.']
          };
        }catch{return s;}
      });
    },
    stopGatheringCmd(){
      setState(s=>s.gatheringSession
        ? {...s,gatheringSession:stopGathering(s.gatheringSession),log:[...s.log,'Сбор ресурсов остановлен.']}
        : s
      );
    },
    buy(id,quantity){
      setState(s=>{
        const now=Date.now();
        const city=cities[s.world.locationId];
        const merchant=city?merchants[city.merchantId]:undefined;
        const def=itemDefs[id];
        if(!city||!merchant||!def)return s;
        const faction=city.factionId?factions[city.factionId]:undefined;
        const relation=city.factionId?s.economy.factionRelations[city.factionId]??0:0;
        const honoredItem=Boolean(
          faction
          &&faction.honoredUnlockItemId===id
          &&honoredFactionItemUnlocked(relation)
        );
        if(!merchant.items.includes(id)&&!honoredItem)return s;
        if(s.combat||!canPerformAction(s.injuries,'merchant',now)){
          return{...s,log:[...s.log,'Сейчас нельзя торговать.']};
        }
        const actualQuantity=def.slot?1:Math.max(1,Math.floor(quantity));
        try{
          const itemClass=def.materialClass??1;
          const quote=stackBuyQuote(
            s.economy,
            city.id,
            id,
            itemClass,
            actualQuantity,
            now,
            s.attributes.charisma
          );
          if(s.gold<quote.total){
            return{...s,log:[...s.log,'Недостаточно золота для покупки.']};
          }

          let inventory=s.inventory;
          let crafting=s.crafting;
          if(def.slot){
            const instance=createLegacyEquipmentInstance(`eq-${crafting.nextEquipmentId}`,def);
            inventory={
              stacks:s.inventory.stacks.map(stack=>({...stack})),
              equipment:[...(s.inventory.equipment??[]),instance]
            };
            crafting={...crafting,nextEquipmentId:crafting.nextEquipmentId+1};
          }else{
            inventory=addInventoryStack(s.inventory,id,actualQuantity,itemClass);
          }

          const economy=applyBuyPressure(s.economy,city.id,id,quote,now);
          return{
            ...s,
            gold:s.gold-quote.total,
            inventory,
            crafting,
            economy,
            fishing:null,
            farmingWork:null,
            gatheringSession:null,
            log:[...s.log,`Куплено: ${def.label} ×${actualQuantity} за ${quote.total.toFixed(2)}.`]
          };
        }catch{
          return{...s,log:[...s.log,'Покупка недоступна.']};
        }
      });
    },
    sellStack(id,itemClass,quantity){
      setState(s=>{
        const now=Date.now();
        const city=cities[s.world.locationId];
        const def=itemDefs[id];
        if(!city||!def)return s;
        if(s.combat||!canPerformAction(s.injuries,'merchant',now)){
          return{...s,log:[...s.log,'Сейчас нельзя торговать.']};
        }
        const stack=s.inventory.stacks.find(entry=>
          entry.itemId===id
          &&normalizedStackClass(entry)===itemClass
        );
        const actualQuantity=Math.min(stack?.quantity??0,Math.max(1,Math.floor(quantity)));
        if(actualQuantity<=0)return s;

        try{
          const quote=stackSellQuote(
            s.economy,
            city.id,
            id,
            itemClass,
            actualQuantity,
            now,
            s.attributes.charisma
          );
          const inventory=removeInventoryStack(s.inventory,id,actualQuantity,itemClass);
          const economy=applySellProgress(s.economy,city.id,id,quote,now);
          return{
            ...s,
            gold:s.gold+quote.total,
            inventory,
            economy,
            fishing:null,
            farmingWork:null,
            gatheringSession:null,
            log:[...s.log,`Продано: ${def.label} ×${actualQuantity} за ${quote.total.toFixed(2)}.`]
          };
        }catch{
          return{...s,log:[...s.log,'Этот предмет нельзя продать здесь.']};
        }
      });
    },
    sellEquipment(instanceId){
      setState(s=>{
        const now=Date.now();
        const city=cities[s.world.locationId];
        if(!city||s.combat||!canPerformAction(s.injuries,'merchant',now))return s;
        const instance=(s.inventory.equipment??[]).find(entry=>entry.instanceId===instanceId);
        if(!instance)return s;
        try{
          const quote=equipmentSellQuote(
            s.economy,
            city.id,
            instance,
            now,
            s.attributes.charisma
          );
          const inventory={
            stacks:s.inventory.stacks.map(stack=>({...stack})),
            equipment:(s.inventory.equipment??[]).filter(entry=>entry.instanceId!==instanceId)
          };
          const economy=applySellProgress(s.economy,city.id,instance.itemId,quote,now);
          return{
            ...s,
            gold:s.gold+quote.total,
            inventory,
            economy,
            fishing:null,
            farmingWork:null,
            gatheringSession:null,
            log:[...s.log,`Продано: ${itemDefs[instance.itemId]?.label??instance.itemId} за ${quote.total.toFixed(2)}.`]
          };
        }catch{
          return{...s,log:[...s.log,'Эту экипировку нельзя продать здесь.']};
        }
      });
    },
    useInjuryMedicine(tier){
      setState(s=>{
        const result=useInjuryMedicine(s.inventory,s.injuries,tier,Date.now(),Boolean(s.combat),rng.current);
        if(!result.ok)return s;
        return{
          ...s,
          inventory:result.inventory,
          injuries:result.injuries,
          log:[...s.log,'Травмы обработаны лекарством.']
        };
      });
    },
    craft(recipeId,quantity,policy='lowest'){
      setState(s=>{
        const recipe=craftingRecipes[recipeId];
        const city=cities[s.world.locationId];
        if(!recipe||!city?.workshops.includes(recipe.workshop))return s;
        if(s.combat||!canPerformAction(s.injuries,'crafting',Date.now())){
          return{...s,log:[...s.log,'Сейчас нельзя заниматься крафтом.']};
        }
        try{
          const result=craftRecipeBatch({
            state:s.crafting,
            inventory:s.inventory,
            recipe,
            quantity,
            defs:itemDefs,
            propertyPools:equipmentPropertyPools,
            luck:s.attributes.luck,
            rng:rng.current,
            policy
          });
          const rarityText=result.results
            .filter(entry=>entry.rarity)
            .map(entry=>entry.rarity)
            .join(', ');
          return{
            ...s,
            crafting:result.state,
            inventory:result.inventory,
            fishing:null,
            farmingWork:null,
            gatheringSession:null,
            log:[...s.log,`Создано: ${recipe.label} ×${result.results.length}${rarityText?` [${rarityText}]`:''}.`]
          };
        }catch{
          return{...s,log:[...s.log,`Не удалось создать: ${recipe.label}.`]};
        }
      });
    },
    upgradeEquipment(instanceId){
      setState(s=>{
        const instance=(s.inventory.equipment??[]).find(entry=>entry.instanceId===instanceId);
        if(!instance)return s;
        const materialType=equipmentUpgradeMaterialType[instance.itemId];
        const city=cities[s.world.locationId];
        if(!materialType||!city?.workshops.includes('tailor')||s.combat||!canPerformAction(s.injuries,'crafting',Date.now())){
          return{...s,log:[...s.log,'Сейчас улучшение недоступно.']};
        }
        try{
          const result=upgradeEquipment({
            state:s.crafting,
            inventory:s.inventory,
            gold:s.gold,
            instanceId,
            materialType,
            defs:itemDefs,
            propertyPools:equipmentPropertyPools,
            rng:rng.current
          });
          return{
            ...s,
            gold:result.gold,
            inventory:result.inventory,
            log:[...s.log,`Предмет улучшен до +${instance.upgradeLevel+1}.`]
          };
        }catch{
          return{...s,log:[...s.log,'Не хватает золота или материалов для улучшения.']};
        }
      });
    },
    rerollEquipment(instanceId,propertyIndex){
      setState(s=>{
        const instance=(s.inventory.equipment??[]).find(entry=>entry.instanceId===instanceId);
        const city=cities[s.world.locationId];
        if(!instance||!equipmentUpgradeMaterialType[instance.itemId]||!city?.workshops.includes('tailor')||s.combat||!canPerformAction(s.injuries,'crafting',Date.now())){
          return s;
        }
        try{
          const result=rerollEquipment({
            inventory:s.inventory,
            gold:s.gold,
            instanceId,
            propertyIndex,
            defs:itemDefs,
            propertyPools:equipmentPropertyPools,
            rng:rng.current
          });
          return{
            ...s,
            gold:result.gold,
            inventory:result.inventory,
            log:[...s.log,'Свойство предмета переброшено.']
          };
        }catch{
          return{...s,log:[...s.log,'Переброс свойства недоступен.']};
        }
      });
    },
    useCombatConsumable(itemId,itemClass){
      setState(s=>{
        if(!s.combat)return s;
        if(s.combatItemUsedRound===s.combat.round){
          return{...s,log:[...s.log,'В этом раунде предмет уже использован.']};
        }
        const definition=itemDefs[itemId]?.combatUse;
        if(!definition)return s;
        const stack=s.inventory.stacks.find(entry=>
          entry.itemId===itemId
          &&normalizedStackClass(entry)===itemClass
          &&entry.quantity>0
        );
        if(!stack)return s;
        const applied=applyCombatConsumable(s.combat.player,definition,itemClass);
        if(!applied.ok){
          return{...s,log:[...s.log,'Слишком высокая насыщенность зельями.']};
        }
        const inventory=removeInventoryStack(s.inventory,itemId,1,itemClass);
        return{
          ...s,
          combat:{...s.combat,player:applied.combatant},
          combatItemUsedRound:s.combat.round,
          inventory,
          log:[...s.log,`Использовано: ${itemDefs[itemId].label}.`]
        };
      });
    },
    factionAudience(){
      setState(s=>{
        const now=Date.now();
        const city=cities[s.world.locationId];
        const factionId=city?.factionId;
        if(!factionId||s.combat||!canPerformAction(s.injuries,'diplomacy',now))return s;
        const relation=s.economy.factionRelations[factionId]??0;
        try{
          const result=attemptAudience({
            state:s.diplomacy,
            factionId,
            relation,
            charisma:s.attributes.charisma,
            now,
            rng:rng.current
          });
          return{
            ...s,
            diplomacy:result.state,
            economy:{
              ...s.economy,
              factionRelations:{...s.economy.factionRelations,[factionId]:result.relation}
            },
            fishing:null,
            farmingWork:null,
            gatheringSession:null,
            log:[...s.log,result.success
              ?`Аудиенция прошла успешно. Отношения с ${factions[factionId].label}: +1.`
              :'Аудиенция не дала результата.']
          };
        }catch{
          return{...s,log:[...s.log,'Новая аудиенция пока недоступна.']};
        }
      });
    },
    factionMediation(){
      setState(s=>{
        const now=Date.now();
        const city=cities[s.world.locationId];
        const factionId=city?.factionId;
        if(!factionId||s.combat||!canPerformAction(s.injuries,'diplomacy',now))return s;
        const relation=s.economy.factionRelations[factionId]??0;
        try{
          const result=attemptMediation({
            state:s.diplomacy,
            factionId,
            relation,
            charisma:s.attributes.charisma,
            now,
            rng:rng.current
          });
          return{
            ...s,
            diplomacy:result.state,
            economy:{
              ...s.economy,
              factionRelations:{...s.economy.factionRelations,[factionId]:result.relation}
            },
            fishing:null,
            farmingWork:null,
            gatheringSession:null,
            log:[...s.log,result.success
              ?`Медиация удалась. Отношения с ${factions[factionId].label}: +2.`
              :`Медиация провалилась. Отношения с ${factions[factionId].label}: −1.`]
          };
        }catch{
          return{...s,log:[...s.log,'Медиация пока недоступна.']};
        }
      });
    },
    completeFactionRequest(){
      setState(s=>{
        const now=Date.now();
        const city=cities[s.world.locationId];
        const factionId=city?.factionId;
        if(!factionId||s.combat||!canPerformAction(s.injuries,'diplomacy',now))return s;
        const faction=factions[factionId];
        const request=currentFactionRequest(faction,now);
        const relation=s.economy.factionRelations[factionId]??0;
        const stack=s.inventory.stacks.find(entry=>
          entry.itemId===request.itemId
          &&entry.quantity>=request.quantity
        );
        const basePrice=basePrices[request.itemId];
        if(!stack||!basePrice){
          return{...s,log:[...s.log,'Не хватает предметов для фракционного поручения.']};
        }
        try{
          const result=resolveFactionRequest({
            state:s.diplomacy,
            request,
            relation,
            baseItemPrice:basePrice
          });
          const inventory=removeInventoryStack(
            s.inventory,
            request.itemId,
            request.quantity,
            normalizedStackClass(stack)
          );
          return{
            ...s,
            diplomacy:result.state,
            economy:{
              ...s.economy,
              factionRelations:{...s.economy.factionRelations,[factionId]:result.relation}
            },
            inventory,
            gold:s.gold+result.goldReward,
            fishing:null,
            farmingWork:null,
            gatheringSession:null,
            log:[...s.log,`Поручение выполнено: +3 отношения, +${result.goldReward.toFixed(2)} золота.`]
          };
        }catch{
          return{...s,log:[...s.log,'Поручение этого периода уже выполнено.']};
        }
      });
    ,
    startAttributeRetraining(from,to,percent){
      setState(s=>{
        const now=Date.now();
        const city=cities[s.world.locationId];
        if(!city?.university){
          return{...s,log:[...s.log,'В этом городе нет университета.']};
        }
        if(s.level<UNIVERSITY_UNLOCK_LEVEL){
          return{...s,log:[...s.log,`Переобучение доступно с уровня ${UNIVERSITY_UNLOCK_LEVEL}.`]};
        }
        if(s.combat||!canPerformAction(s.injuries,'university',now)){
          return{...s,log:[...s.log,'Сейчас нельзя начать переобучение.']};
        }
        try{
          const university=startRetraining({
            state:s.university,
            attributes:s.attributes,
            level:s.level,
            from,
            to,
            percent,
            now
          });
          return{
            ...s,
            university,
            fishing:null,
            farmingWork:null,
            gatheringSession:null,
            log:[...s.log,`Начато переобучение: ${from} → ${to}, ${percent}% доступной части. Завершение через 1 час.`]
          };
        }catch{
          return{...s,log:[...s.log,'Такое перераспределение сейчас недоступно.']};
        }
      });
    }
  }
  }),[]);

  return <Ctx.Provider value={{state,commands}}>{children}</Ctx.Provider>;
}
export function useGame(){const v=useContext(Ctx);if(!v)throw new Error('GameProvider missing');return v;}
