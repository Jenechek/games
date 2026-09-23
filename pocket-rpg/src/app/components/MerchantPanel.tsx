import { merchantDefinitions } from "../../content/merchants";
import { itemDefinitions } from "../../content/items";
import { useGame } from "../GameProvider";

export function MerchantPanel() {
  const { state, buy, sell } = useGame();
  if (state.world.currentLocationId !== "tillanium") return null;
  const merchant = merchantDefinitions["tillanium-general"];
  return <section className="panel"><h2>{merchant.name}</h2><p>Золото: {state.gold}</p><div className="shop-grid">{merchant.sells.map((id) => <div key={id}><span>{itemDefinitions[id].name} · {itemDefinitions[id].basePrice} баз.</span><button onClick={() => buy(id)}>Купить</button>{itemDefinitions[id].stackable && (state.inventory.stacks[id] ?? 0) > 0 && <button onClick={() => sell(id)}>Продать</button>}</div>)}</div></section>;
}
