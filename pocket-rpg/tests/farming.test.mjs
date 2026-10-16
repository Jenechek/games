import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDefaultFarmingState,
  fieldSlotLimit,
  fieldCellCapacity,
  startFieldEstablishment,
  advanceFieldEstablishment,
  abandonField,
  reconcileFieldCapacity
} from '../dist/game-core/peaceful/farming/farming.js';

test('field slot limit expands at approved farming thresholds', () => {
  assert.equal(fieldSlotLimit(0), 1);
  assert.equal(fieldSlotLimit(19), 1);
  assert.equal(fieldSlotLimit(20), 2);
  assert.equal(fieldSlotLimit(49), 2);
  assert.equal(fieldSlotLimit(50), 3);
  assert.equal(fieldSlotLimit(79), 3);
  assert.equal(fieldSlotLimit(80), 4);
  assert.equal(fieldSlotLimit(99), 4);
  assert.equal(fieldSlotLimit(100), 5);
});

test('field capacity expands by two cells every twenty farming levels', () => {
  assert.equal(fieldCellCapacity(0), 4);
  assert.equal(fieldCellCapacity(19), 4);
  assert.equal(fieldCellCapacity(20), 6);
  assert.equal(fieldCellCapacity(40), 8);
  assert.equal(fieldCellCapacity(60), 10);
  assert.equal(fieldCellCapacity(80), 12);
  assert.equal(fieldCellCapacity(100), 14);
});

test('default farming state starts with one empty slot and three permanent seed unlocks', () => {
  const state = createDefaultFarmingState();
  assert.deepEqual(state.skill, {level:0,xp:0});
  assert.deepEqual(state.fields, []);
  assert.deepEqual(state.knownSeedIds, ['wheat','turnip','flax']);
  assert.equal(state.nextFieldNumber, 1);
});

test('field establishment takes exactly thirty seconds and creates nothing early', () => {
  const initial = createDefaultFarmingState();
  const work = startFieldEstablishment(initial, 'tillanium-fields', 1_000);
  assert.equal(work.type, 'establish');
  assert.equal(work.nextAt, 31_000);

  const early = advanceFieldEstablishment(initial, work, 30_999);
  assert.equal(early.state.fields.length, 0);
  assert.notEqual(early.work, null);

  const complete = advanceFieldEstablishment(initial, work, 31_000);
  assert.equal(complete.work, null);
  assert.equal(complete.state.fields.length, 1);
  assert.equal(complete.state.fields[0].id, 'field-1');
  assert.equal(complete.state.fields[0].locationId, 'tillanium-fields');
  assert.equal(complete.state.fields[0].cells.length, 4);
  assert.equal(complete.state.nextFieldNumber, 2);
});

test('establishment rejects creating more fields than current farming slot limit', () => {
  const initial = createDefaultFarmingState();
  const first = advanceFieldEstablishment(
    initial,
    startFieldEstablishment(initial, 'tillanium-fields', 0),
    30_000
  ).state;
  assert.throws(() => startFieldEstablishment(first, 'meadow', 40_000), /field slot limit/i);
});

test('abandoning a field permanently removes it and frees the slot', () => {
  const initial = createDefaultFarmingState();
  const created = advanceFieldEstablishment(
    initial,
    startFieldEstablishment(initial, 'tillanium-fields', 0),
    30_000
  ).state;
  created.fields[0].cycleCropId = 'wheat';
  created.fields[0].cells[0] = {plantedAt:30_000,maturesAt:330_000};

  const abandoned = abandonField(created, 'field-1');
  assert.equal(abandoned.fields.length, 0);
  assert.doesNotThrow(() => startFieldEstablishment(abandoned, 'meadow', 40_000));
});

test('capacity reconciliation adds empty cells without altering existing crop cells', () => {
  const initial = createDefaultFarmingState();
  let created = advanceFieldEstablishment(
    initial,
    startFieldEstablishment(initial, 'tillanium-fields', 0),
    30_000
  ).state;
  const planted = {plantedAt:30_000,maturesAt:330_000};
  created.fields[0].cycleCropId = 'wheat';
  created.fields[0].cells[0] = planted;
  created = {...created, skill:{level:20,xp:0}};

  const expanded = reconcileFieldCapacity(created);
  assert.equal(expanded.fields[0].cells.length, 6);
  assert.deepEqual(expanded.fields[0].cells[0], planted);
  assert.equal(expanded.fields[0].cells[4], null);
  assert.equal(expanded.fields[0].cells[5], null);
});
