import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RETRAINING_DURATION_MS,
  UNIVERSITY_UNLOCK_LEVEL,
  balancedAttributesForLegacyLevel,
  createDefaultUniversityState,
  mandatoryAttributeBaseline,
  retrainingPreview,
  resolveRetraining,
  startRetraining,
  totalSpecializationPoints
} from '../dist/game-core/university/retraining.js';

function level10Attributes(){
  const attributes=balancedAttributesForLegacyLevel(10);
  attributes.strength+=20;
  attributes.agility-=7;
  attributes.intuition-=7;
  attributes.vitality-=6;
  return attributes;
}

test('university unlocks at level ten and retraining lasts one real hour',()=>{
  const attributes=level10Attributes();
  assert.equal(UNIVERSITY_UNLOCK_LEVEL,10);
  assert.throws(()=>startRetraining({
    state:createDefaultUniversityState(),
    attributes,
    level:9,
    from:'strength',
    to:'agility',
    percent:50,
    now:1000
  }),/locked/);

  const started=startRetraining({
    state:createDefaultUniversityState(),
    attributes,
    level:10,
    from:'strength',
    to:'agility',
    percent:50,
    now:1000
  });
  assert.equal(started.pending?.completesAt,1000+RETRAINING_DURATION_MS);
});

test('mandatory plus-one-per-level baseline cannot be retrained',()=>{
  assert.equal(mandatoryAttributeBaseline(1),10);
  assert.equal(mandatoryAttributeBaseline(10),19);
  const attributes=balancedAttributesForLegacyLevel(10);
  const total=totalSpecializationPoints(attributes,10);
  assert.equal(total,63);
});

test('preview protects twenty percent and five percent total floor',()=>{
  const attributes=level10Attributes();
  const preview=retrainingPreview({
    attributes,
    level:10,
    from:'strength',
    percent:100
  });
  assert.ok(preview.protectedByTwentyPercent>0);
  assert.equal(preview.fivePercentFloor,Math.round(preview.totalSpecialization*0.05*100)/100);
  const remaining=preview.donorSpecialization-preview.amount;
  assert.ok(remaining+1e-9>=preview.protectedByTwentyPercent);
  assert.ok(remaining+1e-9>=preview.fivePercentFloor);
});

test('donor-based percent applies to the transferable portion',()=>{
  const attributes=level10Attributes();
  const full=retrainingPreview({attributes,level:10,from:'strength',percent:100});
  const half=retrainingPreview({attributes,level:10,from:'strength',percent:50});
  assert.equal(half.amount,Math.round(full.transferable*0.5*100)/100);
});

test('completion preserves total attributes and applies only after one hour',()=>{
  const attributes=level10Attributes();
  const beforeTotal=Object.values(attributes).reduce((sum,value)=>sum+value,0);
  const state=startRetraining({
    state:createDefaultUniversityState(),
    attributes,
    level:10,
    from:'strength',
    to:'charisma',
    percent:75,
    now:5000
  });

  const early=resolveRetraining({
    state,
    attributes,
    now:5000+RETRAINING_DURATION_MS-1
  });
  assert.equal(early.completed,false);
  assert.deepEqual(early.attributes,attributes);

  const done=resolveRetraining({
    state,
    attributes,
    now:5000+RETRAINING_DURATION_MS
  });
  assert.equal(done.completed,true);
  assert.equal(done.state.pending,null);
  assert.ok(done.attributes.strength<attributes.strength);
  assert.ok(done.attributes.charisma>attributes.charisma);
  const afterTotal=Object.values(done.attributes).reduce((sum,value)=>sum+value,0);
  assert.ok(Math.abs(afterTotal-beforeTotal)<1e-9);
});

test('only one retraining can be active and same-attribute transfers are rejected',()=>{
  const attributes=level10Attributes();
  const started=startRetraining({
    state:createDefaultUniversityState(),
    attributes,
    level:10,
    from:'strength',
    to:'agility',
    percent:25,
    now:0
  });
  assert.throws(()=>startRetraining({
    state:started,
    attributes,
    level:10,
    from:'strength',
    to:'wisdom',
    percent:25,
    now:1
  }),/already active/);
  assert.throws(()=>startRetraining({
    state:createDefaultUniversityState(),
    attributes,
    level:10,
    from:'strength',
    to:'strength',
    percent:25,
    now:0
  }),/same attribute/);
});

test('legacy attribute reconstruction keeps exact progression total',()=>{
  for(const level of [1,2,10,25]){
    const attributes=balancedAttributesForLegacyLevel(level);
    const total=Object.values(attributes).reduce((sum,value)=>sum+value,0);
    assert.equal(total,80+(level-1)*15);
    assert.equal(totalSpecializationPoints(attributes,level),(level-1)*7);
  }
});
