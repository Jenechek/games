import { useState } from "react";
import { itemDefinitions } from "../../content/items";
import { useGame } from "../GameProvider";

export function LootDialog() {
  const { pendingLoot, takeLoot, discardLoot } = useGame();
  const [selected, setSelected] = useState<string[]>([]);
  if (!pendingLoot) return null;
  return <div className="modal"><div className="panel"><h2>Добыча</h2>{pendingLoot.items.length === 0 ? <p>Предметов нет.</p> : pendingLoot.items.map((drop) => <label key={drop.dropId}><input type="checkbox" checked={selected.includes(drop.dropId)} onChange={(e) => setSelected((old) => e.target.checked ? [...old, drop.dropId] : old.filter((id) => id !== drop.dropId))} /> {itemDefinitions[drop.itemId]?.name ?? drop.itemId}</label>)}<div className="button-row"><button onClick={() => takeLoot(selected)}>Забрать выбранное</button><button onClick={discardLoot}>Закрыть</button></div></div></div>;
}
