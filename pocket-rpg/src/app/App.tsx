import { GameProvider, useGame } from "./GameProvider";
import { CharacterPanel } from "./components/CharacterPanel";
import { CombatPanel } from "./components/CombatPanel";
import { FishingPanel } from "./components/FishingPanel";
import { GameLog } from "./components/GameLog";
import { InventoryPanel } from "./components/InventoryPanel";
import { LocationPanel } from "./components/LocationPanel";
import { LootDialog } from "./components/LootDialog";
import { MerchantPanel } from "./components/MerchantPanel";

function GameScreen() {
  const { started, startGame } = useGame();
  if (!started) return <main className="start-screen"><h1>Pocket RPG</h1><p>Текстовая RPG по мотивам Pocket Combats.</p><button className="primary" onClick={startGame}>Начать игру</button></main>;
  return <main className="app-shell"><header><h1>Pocket RPG</h1><p>Первая игровая вертикаль</p></header><div className="layout"><div><CharacterPanel /><LocationPanel /><CombatPanel /><FishingPanel /><MerchantPanel /></div><div><InventoryPanel /><GameLog /></div></div><LootDialog /></main>;
}

export function App() { return <GameProvider><GameScreen /></GameProvider>; }
