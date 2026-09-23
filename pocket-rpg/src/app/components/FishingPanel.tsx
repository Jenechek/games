import { locationDefinitions } from "../../content/locations";
import { useGame } from "../GameProvider";

export function FishingPanel() {
  const { state, startFishing, stopFishing } = useGame();
  const location = locationDefinitions[state.world.currentLocationId];
  if (!location.fishPool.length && !state.fishing) return null;
  return <section className="panel"><h2>Рыбалка</h2>{state.fishing ? <><p>Рыбалка идёт автоматически.</p><button onClick={stopFishing}>Остановить</button></> : <div className="button-row"><button onClick={() => startFishing("bread-bait")}>Хлебная наживка</button><button onClick={() => startFishing("worm-bait")}>Червь</button></div>}</section>;
}
