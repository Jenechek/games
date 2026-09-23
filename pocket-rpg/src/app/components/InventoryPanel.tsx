import { itemDefinitions } from "../../content/items";
import { carryingCapacity, inventoryMass } from "../../game-core/items/inventory";
import { useGame } from "../GameProvider";

export function InventoryPanel() {
  const { state } = useGame();
  const mass = inventoryMass(state.inventory, itemDefinitions);
  const capacity = carryingCapacity(state.character.attributes.strength, state.character.attributes.vitality, 0);
  return <section className="panel"><h2>Инвентарь</h2><p>Масса: {mass.toFixed(1)} / {capacity.toFixed(1)} кг</p>{Object.entries(state.inventory.stacks).filter(([, q]) => q > 0).map(([id, quantity]) => <div key={id}>{itemDefinitions[id]?.name ?? id}: {quantity}</div>)}{state.inventory.instances.map((item) => <div key={item.instanceId}>{itemDefinitions[item.definitionId]?.name ?? item.definitionId}</div>)}</section>;
}
