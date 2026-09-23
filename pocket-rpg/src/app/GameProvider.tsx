import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createInitialGameState, reconstructState, type GameState } from "../game-core/game-state";
import { SeededRng } from "../game-core/rng";
import { advanceWorldTime, startTravel } from "../game-core/world/travel";
import { carryingCapacity, inventoryMass, overloadRatio } from "../game-core/items/inventory";
import { itemDefinitions } from "../content/items";
import { enemyDefinitions } from "../content/enemies";
import { createCombatant, resolveRound } from "../game-core/combat/resolution";
import { chooseAutoAction } from "../game-core/combat/auto-ai";
import type { CombatAction, CombatStyle } from "../game-core/combat/types";
import { rollLoot, acceptLootItems, victoryXp, type LootResult } from "../game-core/loot/loot";
import { advanceFishing, startFishing as beginFishing, stopFishing as endFishing } from "../game-core/peaceful/fishing";
import { buyItem, sellStack } from "../game-core/economy/merchant";
import { loadGame, saveGame } from "../storage/indexed-db";

export type CombatMode = "auto" | "manual";

interface GameContextValue {
  state: GameState;
  started: boolean;
  combatMode: CombatMode;
  paused: boolean;
  style: CombatStyle;
  styleLocked: boolean;
  intendedAction: CombatAction | null;
  nextRoundAt: number | null;
  pendingLoot: LootResult | null;
  autoPotionAllowed: boolean;
  startGame(): void;
  travelTo(id: string): void;
  startCombat(enemyId: string): void;
  setCombatMode(mode: CombatMode): void;
  setPaused(value: boolean): void;
  setStyle(style: CombatStyle): void;
  setStyleLocked(value: boolean): void;
  resolveManualRound(): void;
  setAutoPotionAllowed(value: boolean): void;
  takeLoot(dropIds: string[]): void;
  discardLoot(): void;
  startFishing(baitId: string): void;
  stopFishing(): void;
  buy(itemId: string, quantity?: number): void;
  sell(itemId: string, quantity?: number): void;
}

const GameContext = createContext<GameContextValue | null>(null);

function bagBonus(state: GameState): number {
  const id = state.inventory.equipped.bag;
  if (!id) return 0;
  const instance = state.inventory.instances.find((item) => item.instanceId === id);
  return instance ? itemDefinitions[instance.definitionId]?.baseStats?.capacity ?? 0 : 0;
}

