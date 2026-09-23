import type { CombatStyle } from "../../game-core/combat/types";
import { useGame } from "../GameProvider";

const styles: CombatStyle[] = ["balanced", "aggressive", "defensive", "parrying", "evasive"];

export function CombatPanel() {
  const game = useGame();
  const combat = game.state.combat;
  if (!combat) return null;
  return <section className="panel combat"><h2>Бой · раунд {combat.round}</h2><p>Вы: {combat.player.health.toFixed(0)} HP · Противник: {combat.enemy.health.toFixed(0)} HP</p><p>Намерение автобоя: {game.intendedAction?.id ?? "ручной выбор"}</p><div className="button-row"><button onClick={() => game.setCombatMode("auto")} disabled={game.combatMode === "auto"}>Авто</button><button onClick={() => game.setCombatMode("manual")} disabled={game.combatMode === "manual"}>Ручной</button><button onClick={() => game.setPaused(!game.paused)}>{game.paused ? "Продолжить" : "Пауза"}</button></div><label>Стиль <select value={game.style} onChange={(e) => game.setStyle(e.target.value as CombatStyle)}>{styles.map((style) => <option key={style}>{style}</option>)}</select></label><label><input type="checkbox" checked={game.styleLocked} onChange={(e) => game.setStyleLocked(e.target.checked)} /> зафиксировать стиль</label><label><input type="checkbox" checked={game.autoPotionAllowed} onChange={(e) => game.setAutoPotionAllowed(e.target.checked)} /> разрешить лечебное зелье автобою</label>{game.combatMode === "manual" && <button onClick={game.resolveManualRound}>Выполнить обычную атаку</button>}{game.combatMode === "auto" && game.nextRoundAt && <p>Следующий расчёт через ≤5 секунд.</p>}</section>;
}
