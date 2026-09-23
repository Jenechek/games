import { useGame } from "../GameProvider";
export function GameLog() { const { state } = useGame(); return <section className="panel log"><h2>Журнал</h2>{state.log.slice(-12).reverse().map((line, index) => <div key={`${index}-${line}`}>{line}</div>)}</section>; }