function playerCombatant(state: GameState) {
  const c = createCombatant("player", state.resources.maxHealth, 6);
  c.health = state.resources.health;
  c.mana = state.resources.mana;
  c.maxMana = state.resources.maxMana;
  c.stamina = state.resources.stamina;
  c.maxStamina = state.resources.maxStamina;
  c.accuracy = Math.min(1, 0.78 + Math.max(0, state.character.attributes.agility - 10) * 0.005);
  c.evasion = 0.05 + Math.max(0, state.character.attributes.agility - 10) * 0.01;
  const mainId = state.inventory.equipped.mainHand;
  const main = state.inventory.instances.find((item) => item.instanceId === mainId);
  if (main) c.baseDamage = itemDefinitions[main.definitionId]?.baseStats?.damage ?? c.baseDamage;
  const shieldId = state.inventory.equipped.offHand;
  const shield = state.inventory.instances.find((item) => item.instanceId === shieldId);
  if (shield) {
    const def = itemDefinitions[shield.definitionId];
    c.hasShield = def?.tags?.includes("shield") ?? false;
    c.shieldFullBlockChance = def?.baseStats?.fullBlock ?? 0;
    if (def?.baseStats?.mitigation) c.physicalMitigation.push(def.baseStats.mitigation);
  }
  const bodyId = state.inventory.equipped.body;
  const body = state.inventory.instances.find((item) => item.instanceId === bodyId);
  if (body) {
    const mitigation = itemDefinitions[body.definitionId]?.baseStats?.mitigation;
    if (mitigation) c.physicalMitigation.push(mitigation);
  }
  c.canParry = !c.hasShield;
  c.parryChance = c.hasShield ? 0 : Math.min(0.35, 0.05 + Math.max(0, state.character.attributes.agility - 10) * 0.005);
  return c;
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(() => createInitialGameState());
  const stateRef = useRef(state);
  const [started, setStarted] = useState(false);
  const [combatMode, setCombatModeState] = useState<CombatMode>("auto");
  const [paused, setPaused] = useState(false);
  const [style, setStyle] = useState<CombatStyle>("balanced");
  const [styleLocked, setStyleLocked] = useState(false);
  const [nextRoundAt, setNextRoundAt] = useState<number | null>(null);
  const [pendingLoot, setPendingLoot] = useState<LootResult | null>(null);
  const [autoPotionAllowed, setAutoPotionAllowed] = useState(true);
  const rngRef = useRef(new SeededRng(0x51f15e));

  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => {
    void loadGame().then((saved) => {
      if (!saved) return;
      const restored = reconstructState(saved, Date.now());
      setState(restored);
      setStarted(true);
    });
  }, []);

  useEffect(() => {
    if (!started) return;
    const handle = window.setTimeout(() => { void saveGame(state); }, 250);
    return () => window.clearTimeout(handle);
  }, [state, started]);

  const intendedAction = useMemo(() => {
    if (!state.combat || combatMode !== "auto") return null;
    return chooseAutoAction(state.combat, "player", new SeededRng(state.combat.round * 7919 + 11)).action;
  }, [state.combat, combatMode]);

  function startGame() {
    setStarted(true);
    void saveGame(stateRef.current);
  }

  function travelTo(destinationId: string) {
    const current = stateRef.current;
    const mass = inventoryMass(current.inventory, itemDefinitions);
    const capacity = carryingCapacity(current.character.attributes.strength, current.character.attributes.vitality, bagBonus(current));
    const ratio = overloadRatio(mass, capacity);
    const world = startTravel(current.world, destinationId, Date.now(), rngRef.current, ratio);
    setState({ ...current, world, mode: "travel", fishing: null, log: [...current.log, `Вы отправились в ${destinationId}.`] });
  }

  function startCombat(enemyId: string) {
    const current = stateRef.current;
    const def = enemyDefinitions[enemyId];
    if (!def || current.world.travel) return;
    const enemy = createCombatant(enemyId, def.maxHealth, def.damage);
    enemy.mana = enemy.maxMana = def.maxMana;
    enemy.stamina = enemy.maxStamina = def.maxStamina;
    enemy.accuracy = def.accuracy;
    enemy.evasion = def.evasion;
    enemy.style = def.style === "magical" ? "balanced" : def.style;
    const combat = { player: playerCombatant(current), enemy, round: 1 };
    setState({ ...current, combat, fishing: null, mode: "combat", log: [...current.log, `Бой: ${def.name}.`] });
    setPaused(false);
    setNextRoundAt(Date.now() + 5000);
  }

  function resolveCombatRound() {
    const current = stateRef.current;
    if (!current.combat) return;
    const autoChoice = chooseAutoAction(current.combat, "player", new SeededRng(current.combat.round * 7919 + 11));
    const enemyChoice = chooseAutoAction(current.combat, "enemy", new SeededRng(current.combat.round * 7919 + 29));
    const playerStyle = styleLocked ? style : combatMode === "auto" ? autoChoice.style : style;
    const playerMain = combatMode === "auto" ? autoChoice.action : { id: "basic-attack", type: "attack" as const, damage: current.combat.player.baseDamage, hitChance: current.combat.player.accuracy };
    let playerAdditional: CombatAction | undefined;
    let inventory = current.inventory;
    if (autoPotionAllowed && current.combat.player.health / current.combat.player.maxHealth < 0.5 && (inventory.stacks["healing-potion"] ?? 0) > 0) {
      playerAdditional = { id: "healing-potion", type: "item", heal: itemDefinitions["healing-potion"].baseStats?.heal ?? 25 };
      inventory = { ...inventory, stacks: { ...inventory.stacks, "healing-potion": inventory.stacks["healing-potion"] - 1 } };
    }
    const outcome = resolveRound(current.combat, {
      playerAdditional,
      playerMain,
      enemyMain: enemyChoice.action,
      playerStyle,
      enemyStyle: enemyChoice.style
    }, rngRef.current);
    let next: GameState = {
      ...current,
      inventory,
      combat: outcome.state,
      resources: {
        ...current.resources,
        health: outcome.state.player.health,
        mana: outcome.state.player.mana,
        stamina: outcome.state.player.stamina
      },
      log: [...current.log, ...outcome.log.map((entry) => entry.message)]
    };
    if (outcome.state.enemy.health <= 0) {
      const def = enemyDefinitions[outcome.state.enemy.id];
      const loot = rollLoot(def, current.character.attributes.luck, rngRef.current);
      next = {
        ...next,
        gold: next.gold + loot.gold,
        combat: null,
        mode: "idle",
        character: { ...next.character, xp: next.character.xp + victoryXp(def.level, next.character.level) },
        log: [...next.log, `Победа. Получено золота: ${loot.gold}.`]
      };
      setPendingLoot(loot);
      setNextRoundAt(null);
    } else if (outcome.state.player.health <= 0) {
      next = { ...next, combat: null, mode: "idle", resources: { ...next.resources, health: 1 }, log: [...next.log, "Вы потеряли сознание и пришли в себя с 1 HP."] };
      setNextRoundAt(null);
    } else {
      setNextRoundAt(Date.now() + 5000);
    }
    setState(next);
  }

  useEffect(() => {
    if (!started) return;
    const timer = window.setInterval(() => {
      const now = Date.now();
      const current = stateRef.current;
      if (current.world.travel) {
        const world = advanceWorldTime(current.world, now);
        if (world !== current.world) setState({ ...current, world, mode: "idle", log: [...current.log, `Вы прибыли: ${world.currentLocationId}.`] });
        return;
      }
      if (current.fishing) {
        const next = advanceFishing(current, now, rngRef.current);
        if (next !== current) setState(next);
        return;
      }
      if (current.combat && combatMode === "auto" && !paused && nextRoundAt !== null && now >= nextRoundAt) resolveCombatRound();
    }, 150);
    return () => window.clearInterval(timer);
  }, [started, combatMode, paused, nextRoundAt, style, styleLocked, autoPotionAllowed]);

  function setCombatMode(mode: CombatMode) { setCombatModeState(mode); }
  function resolveManualRound() { if (combatMode === "manual" && !paused) resolveCombatRound(); }

  function takeLoot(dropIds: string[]) {
    if (!pendingLoot) return;
    setState((current) => ({ ...current, inventory: acceptLootItems(current.inventory, pendingLoot.items, dropIds) }));
    setPendingLoot(null);
  }
  function discardLoot() { setPendingLoot(null); }

  function startFishing(baitId: string) { setState(beginFishing(stateRef.current, baitId, Date.now())); }
  function stopFishing() { setState(endFishing(stateRef.current)); }

  function buy(itemId: string, quantity = 1) {
    const current = stateRef.current;
    const result = buyItem(current, current.market, "tillanium", itemId, quantity, Date.now());
    setState({ ...result.state, market: result.market, log: [...result.state.log, `Покупка: ${itemDefinitions[itemId].name} ×${quantity}.`] });
  }

  function sell(itemId: string, quantity = 1) {
    const current = stateRef.current;
    const result = sellStack(current, current.market, "tillanium", itemId, quantity, Date.now());
    setState({ ...result.state, market: result.market, log: [...result.state.log, `Продажа: ${itemDefinitions[itemId].name} ×${quantity}.`] });
  }

  return <GameContext.Provider value={{ state, started, combatMode, paused, style, styleLocked, intendedAction, nextRoundAt, pendingLoot, autoPotionAllowed, startGame, travelTo, startCombat, setCombatMode, setPaused, setStyle, setStyleLocked, resolveManualRound, setAutoPotionAllowed, takeLoot, discardLoot, startFishing, stopFishing, buy, sell }}>{children}</GameContext.Provider>;
}

export function useGame() {
  const value = useContext(GameContext);
  if (!value) throw new Error("useGame must be used inside GameProvider");
  return value;
}
