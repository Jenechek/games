import { useGame } from "../GameProvider";

const names: Record<string, string> = {
  strength: "Сила", agility: "Ловкость", intuition: "Интуиция", vitality: "Живучесть",
  wisdom: "Мудрость", luck: "Удача", charisma: "Харизма", intelligence: "Интеллект"
};

export function CharacterPanel() {
  const { state } = useGame();
  return <section className="panel"><h2>Персонаж</h2><p>Уровень: {state.character.level} · XP: {state.character.xp.toFixed(1)}</p><p>HP {state.resources.health.toFixed(0)}/{state.resources.maxHealth} · MP {state.resources.mana.toFixed(0)}/{state.resources.maxMana} · Выносливость {state.resources.stamina.toFixed(0)}/{state.resources.maxStamina}</p><div className="stats">{Object.entries(state.character.attributes).map(([id, value]) => <span key={id}>{names[id]}: {value}</span>)}</div><details><summary>Навыки</summary>{Object.entries(state.skills).map(([id, skill]) => <div key={id}>{id}: {skill.level} ({skill.xp.toFixed(1)} XP)</div>)}</details></section>;
}
