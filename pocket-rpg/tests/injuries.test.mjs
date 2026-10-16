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
