import React,{createContext,useContext,useEffect,useMemo,useRef,useState} from 'react';
import { createNewGame, tickGame, travelCommand, type UiGameState } from './game-controller';
import { SeededRng } from '../game-core/rng';
import { locations } from '../content/locations';
import { enemies } from '../content/enemies';
import { resolveRound } from '../game-core/combat/resolution';
import { chooseAutoAction } from '../game-core/combat/auto-ai';
import type { CombatState, CombatStyle } from '../game-core/combat/types';
import { rollLoot, type LootResult } from '../game-core/loot/loot';
import { startFishing, advanceFishing, stopFishing, type FishingState } from '../game-core/peaceful/fishing';
import { buyItem, sellItem, type MarketState } from '../game-core/economy/merchant';

interface RuntimeState extends UiGameState {
  inventory:{stacks:{itemId:string;quantity:number}[]};
  fishingXp:number; fishing?:FishingState|null; combat?:CombatState|null;
  combatMode:'auto'|'manual'; paused:boolean; style:CombatStyle; loot?:LootResult|null;
  log:string[]; market:MarketState;
}
interface Commands {travelTo(id:string):void;startEncounter():void;manualAttack():void;togglePause():void;setMode(v:'auto'|'manual'):void;setStyle(v:CombatStyle):void;takeLoot(ids:string[]):void;startFishingCmd():void;stopFishingCmd():void;buy(id:string,price:number):void;sell(id:string,price:number):void;}
const Ctx=createContext<{state:RuntimeState;commands:Commands}|null>(null);
function initial():RuntimeState {const g=createNewGame(); const inventory={stacks:[{itemId:'basic-fishing-rod',quantity:1},{itemId:'worms',quantity:1},{itemId:'healing-potion',quantity:2}]}; return {...g,inventory,fishingXp:0,fishing:null,combat:null,combatMode:'auto',paused:false,style:'balanced',loot:null,log:['Вы прибыли в Тилланиум.'],market:{gold:g.gold,inventory,pressure:{},pressureUpdatedAt:Date.now()}};}
function enemyCombat(id:string):CombatState { const e=enemies[id]; return {round:1,player:{id:'player',hp:100,maxHp:100,mana:100,maxMana:100,stamina:100,maxStamina:100,stunned:false,shieldBlock:0,parry:.1,evasion:.08,accuracy:.85,damage:18,style:'balanced'},enemy:{id:e.id,hp:e.maxHp,maxHp:e.maxHp,mana:50,maxMana:50,stamina:100,maxStamina:100,stunned:false,shieldBlock:0,parry:0,evasion:.05,accuracy:.75,damage:e.damage,style:'balanced'}};}
export function GameProvider({children}:{children:React.ReactNode}){const [state,setState]=useState<RuntimeState>(initial); const rng=useRef(new SeededRng(1234567));
 useEffect(()=>{const id=setInterval(()=>setState(s=>{let n:any={...s,...tickGame(s,Date.now())}; if(n.fishing){const f=advanceFishing(n,Date.now(),rng.current,n.world.locationId,n.attributes.luck); n={...n,...f};} return n;}),250);return()=>clearInterval(id);},[]);
 useEffect(()=>{if(state.combatMode!=='auto'||state.paused||!state.combat)return; const id=setInterval(()=>setState(s=>{if(!s.combat||s.paused||s.combatMode!=='auto')return s;const pc=chooseAutoAction(s.combat,'player',rng.current);pc.style=s.style;const ec=chooseAutoAction(s.combat,'enemy',rng.current);const r=resolveRound(s.combat,{player:pc,enemy:ec},rng.current);if(r.state.enemy.hp<=0){const l=rollLoot({gold:[3,10],drops:[{itemId:'iron-short-sword',chance:.15}]},{luck:s.attributes.luck},rng.current);return{...s,combat:null,loot:l,gold:s.gold+l.gold,log:[...s.log,`Победа. Получено ${l.gold} золота.`]};}return{...s,combat:r.state,log:[...s.log,`Раунд ${s.combat.round} завершён.`]};}),5000);return()=>clearInterval(id);},[state.combatMode,state.paused,state.combat,state.style]);
 const commands=useMemo<Commands>(()=>({travelTo(id){setState(s=>({...s,...travelCommand(s,id,Date.now(),rng.current),fishing:null}));},startEncounter(){setState(s=>{const id=locations[s.world.locationId]?.enemies[0];return id?{...s,combat:enemyCombat(id),fishing:null,log:[...s.log,`Бой: ${enemies[id].label}`]}:s;});},manualAttack(){setState(s=>{if(!s.combat)return s;const ec=chooseAutoAction(s.combat,'enemy',rng.current);const r=resolveRound(s.combat,{player:{main:{type:'attack'},style:s.style},enemy:ec},rng.current);return{...s,combat:r.state.enemy.hp<=0?null:r.state};});},togglePause(){setState(s=>({...s,paused:!s.paused}));},setMode(v){setState(s=>({...s,combatMode:v}));},setStyle(v){setState(s=>({...s,style:v}));},takeLoot(ids){setState(s=>{if(!s.loot)return s;const stacks=[...s.inventory.stacks];for(const it of s.loot.items.filter(x=>ids.includes(x.itemId))){const ex=stacks.find(x=>x.itemId===it.itemId);if(ex)ex.quantity+=it.quantity;else stacks.push({...it});}return{...s,inventory:{stacks},loot:null};});},startFishingCmd(){setState(s=>locations[s.world.locationId]?.fishing?startFishing(s,'worms',Date.now(),1) as RuntimeState:s);},stopFishingCmd(){setState(s=>stopFishing(s) as RuntimeState);},buy(id,price){setState(s=>{const m=buyItem({...s.market,gold:s.gold,inventory:s.inventory},id,1,Date.now(),price);return{...s,gold:m.gold,inventory:m.inventory,market:m};});},sell(id,price){setState(s=>{try{const m=sellItem({...s.market,gold:s.gold,inventory:s.inventory},id,1,Date.now(),price);return{...s,gold:m.gold,inventory:m.inventory,market:m};}catch{return s;}});}}),[]);
 return <Ctx.Provider value={{state,commands}}>{children}</Ctx.Provider>;
}
export function useGame(){const v=useContext(Ctx);if(!v)throw new Error('GameProvider missing');return v;}
