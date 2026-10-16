import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDefaultFarmingState,
  fieldSlotLimit,
  fieldCellCapacity,
  startFieldEstablishment,
  advanceFieldEstablishment,
  abandonField,
  reconcileFieldCapacity,
  farmingWorkSpeedMultiplier,
  startPlanting,
  startHarvesting,
  advanceFarmingWork,
  isCellMature,
  rareCropChance,
  rollCropYield,
  fieldCellSummary
} from '../dist/game-core/peaceful/farming/farming.js';
import { SeededRng } from '../dist/game-core/rng.js';
import { itemDefs } from '../dist/content/items.js';

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


function makeEstablishedField() {
  const initial = createDefaultFarmingState();
  return advanceFieldEstablishment(
    initial,
    startFieldEstablishment(initial, 'tillanium-fields', 0),
    30_000
  ).state;
}

test('farming work speed uses skill vitality and wisdom and caps at two times', () => {
  assert.equal(farmingWorkSpeedMultiplier(0, 10, 10), 1);
  assert.equal(farmingWorkSpeedMultiplier(100, 20, 20), 1.6);
  assert.equal(farmingWorkSpeedMultiplier(100, 100, 100), 2);
});

test('planting completes cells sequentially and starts each cell growth from completion time', () => {
  let state = makeEstablishedField();
  let work = startPlanting(state, 'field-1', 'wheat', 1_000, 10, 10);
  assert.equal(work.type, 'plant');
  assert.equal(work.nextAt, 3_000);
  assert.equal(work.queue.length, 4);

  let step = advanceFarmingWork(state, work, 2_999, new SeededRng(1), 10);
  assert.equal(step.state.fields[0].cells[0], null);
  assert.notEqual(step.work, null);

  step = advanceFarmingWork(step.state, step.work, 3_000, new SeededRng(1), 10);
  assert.deepEqual(step.state.fields[0].cells[0], {plantedAt:3_000,maturesAt:303_000});
  assert.equal(step.state.fields[0].cycleCropId, 'wheat');
  assert.equal(step.state.skill.xp, 10);

  step = advanceFarmingWork(step.state, step.work, 9_000, new SeededRng(1), 10);
  assert.equal(step.work, null);
  assert.equal(step.state.fields[0].cells.filter(Boolean).length, 4);
  assert.equal(step.state.skill.xp, 40);
  assert.deepEqual(step.state.fields[0].cells[3], {plantedAt:9_000,maturesAt:309_000});
});

test('interrupted planting locks the field crop cycle to the first completed crop', () => {
  let state = makeEstablishedField();
  const work = startPlanting(state, 'field-1', 'wheat', 0, 10, 10);
  const first = advanceFarmingWork(state, work, 2_000, new SeededRng(2), 10);
  state = first.state;

  assert.throws(
    () => startPlanting(state, 'field-1', 'turnip', 5_000, 10, 10),
    /crop cycle/i
  );
  assert.doesNotThrow(
    () => startPlanting(state, 'field-1', 'wheat', 5_000, 10, 10)
  );
});

test('crop maturity is timestamp based and therefore survives reloads', () => {
  const cell = {plantedAt:1_000,maturesAt:301_000};
  assert.equal(isCellMature(cell, 300_999), false);
  assert.equal(isCellMature(cell, 301_000), true);
  assert.equal(isCellMature(null, 999_999), false);
});

test('harvest queues only mature cells and keeps crop cycle while growing cells remain', () => {
  let state = makeEstablishedField();
  state.fields[0].cycleCropId = 'wheat';
  state.fields[0].cells[0] = {plantedAt:0,maturesAt:1_000};
  state.fields[0].cells[1] = {plantedAt:0,maturesAt:100_000};

  let work = startHarvesting(state, 'field-1', 2_000, 10, 10);
  assert.equal(work.type, 'harvest');
  assert.deepEqual(work.queue, [0]);

  const rng = {next:()=>0.2,chance:()=>false};
  const first = advanceFarmingWork(state, work, 3_500, rng, 10);
  assert.equal(first.work, null);
  assert.equal(first.harvests.length, 1);
  assert.equal(first.state.fields[0].cells[0], null);
  assert.notEqual(first.state.fields[0].cells[1], null);
  assert.equal(first.state.fields[0].cycleCropId, 'wheat');

  work = startHarvesting(first.state, 'field-1', 100_000, 10, 10);
  const last = advanceFarmingWork(first.state, work, 101_500, rng, 10);
  assert.equal(last.state.fields[0].cycleCropId, null);
  assert.equal(last.state.fields[0].cells.every(cell => cell === null), true);
});

test('planting XP is half normal harvest XP and rare harvest doubles only harvest XP', () => {
  const base = makeEstablishedField();
  base.fields[0].cycleCropId = 'wheat';
  base.fields[0].cells[0] = {plantedAt:0,maturesAt:1_000};

  const ordinaryWork = startHarvesting(base, 'field-1', 1_000, 10, 10);
  const ordinary = advanceFarmingWork(
    base,
    ordinaryWork,
    2_500,
    {next:()=>0.5,chance:()=>false},
    10
  );

  const rareWork = startHarvesting(base, 'field-1', 1_000, 10, 10);
  const rare = advanceFarmingWork(
    base,
    rareWork,
    2_500,
    {next:()=>0.5,chance:()=>true},
    10
  );

  assert.equal(ordinary.harvests[0].quantity, rare.harvests[0].quantity);
  assert.equal(ordinary.harvests[0].itemId, 'wheat');
  assert.equal(rare.harvests[0].itemId, 'wheat-rare');
  assert.equal(ordinary.state.skill.xp, 20);
  assert.equal(rare.state.skill.xp, 40);
});

test('crop yield stays in authored range and higher farming skill biases results upward', () => {
  const low = new SeededRng(77);
  const high = new SeededRng(77);
  let lowTotal = 0;
  let highTotal = 0;

  for (let i = 0; i < 500; i += 1) {
    const a = rollCropYield('wheat', 0, low);
    const b = rollCropYield('wheat', 100, high);
    assert.ok(a >= 1 && a <= 3);
    assert.ok(b >= 1 && b <= 3);
    lowTotal += a;
    highTotal += b;
  }

  assert.ok(highTotal > lowTotal);
});

test('rare crop chance combines crop base skill luck and gear bonus with a hard fifty percent cap', () => {
  assert.equal(rareCropChance('wheat', 0, 10, 0), 0.01);
  assert.equal(rareCropChance('wheat', 100, 30, 0), 0.07);
  assert.equal(rareCropChance('wheat', 100, 1000, 1), 0.5);
});


test('field cell summary separates empty growing and mature cells for UI', () => {
  const state=makeEstablishedField();
  state.fields[0].cells[0]={plantedAt:0,maturesAt:1_000};
  state.fields[0].cells[1]={plantedAt:0,maturesAt:10_000};
  assert.deepEqual(
    fieldCellSummary(state.fields[0],5_000),
    {empty:2,growing:1,mature:1}
  );
});

test('ordinary and rare crop inventory definitions use the authored crop mass', () => {
  assert.equal(itemDefs.wheat.weight,0.2);
  assert.equal(itemDefs['wheat-rare'].weight,0.2);
  assert.equal(itemDefs.turnip.weight,0.35);
  assert.equal(itemDefs['turnip-rare'].weight,0.35);
  assert.match(itemDefs['flax-rare'].label,/редк/i);
});
