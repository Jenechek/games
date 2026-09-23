export function combineDiminishingPercentages(values:number[]):number { return 1-values.reduce((remaining,value)=>remaining*(1-Math.max(0,Math.min(.999999,value))),1); }
export function cappedChance(raw:number, normalCap:number, matchingStyle:boolean):number { const cap=Math.min(1,normalCap+(matchingStyle?.2:0)); return Math.max(0,Math.min(raw,cap)); }
export function effectiveEvasion(rawEvasion:number, attackerAccuracy:number):number { const raw=Math.min(.9,Math.max(0,rawEvasion)); const accuracy=Math.max(0,Math.min(1,attackerAccuracy)); return Math.min(.9,raw*(1-0.65*accuracy)); }
export function physicalMitigationAfterPenetration(mitigation:number,penetration:number):number { return Math.max(0,mitigation*(1-Math.max(0,Math.min(1,penetration)))); }
