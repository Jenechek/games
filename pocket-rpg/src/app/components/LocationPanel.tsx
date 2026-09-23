import { locationDefinitions } from "../../content/locations";
import { enemyDefinitions } from "../../content/enemies";
import { useGame } from "../GameProvider";

export function LocationPanel() {
  const { state, travelTo, startCombat } = useGame();
  const location = locationDefinitions[state.world.currentLocationId];
  return <section className="panel"><h2>{location.name}</h2>{state.world.travel ? <p>Переход выполняется…</p> : <><div className="button-row">{location.connections.map((id) => <button key={id} onClick={() => travelTo(id)}>Перейти: {locationDefinitions[id].name}</button>)}</div>{location.monsterPool.length > 0 && <div><h3>Противники</h3><div className="button-row">{location.monsterPool.map((id) => <button key={id} onClick={() => startCombat(id)}>Сразиться: {enemyDefinitions[id].name}</button>)}</div></div>}</>}</section>;
}
