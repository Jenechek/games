import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanInjuryState } from '../dist/game-core/injuries/injuries.js';
import {
  canPerformAction,
  canStartFarmingAction,
  canStartFishingWithFarming,
  shouldInterruptFarmingWork,
  applyHarvestResults,
  rollFarmingInterruption,
  scaleFarmingAmbushStats
} from '../dist/app/game-controller.js';
import { locations } from '../dist/content/locations.js';

test('recovery locks farming just like other physical activities', () => {
  const injuries=cleanInjuryState();
  assert.equal(canPerformAction(injuries,'farming',1_000),true);
  injuries.unconsciousUntil=10_000;
  assert.equal(canPerformAction(injuries,'farming',1_000),false);
  injuries.unconsciousUntil=null;
  injuries.restUntil=10_000;
  assert.equal(canPerformAction(injuries,'farming',1_000),false);
});

test('fishing cannot start while farming work is active', () => {
  assert.equal(canStartFishingWithFarming(null),true);
  assert.equal(canStartFishingWithFarming({
    type:'establish',
    locationId:'meadow',
    startedAt:0,
    nextAt:30_000
  }),false);
});

test('travel combat and merchant interaction interrupt active farming but inventory does not', () => {
  assert.equal(shouldInterruptFarmingWork('travel'),true);
  assert.equal(shouldInterruptFarmingWork('combat'),true);
  assert.equal(shouldInterruptFarmingWork('merchant'),true);
  assert.equal(shouldInterruptFarmingWork('inventory'),false);
});

test('neutral farmland uses an exact two percent farming interruption roll and safe farmland never ambushes', () => {
  let probability=null;
  const successRng={chance(p){probability=p;return true;}};
  assert.equal(rollFarmingInterruption('safe',successRng),null);
  assert.equal(probability,null);
  assert.equal(rollFarmingInterruption('neutral',successRng),'young-wolf');
  assert.equal(probability,0.02);

  const failRng={chance(){return false;}};
  assert.equal(rollFarmingInterruption('neutral',failRng),null);
});

test('starter world contains safe city farmland and neutral meadow farmland', () => {
  assert.equal(locations['tillanium-fields'].agriculture,'safe');
  assert.equal(locations.meadow.agriculture,'neutral');
  assert.ok(locations['city-gate'].neighbors.includes('tillanium-fields'));
  assert.ok(locations['tillanium-fields'].neighbors.includes('city-gate'));
});

test('harvest results merge into inventory stacks by item id', () => {
  const inventory={stacks:[{itemId:'wheat',quantity:2}]};
  const next=applyHarvestResults(inventory,[
    {cropId:'wheat',itemId:'wheat',quantity:3,rare:false},
    {cropId:'wheat',itemId:'wheat-rare',quantity:2,rare:true}
  ]);
  assert.deepEqual(next.stacks,[
    {itemId:'wheat',quantity:5},
    {itemId:'wheat-rare',quantity:2}
  ]);
});

test('neutral farming ambush enemies are weaker than normal regional enemies', () => {
  assert.deepEqual(scaleFarmingAmbushStats(45,7),{maxHp:32,damage:5});
});


test('farming action guard rejects combat even when injury recovery is clear', () => {
  const injuries=cleanInjuryState();
  assert.equal(canStartFarmingAction(injuries,false,1_000),true);
  assert.equal(canStartFarmingAction(injuries,true,1_000),false);
  injuries.unconsciousUntil=10_000;
  assert.equal(canStartFarmingAction(injuries,false,1_000),false);
});
