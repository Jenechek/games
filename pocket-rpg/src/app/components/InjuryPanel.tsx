import React from 'react';
import { useGame } from '../GameProvider';
import { BODY_ZONES, type BodyZone } from '../../game-core/injuries/types';
import { getInjuryMedicineAvailability, getRecoveryView, type InjuryMedicineTier } from '../game-controller';

const zoneLabels: Record<BodyZone,string> = {
  head:'Голова',
  torso:'Корпус',
  leftArm:'Левая рука',
  rightArm:'Правая рука',
  leftLeg:'Левая нога',
  rightLeg:'Правая нога'
};
const severityLabels = ['', 'лёгкая', 'средняя', 'тяжёлая'];
const tierLabels: Record<InjuryMedicineTier,string> = {
  weak:'Слабое средство',
  medium:'Среднее средство',
  strong:'Сильное средство'
};
const reasonLabels: Record<string,string> = {
  combat:'Недоступно во время боя',
  unconscious:'Недоступно без сознания',
  'forced-rest':'Во время отдыха помогает только сильное средство',
  'no-injuries':'Травм нет',
  'missing-item':'Нет в инвентаре'
};

export function InjuryPanel(){
  const {state,commands}=useGame();
  const now=Date.now();
  const recovery=getRecoveryView(state.injuries,now);
  const injured=BODY_ZONES.filter(zone=>state.injuries.severity[zone]>0);
  const seconds=Math.max(0,Math.ceil(recovery.remainingMs/1000));

  return <section className="injury-panel">
    <h2>Травмы и восстановление</h2>
    {recovery.kind==='unconscious'&&<p className="recovery-alert">Персонаж без сознания. Осталось: {seconds} сек.</p>}
    {recovery.kind==='forced-rest'&&<p className="recovery-alert">Принудительный отдых. Осталось: {seconds} сек.</p>}
    {injured.length===0?<p>Активных травм нет.</p>:<ul>{injured.map(zone=><li key={zone}>{zoneLabels[zone]} — {severityLabels[state.injuries.severity[zone]]}</li>)}</ul>}
    <div className="medicine-grid">
      {(['weak','medium','strong'] as InjuryMedicineTier[]).map(tier=>{
        const availability=getInjuryMedicineAvailability(state.inventory,state.injuries,tier,now,Boolean(state.combat));
        return <div key={tier} className="medicine-row">
          <button disabled={!availability.enabled} onClick={()=>commands.useInjuryMedicine(tier)}>
            {tierLabels[tier]} × {availability.count}
          </button>
          {!availability.enabled&&availability.reason&&<small>{reasonLabels[availability.reason]}</small>}
        </div>;
      })}
    </div>
  </section>;
}
