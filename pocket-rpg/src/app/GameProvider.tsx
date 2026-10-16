import React,{createContext,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {
  applyHarvestResults,
  canPerformAction,
  canStartFarmingAction,
  canStartFishingWithFarming,
  createNewGame,
  rollFarmingInterruption,
  scaleFarmingAmbushStats,
  tickGame,
  travelCommand,
  useInjuryMedicine,
  type InjuryMedicineTier,
  type UiGameState
} from './game-controller';
import { SeededRng } from '../game-core/rng';
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
import { buyItem, sellItem, type MarketState } from '../game-core/economy/merchant';
import { IndexedDbSaveStore } from '../storage/indexed-db';
import { reconstructState } from '../game-core/game-state';
import { applyDefeatConsequences } from '../game-core/injuries/defeat';
import { injuryPenaltySummary } from '../game-core/injuries/injuries';

interface RuntimeState extends UiGameState {
  inventory:{stacks:{itemId:string;quantity:number}[]};
  fishingXp:number;
  fishing?:FishingState|null;
  farmingWork:FarmingWork|null;
  combat?:CombatState|null;
  combatMode:'auto'|'manual'; paused:boolean; style:CombatStyle;
  loot?:LootResult|null;
  log:string[];
  market:MarketState;
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
  buy(id:string,price:number):void;
  sell(id:string,price:number):void;
  useInjuryMedicine(tier:InjuryMedicineTier):void;
}
const Ctx=createContext<{state:RuntimeState;commands:Commands}|null>(null);

function initial():RuntimeState {
  const g=createNewGame();
  const inventory={stacks:[
    {itemId:'basic-fishing-rod',quantity:1},
    {itemId:'worms',quantity:1},
    {itemId:'healing-potion',quantity:2}
  ]};
  return {
    ...g,
    inventory,
    fishingXp:0,
    fishing:null,
    farmingWork:null,
    combat:null,
    combatMode:'auto',
    paused:false,
    style:'balanced',
    loot:null,
    log:['Вы прибыли в Тилланиум.'],
    market:{gold:g.gold,inventory,pressure:{},pressureUpdatedAt:Date.now()}
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
      style:'balanced'
    },
    enemy:{
      id:e.id,hp:scaled.maxHp,maxHp:scaled.maxHp,
      mana:50,maxMana:50,stamina:100,maxStamina:100,
      stunned:false,shieldBlock:0,parry:0,evasion:.05,accuracy:.75,damage:scaled.damage,style:'balanced'
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
          gold:restored.character.gold,
          world:restored.world,
          inventory:restored.inventory,
          injuries:restored.injuries,
          farming:restored.farming,
          farmingWork:null,
          market:{...s.market,gold:restored.character.gold,inventory:restored.inventory}
        }));
      }
    }).catch(()=>{}).finally(()=>setHydrated(true));
  },[]);

  useEffect(()=>{
    if(!hydrated)return;
    const id=setTimeout(()=>{
      saveStore.current.save({
        character:{level:1,xp:0,gold:state.gold},
        world:state.world,
        inventory:state.inventory,
        injuries:state.injuries,
        farming:state.farming
      }).catch(()=>{});
    },300);
    return()=>clearTimeout(id);
  },[hydrated,state.gold,state.world,state.inventory,state.injuries,state.farming]);

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
          inventory,
          market:{...n.market,inventory}
        };

        if(step.completedCells>0){
          const enemyId=rollFarmingInterruption(agriculture,rng.current);
          if(enemyId){
            n={
              ...n,
              farmingWork:null,
              fishing:null,
              combat:enemyCombat(enemyId,n,true),
              log:[...n.log,'Работу на поле прервал слабый противник.']
            };
            break;
          }
        }
      }

      if(n.fishing && !n.farmingWork && canPerformAction(n.injuries,'fishing',now)){
        const f=advanceFishing(n,now,rng.current,n.world.locationId,n.attributes.luck);
        n={...n,...f};
      }
      return n;
    }),250);
    return()=>clearInterval(id);
  },[]);

  function applyPlayerDefeat(s:RuntimeState):RuntimeState {
    return {
      ...s,
      combat:null,
      fishing:null,
      farmingWork:null,
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
        return{...s,combat:null,loot:l,gold:s.gold+l.gold,log:[...s.log,`Победа. Получено ${l.gold} золота.`]};
      }
      return{...s,combat:r.state,log:[...s.log,`Раунд ${s.combat.round} завершён.`]};
    }),5000);
    return()=>clearInterval(id);
  },[state.combatMode,state.paused,state.combat,state.style]);

  const commands=useMemo<Commands>(()=>({
    travelTo(id){
      setState(s=>{
        if(!canPerformAction(s.injuries,'travel',Date.now()))return{...s,log:[...s.log,'Сейчас нельзя путешествовать: персонаж восстанавливается.']};
        return{...s,...travelCommand(s,id,Date.now(),rng.current),fishing:null,farmingWork:null};
      });
    },
    startEncounter(){
      setState(s=>{
        if(!canPerformAction(s.injuries,'combat',Date.now()))return{...s,log:[...s.log,'Сейчас нельзя вступать в бой: персонаж восстанавливается.']};
        const id=locations[s.world.locationId]?.enemies[0];
        return id?{...s,combat:enemyCombat(id,s),fishing:null,farmingWork:null,log:[...s.log,`Бой: ${enemies[id].label}`]}:s;
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
          return{...s,combat:null,loot:l,gold:s.gold+l.gold,log:[...s.log,`Победа. Получено ${l.gold} золота.`]};
        }
        return{...s,combat:r.state};
      });
    },
    togglePause(){setState(s=>({...s,paused:!s.paused}));},
    setMode(v){setState(s=>({...s,combatMode:v}));},
    setStyle(v){setState(s=>({...s,style:v}));},
    takeLoot(ids){
      setState(s=>{
        if(!s.loot)return s;
        const stacks=[...s.inventory.stacks];
        for(const it of s.loot.items.filter(x=>ids.includes(x.itemId))){
          const ex=stacks.find(x=>x.itemId===it.itemId);
          if(ex)ex.quantity+=it.quantity;else stacks.push({...it});
        }
        const inventory={stacks};
        return{...s,inventory,market:{...s.market,inventory},loot:null};
      });
    },
    startFishingCmd(){
      setState(s=>{
        if(!canPerformAction(s.injuries,'fishing',Date.now()))return{...s,log:[...s.log,'Сейчас нельзя рыбачить: персонаж восстанавливается.']};
        if(!canStartFishingWithFarming(s.farmingWork))return{...s,log:[...s.log,'Сначала остановите работу на поле.']};
        return locations[s.world.locationId]?.fishing?startFishing(s,'worms',Date.now(),1) as RuntimeState:s;
      });
    },
    stopFishingCmd(){setState(s=>stopFishing(s) as RuntimeState);},
    establishField(){
      setState(s=>{
        const location=locations[s.world.locationId];
        if(!location?.agriculture)return s;
        if(!canStartFarmingAction(s.injuries,Boolean(s.combat),Date.now()))return{...s,log:[...s.log,'Сейчас нельзя работать на поле.']};
        if(s.farmingWork)return s;
        try{
          return{
            ...s,
            fishing:null,
            farmingWork:startFieldEstablishment(s.farming,s.world.locationId,Date.now()),
            log:[...s.log,'Начата подготовка нового поля.']
          };
        }catch{return s;}
      });
    },
    plantField(fieldId,cropId){
      setState(s=>{
        if(!canStartFarmingAction(s.injuries,Boolean(s.combat),Date.now())||s.farmingWork)return s;
        const field=s.farming.fields.find(candidate=>candidate.id===fieldId);
        if(!field||field.locationId!==s.world.locationId||!locations[s.world.locationId]?.agriculture)return s;
        try{
          return{
            ...s,
            fishing:null,
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
        if(!canStartFarmingAction(s.injuries,Boolean(s.combat),Date.now())||s.farmingWork)return s;
        const field=s.farming.fields.find(candidate=>candidate.id===fieldId);
        if(!field||field.locationId!==s.world.locationId||!locations[s.world.locationId]?.agriculture)return s;
        try{
          return{
            ...s,
            fishing:null,
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
    buy(id,price){
      setState(s=>{
        if(!canPerformAction(s.injuries,'merchant',Date.now()))return{...s,log:[...s.log,'Сейчас нельзя торговать: персонаж восстанавливается.']};
        try{
          const m=buyItem({...s.market,gold:s.gold,inventory:s.inventory},id,1,Date.now(),price);
          return{...s,gold:m.gold,inventory:m.inventory,market:m,farmingWork:null};
        }catch{return{...s,farmingWork:null};}
      });
    },
    sell(id,price){
      setState(s=>{
        if(!canPerformAction(s.injuries,'merchant',Date.now()))return{...s,log:[...s.log,'Сейчас нельзя торговать: персонаж восстанавливается.']};
        try{
          const m=sellItem({...s.market,gold:s.gold,inventory:s.inventory},id,1,Date.now(),price);
          return{...s,gold:m.gold,inventory:m.inventory,market:m,farmingWork:null};
        }catch{return{...s,farmingWork:null};}
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
          market:{...s.market,inventory:result.inventory},
          log:[...s.log,'Травмы обработаны лекарством.']
        };
      });
    }
  }),[]);

  return <Ctx.Provider value={{state,commands}}>{children}</Ctx.Provider>;
}
export function useGame(){const v=useContext(Ctx);if(!v)throw new Error('GameProvider missing');return v;}
