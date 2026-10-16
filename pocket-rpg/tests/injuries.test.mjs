import test from 'node:test';
import assert from 'node:assert/strict';
import { SeededRng } from '../dist/game-core/rng.js';
import {
  cleanInjuryState,
  applyInjuryRoll,
  applyInjuryRolls,
  healInjuries,
  clearAllInjuries,
  injuryPenaltySummary
} from '../dist/game-core/injuries/injuries.js';

test('ordinary injury roll adds exactly one severity level', () => {
  const before = cleanInjuryState();
  const after = applyInjuryRoll(before, new SeededRng(1));
  const total = Object.values(after.severity).reduce((sum, value) => sum + value, 0);
  assert.equal(total, 1);
});

test('repeated hit escalates the same zone and severity never exceeds 3', () => {
  const state = cleanInjuryState();
  state.severity.head = 2;
  state.severity.torso = 3;
  state.severity.leftArm = 3;
  state.severity.rightArm = 3;
  state.severity.leftLeg = 3;
  state.severity.rightLeg = 3;
  const once = applyInjuryRoll(state, new SeededRng(1));
  assert.equal(once.severity.head, 3);
  const twice = applyInjuryRoll(once, new SeededRng(1));
  assert.equal(twice.severity.head, 3);
});

test('severity-3 zones are excluded from selection', () => {
  const state = cleanInjuryState();
  state.severity.head = 3;
  state.severity.torso = 3;
  state.severity.leftArm = 3;
  state.severity.rightArm = 3;
  state.severity.leftLeg = 3;
  const after = applyInjuryRoll(state, new SeededRng(7));
  assert.equal(after.severity.rightLeg, 1);
});

test('all-severe state terminates safely and stays unchanged', () => {
  const state = cleanInjuryState();
  for (const key of Object.keys(state.severity)) state.severity[key] = 3;
  const after = applyInjuryRoll(state, new SeededRng(9));
  assert.deepEqual(after, state);
});

test('three injury rolls apply exactly three sequential increments when eligible', () => {
  const before = cleanInjuryState();
  const after = applyInjuryRolls(before, 3, new SeededRng(5));
  const total = Object.values(after.severity).reduce((sum, value) => sum + value, 0);
  assert.equal(total, 3);
});

test('weak and medium healing remove exactly 2 and 4 severity levels when available', () => {
  const base = cleanInjuryState();
  base.severity.head = 2;
  base.severity.torso = 2;
  base.severity.leftArm = 2;
  const weak = healInjuries(base, 2, new SeededRng(3));
  const weakTotal = Object.values(weak.severity).reduce((sum, value) => sum + value, 0);
  assert.equal(weakTotal, 4);
  const medium = healInjuries(base, 4, new SeededRng(3));
  const mediumTotal = Object.values(medium.severity).reduce((sum, value) => sum + value, 0);
  assert.equal(mediumTotal, 2);
});

test('strong healing clears all injuries', () => {
  const base = cleanInjuryState();
  base.severity.head = 3;
  base.severity.torso = 2;
  assert.deepEqual(clearAllInjuries(base).severity, cleanInjuryState().severity);
});

test('penalty summary reflects approved per-zone penalties', () => {
  const state = cleanInjuryState();
  state.severity.head = 2;
  state.severity.torso = 1;
  state.severity.leftArm = 2;
  state.severity.rightArm = 1;
  state.severity.leftLeg = 1;
  state.severity.rightLeg = 2;
  const p = injuryPenaltySummary(state);
  assert.equal(p.accuracyPenalty, 0.06);
  assert.equal(p.maxHpMultiplier, 0.95);
  assert.equal(p.blockParryMultiplier, 0.90);
  assert.equal(p.physicalAttackMultiplier, 0.95);
  assert.equal(p.travelTimeMultiplier, 1.15);
});


import {
  applyDefeatConsequences,
  reconstructRecovery,
  isUnconscious,
  isForcedRest,
  isRecoveryLocked
} from '../dist/game-core/injuries/defeat.js';

test('ordinary defeat applies one injury and exactly 15 seconds unconscious', () => {
  const before = cleanInjuryState();
  const after = applyDefeatConsequences(before, 'ordinary', 10_000, new SeededRng(1));
  const total = Object.values(after.severity).reduce((sum, value) => sum + value, 0);
  assert.equal(total, 1);
  assert.equal(after.unconsciousUntil, 25_000);
});

test('boss and miniboss defeats apply exactly three injury rolls', () => {
  for (const kind of ['boss', 'miniboss']) {
    const after = applyDefeatConsequences(cleanInjuryState(), kind, 0, new SeededRng(5));
    const total = Object.values(after.severity).reduce((sum, value) => sum + value, 0);
    assert.equal(total, 3);
  }
});

test('forced rest starts only with more than five injured zones and uses total severity', () => {
  const five = cleanInjuryState();
  five.severity.head = 1;
  five.severity.torso = 1;
  five.severity.leftArm = 1;
  five.severity.rightArm = 1;
  five.severity.leftLeg = 1;
  const noRest = applyDefeatConsequences(five, 'ordinary', 1_000, new SeededRng(1));
  assert.equal(noRest.restUntil, null);

  const six = cleanInjuryState();
  for (const key of Object.keys(six.severity)) six.severity[key] = 1;
  const rest = applyDefeatConsequences(six, 'ordinary', 1_000, new SeededRng(1));
  const total = Object.values(rest.severity).reduce((sum, value) => sum + value, 0);
  assert.equal(rest.restUntil, 16_000 + total * 30_000);
});

test('recovery reconstruction clears expired timestamps and lock helpers reflect current time', () => {
  const state = cleanInjuryState();
  state.unconsciousUntil = 15_000;
  state.restUntil = 75_000;
  assert.equal(isUnconscious(state, 10_000), true);
  assert.equal(isForcedRest(state, 10_000), false);
  assert.equal(isRecoveryLocked(state, 10_000), true);
  const awake = reconstructRecovery(state, 20_000);
  assert.equal(awake.unconsciousUntil, null);
  assert.equal(isForcedRest(awake, 20_000), true);
  assert.equal(isRecoveryLocked(awake, 20_000), true);
  const recovered = reconstructRecovery(awake, 80_000);
  assert.equal(recovered.restUntil, null);
  assert.equal(isRecoveryLocked(recovered, 80_000), false);
});


test('reconstructRecovery preserves object identity when no recovery timestamp changes', () => {
  const state = cleanInjuryState();
  state.severity.head = 1;
  assert.equal(reconstructRecovery(state, 10_000), state);
});
