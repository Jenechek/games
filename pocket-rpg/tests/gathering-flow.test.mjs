import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanInjuryState } from '../dist/game-core/injuries/injuries.js';
import {
  currentLoadRatio,
  canStartGatheringAction,
  canStartFishingAction,
  gatheringStartReason,
  shouldInterruptGathering,
  applyGatheringResults
} from '../dist/app/game-controller.js';

test('current load ratio uses real inventory mass and carrying capacity',()=>{
  const attributes={strength:10,vitality:10};
  const below={stacks:[{itemId:'healing-potion',quantity:199}]};
  const exact={stacks:[{itemId:'healing-potion',quantity:200}]};
  assert.equal(currentLoadRatio(below,attributes),59.7/50);
  assert.equal(currentLoadRatio(exact,attributes),1.2);
});

test('gathering start guard blocks recovery combat farming and exact 120 percent overload',()=>{
  const injuries=cleanInjuryState();
  assert.equal(canStartGatheringAction(injuries,false,false,1.199,1_000),true);
  assert.equal(canStartGatheringAction(injuries,false,false,1.2,1_000),false);
  assert.equal(canStartGatheringAction(injuries,true,false,1,1_000),false);
  assert.equal(canStartGatheringAction(injuries,false,true,1,1_000),false);

  injuries.unconsciousUntil=10_000;
  assert.equal(canStartGatheringAction(injuries,false,false,1,1_000),false);
  injuries.unconsciousUntil=null;
  injuries.restUntil=10_000;
  assert.equal(canStartGatheringAction(injuries,false,false,1,1_000),false);
});

test('all incompatible activities interrupt gathering while inventory viewing does not',()=>{
  for(const action of ['travel','combat','merchant','farming','fishing']){
    assert.equal(shouldInterruptGathering(action),true);
  }
  assert.equal(shouldInterruptGathering('inventory'),false);
});

test('gathering results merge ordinary and rare stacks into inventory',()=>{
  const inventory={stacks:[{itemId:'wild-herb',quantity:2}]};
  const next=applyGatheringResults(inventory,[
    {resourceId:'wild-herb',itemId:'wild-herb',quantity:3,rare:false},
    {resourceId:'wild-herb',itemId:'wild-herb-rare',quantity:1,rare:true}
  ]);
  assert.deepEqual(next.stacks,[
    {itemId:'wild-herb',quantity:5},
    {itemId:'wild-herb-rare',quantity:1,itemClass:2}
  ]);
});


test('gathering start reason exposes one controller-owned UI explanation',()=>{
  const injuries=cleanInjuryState();
  assert.equal(gatheringStartReason(injuries,false,false,1,1000),null);
  assert.equal(gatheringStartReason(injuries,true,false,1,1000),'combat');
  assert.equal(gatheringStartReason(injuries,false,true,1,1000),'farming');
  assert.equal(gatheringStartReason(injuries,false,false,1.2,1000),'overload');
  injuries.unconsciousUntil=10_000;
  assert.equal(gatheringStartReason(injuries,false,false,1,1000),'recovery');
});

test('fishing action guard blocks combat farming recovery and 120 percent overload',()=>{
  const injuries=cleanInjuryState();
  assert.equal(canStartFishingAction(injuries,false,false,1.199,1000),true);
  assert.equal(canStartFishingAction(injuries,true,false,1,1000),false);
  assert.equal(canStartFishingAction(injuries,false,true,1,1000),false);
  assert.equal(canStartFishingAction(injuries,false,false,1.2,1000),false);
  injuries.unconsciousUntil=10000;
  assert.equal(canStartFishingAction(injuries,false,false,1,1000),false);
});
