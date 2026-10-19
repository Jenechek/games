import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SUMMON_FULL_RECOVERY_MS,
  chooseInterceptor,
  createDefaultSummonRoster,
  prepareSummonsForCombat,
  reconstructSummonRecovery,
  restoreSummonFromClassSkill,
  summonCreature,
  syncSummonsFromCombat
} from '../dist/game-core/summons/summons.js';
import {summonDefinitions} from '../dist/content/summons.js';

test('summon limit replaces the oldest active summon',()=>{
  let roster=createDefaultSummonRoster();
  roster=summonCreature({
    roster,
    definition:summonDefinitions['war-beast'],
    limit:3,
    now:100
  });
  roster=summonCreature({
    roster,
    definition:summonDefinitions['swift-beast'],
    limit:3,
    now:200
  });
  roster=summonCreature({
    roster,
    definition:summonDefinitions['bulwark-beast'],
    limit:3,
    now:300
  });
  roster=summonCreature({
    roster,
    definition:summonDefinitions['war-beast'],
    limit:3,
    now:400
  });
  assert.deepEqual(
    roster.active.map(item=>item.instanceId),
    ['summon-2','summon-3','summon-4']
  );
});

test('generic summon capacity supports one two or three without owning class data',()=>{
  for(const limit of [1,2,3]){
    let roster=createDefaultSummonRoster();
    for(let i=0;i<4;i+=1){
      roster=summonCreature({
        roster,
        definition:summonDefinitions['war-beast'],
        limit,
        now:i*100
      });
    }
    assert.equal(roster.active.length,limit);
  }
});

test('out of combat recovery is continuous and reaches full in ten minutes',()=>{
  let roster=createDefaultSummonRoster();
  roster=summonCreature({
    roster,
    definition:summonDefinitions['war-beast'],
    limit:3,
    now:0
  });
  roster.active[0].hp=14;
  roster.active[0].stamina=20;

  const halfway=reconstructSummonRecovery(
    roster,
    summonDefinitions,
    SUMMON_FULL_RECOVERY_MS/2
  );
  assert.equal(halfway.active[0].hp,49);
  assert.equal(halfway.active[0].stamina,70);

  const full=reconstructSummonRecovery(
    halfway,
    summonDefinitions,
    SUMMON_FULL_RECOVERY_MS
  );
  assert.equal(full.active[0].hp,70);
  assert.equal(full.active[0].stamina,100);
});

test('class-skill restoration is explicit and capped at summon maxima',()=>{
  let roster=createDefaultSummonRoster();
  roster=summonCreature({
    roster,
    definition:summonDefinitions['guardian-elemental'],
    limit:1,
    now:0
  });
  roster.active[0].hp=10;
  roster.active[0].stamina=10;
  const restored=restoreSummonFromClassSkill({
    roster,
    definitions:summonDefinitions,
    instanceId:'summon-1',
    hp:999,
    stamina:999,
    now:100
  });
  assert.equal(restored.active[0].hp,90);
  assert.equal(restored.active[0].stamina,80);
});

test('interception checks living summons from highest current HP',()=>{
  const summons=prepareSummonsForCombat({
    active:[
      {
        instanceId:'summon-1',
        definitionId:'war-beast',
        hp:20,
        stamina:100,
        summonedAt:0,
        recoveryUpdatedAt:0
      },
      {
        instanceId:'summon-2',
        definitionId:'bulwark-beast',
        hp:90,
        stamina:85,
        summonedAt:1,
        recoveryUpdatedAt:1
      }
    ],
    nextInstanceId:3
  },summonDefinitions,10);
  const probabilities=[];
  const interceptor=chooseInterceptor(summons,{
    chance:value=>{
      probabilities.push(value);
      return true;
    }
  });
  assert.equal(interceptor?.instanceId,'summon-2');
  assert.deepEqual(probabilities,[0.35]);
});

test('mage guardian elemental has guaranteed interception',()=>{
  let roster=createDefaultSummonRoster();
  roster=summonCreature({
    roster,
    definition:summonDefinitions['guardian-elemental'],
    limit:1,
    now:0
  });
  const combat=prepareSummonsForCombat(roster,summonDefinitions,0);
  assert.equal(combat[0].interceptChance,1);
  assert.equal(chooseInterceptor(combat,{chance:p=>p>=1})?.instanceId,'summon-1');
});

test('dead summons are removed when combat state is synchronized',()=>{
  let roster=createDefaultSummonRoster();
  roster=summonCreature({
    roster,
    definition:summonDefinitions['guardian-elemental'],
    limit:1,
    now:0
  });
  const combat=prepareSummonsForCombat(roster,summonDefinitions,0);
  combat[0].hp=0;
  const synced=syncSummonsFromCombat(roster,combat,1000);
  assert.equal(synced.active.length,0);
  assert.equal(synced.nextInstanceId,2);
});
