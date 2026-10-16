import test from 'node:test';
import assert from 'node:assert/strict';
import { SeededRng } from '../dist/game-core/rng.js';
import { cleanInjuryState } from '../dist/game-core/injuries/injuries.js';
import { canPerformAction, useInjuryMedicine, getRecoveryView, getInjuryMedicineAvailability } from '../dist/app/game-controller.js';

test('recovery locks travel combat fishing and merchant but not inventory', () => {
  const injuries = cleanInjuryState();
  injuries.unconsciousUntil = 20_000;
  for (const action of ['travel','combat','fishing','merchant']) {
    assert.equal(canPerformAction(injuries, action, 10_000), false);
  }
  assert.equal(canPerformAction(injuries, 'inventory', 10_000), true);

  injuries.unconsciousUntil = null;
  injuries.restUntil = 50_000;
  for (const action of ['travel','combat','fishing','merchant']) {
    assert.equal(canPerformAction(injuries, action, 10_000), false);
  }
  assert.equal(canPerformAction(injuries, 'inventory', 10_000), true);
});

test('weak medicine heals two levels and consumes one item only on success', () => {
  const injuries = cleanInjuryState();
  injuries.severity.head = 2;
  injuries.severity.torso = 1;
  const inventory = {stacks:[{itemId:'weak-injury-medicine',quantity:2}]};
  const result = useInjuryMedicine(inventory, injuries, 'weak', 1000, false, new SeededRng(1));
  assert.equal(result.ok, true);
  assert.equal(result.inventory.stacks[0].quantity, 1);
  const total = Object.values(result.injuries.severity).reduce((a,b)=>a+b,0);
  assert.equal(total, 1);

  const clean = useInjuryMedicine(inventory, cleanInjuryState(), 'weak', 1000, false, new SeededRng(1));
  assert.equal(clean.ok, false);
  assert.deepEqual(clean.inventory, inventory);
});

test('medicine is rejected while unconscious or in combat without consumption', () => {
  const injuries = cleanInjuryState();
  injuries.severity.head = 2;
  injuries.unconsciousUntil = 20_000;
  const inventory = {stacks:[{itemId:'medium-injury-medicine',quantity:1}]};
  const unconscious = useInjuryMedicine(inventory, injuries, 'medium', 10_000, false, new SeededRng(2));
  assert.equal(unconscious.ok, false);
  assert.deepEqual(unconscious.inventory, inventory);

  injuries.unconsciousUntil = null;
  const combat = useInjuryMedicine(inventory, injuries, 'medium', 10_000, true, new SeededRng(2));
  assert.equal(combat.ok, false);
  assert.deepEqual(combat.inventory, inventory);
});

test('weak and medium are rejected during forced rest, strong heals all and cancels rest', () => {
  const injuries = cleanInjuryState();
  injuries.severity.head = 3;
  injuries.severity.torso = 2;
  injuries.restUntil = 100_000;
  const inventory = {stacks:[
    {itemId:'weak-injury-medicine',quantity:1},
    {itemId:'medium-injury-medicine',quantity:1},
    {itemId:'strong-injury-medicine',quantity:1}
  ]};

  for (const tier of ['weak','medium']) {
    const blocked = useInjuryMedicine(inventory, injuries, tier, 50_000, false, new SeededRng(3));
    assert.equal(blocked.ok, false);
  }

  const strong = useInjuryMedicine(inventory, injuries, 'strong', 50_000, false, new SeededRng(3));
  assert.equal(strong.ok, true);
  assert.equal(strong.injuries.restUntil, null);
  assert.equal(Object.values(strong.injuries.severity).reduce((a,b)=>a+b,0), 0);
  assert.equal(strong.inventory.stacks.find(x=>x.itemId==='strong-injury-medicine'), undefined);
});


test('recovery view reports unconscious, forced rest, and ready states with remaining time', () => {
  const injuries = cleanInjuryState();
  injuries.unconsciousUntil = 20_000;
  injuries.restUntil = 80_000;
  assert.deepEqual(getRecoveryView(injuries, 10_000), {kind:'unconscious',remainingMs:10_000});
  assert.deepEqual(getRecoveryView(injuries, 30_000), {kind:'forced-rest',remainingMs:50_000});
  assert.deepEqual(getRecoveryView(injuries, 90_000), {kind:'ready',remainingMs:0});
});

test('medicine availability gives count and disabled reason without duplicating rules in React', () => {
  const injuries = cleanInjuryState();
  injuries.severity.head = 1;
  const inventory = {stacks:[
    {itemId:'weak-injury-medicine',quantity:2},
    {itemId:'strong-injury-medicine',quantity:1}
  ]};

  injuries.unconsciousUntil = 20_000;
  assert.deepEqual(
    getInjuryMedicineAvailability(inventory, injuries, 'weak', 10_000, false),
    {count:2,enabled:false,reason:'unconscious'}
  );

  injuries.unconsciousUntil = null;
  injuries.restUntil = 50_000;
  assert.deepEqual(
    getInjuryMedicineAvailability(inventory, injuries, 'weak', 10_000, false),
    {count:2,enabled:false,reason:'forced-rest'}
  );
  assert.deepEqual(
    getInjuryMedicineAvailability(inventory, injuries, 'strong', 10_000, false),
    {count:1,enabled:true,reason:null}
  );

  injuries.restUntil = null;
  assert.deepEqual(
    getInjuryMedicineAvailability(inventory, injuries, 'medium', 10_000, false),
    {count:0,enabled:false,reason:'missing-item'}
  );
});
