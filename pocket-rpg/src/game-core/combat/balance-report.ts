export interface BattleSample {
  classId:string;
  enemyId:string;
  won:boolean;
  rounds:number;
  remainingHp:number;
  skillsUsed:number;
  staminaSpent:number;
}
export interface BalanceRow {
  classId:string;
  enemyId:string;
  battles:number;
  winRate:number;
  avgRounds:number;
  avgRemainingHp:number;
  avgSkillsUsed:number;
  avgStaminaSpent:number;
}
export function summarizeBalance(samples:readonly BattleSample[]):BalanceRow[]{
  const groups=new Map<string,BattleSample[]>();
  for(const sample of samples){
    if(!Number.isFinite(sample.rounds)||sample.rounds<1||
       !Number.isFinite(sample.remainingHp)||sample.remainingHp<0||
       !Number.isFinite(sample.skillsUsed)||sample.skillsUsed<0||
       !Number.isFinite(sample.staminaSpent)||sample.staminaSpent<0)
      throw new Error('invalid combat balance sample');
    const key=JSON.stringify([sample.classId,sample.enemyId]);
    groups.set(key,[...(groups.get(key)??[]),sample]);
  }
  return [...groups.values()].map(group=>{
    const n=group.length;
    const avg=(pick:(sample:BattleSample)=>number)=>group.reduce((sum,s)=>sum+pick(s),0)/n;
    return {classId:group[0].classId,enemyId:group[0].enemyId,
      battles:n,winRate:avg(s=>Number(s.won)),
      avgRounds:avg(s=>s.rounds),avgRemainingHp:avg(s=>s.remainingHp),
      avgSkillsUsed:avg(s=>s.skillsUsed),avgStaminaSpent:avg(s=>s.staminaSpent)};
  }).sort((a,b)=>a.classId.localeCompare(b.classId)||a.enemyId.localeCompare(b.enemyId));
}
export function balanceOutliers(rows:readonly BalanceRow[],minSamples=12):string[]{
 const warnings:string[]=[];
 for(const row of rows){
  if(row.battles<minSamples)continue;
  if(row.winRate===0)warnings.push(`${row.classId}/${row.enemyId}: no wins`);
  if(row.winRate===1)warnings.push(`${row.classId}/${row.enemyId}: all wins`);
 }
 return warnings;
}
