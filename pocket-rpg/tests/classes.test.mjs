import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLASS_SKILL_COMBAT_XP_SHARE,
  addClassCombatXp,
  canUseClassSummon,
  choosePlayerClass,
  classSummonLimit,
  createDefaultClassState,
  effectiveSummonDefinitions,
  unlockedSummonIds
} from '../dist/game-core/classes/classes.js';
import {playerClasses} from '../dist/content/classes.js';
import {summonDefinitions} from '../dist/content/summons.js';

test('class starts unselected and can be chosen only once',()=>{
  const fresh=createDefaultClassState();
  assert.equal(fresh.classId,null);
  const mage=choosePlayerClass(fresh,'mage');
  assert.equal(mage.classId,'mage');
  assert.throws(()=>choosePlayerClass(mage,'tamer'),/already selected/);
});

test('mage and tamer use confirmed summon capacities',()=>{
  const mage=choosePlayerClass(createDefaultClassState(),'mage');
  const tamer=choosePlayerClass(createDefaultClassState(),'tamer');
  assert.equal(classSummonLimit(mage,playerClasses),1);
  assert.equal(classSummonLimit(tamer,playerClasses),3);
});

test('tamer summon unlocks follow class skill levels',()=>{
  const base=choosePlayerClass(createDefaultClassState(),'tamer');
  assert.deepEqual(unlockedSummonIds(base,playerClasses.tamer),['war-beast']);
  assert.equal(canUseClassSummon(base,playerClasses.tamer,'swift-beast'),false);

  const level20={...base,skill:{level:20,xp:0}};
  assert.deepEqual(
    unlockedSummonIds(level20,playerClasses.tamer),
    ['war-beast','swift-beast']
  );

  const level35={...base,skill:{level:35,xp:0}};
  assert.deepEqual(
    unlockedSummonIds(level35,playerClasses.tamer),
    ['war-beast','swift-beast','bulwark-beast']
  );
});

test('mage only exposes its defensive elemental in current confirmed content',()=>{
  const mage=choosePlayerClass(createDefaultClassState(),'mage');
  assert.deepEqual(
    unlockedSummonIds(mage,playerClasses.mage),
    ['guardian-elemental']
  );
  assert.equal(canUseClassSummon(mage,playerClasses.mage,'war-beast'),false);
});

test('class skill gains half combat XP only when summons participated',()=>{
  const mage=choosePlayerClass(createDefaultClassState(),'mage');
  assert.equal(CLASS_SKILL_COMBAT_XP_SHARE,0.5);

  const none=addClassCombatXp(mage,100,false);
  assert.equal(none.xp,0);
  assert.deepEqual(none.state,mage);

  const gained=addClassCombatXp(mage,100,true);
  assert.equal(gained.xp,50);
  assert.equal(gained.state.skill.xp,50);
});

test('tamer effective summons receive fifteen percent HP and damage bonus',()=>{
  const tamer=choosePlayerClass(createDefaultClassState(),'tamer');
  const effective=effectiveSummonDefinitions(
    tamer,
    playerClasses,
    summonDefinitions
  );
  assert.equal(effective['war-beast'].maxHp,81);
  assert.equal(effective['war-beast'].damage,14*1.15);
  assert.equal(playerClasses.tamer.personalDamageMultiplier,0.85);
});

test('mage leaves guardian elemental base stats unchanged',()=>{
  const mage=choosePlayerClass(createDefaultClassState(),'mage');
  const effective=effectiveSummonDefinitions(
    mage,
    playerClasses,
    summonDefinitions
  );
  assert.equal(effective['guardian-elemental'].maxHp,summonDefinitions['guardian-elemental'].maxHp);
  assert.equal(effective['guardian-elemental'].damage,summonDefinitions['guardian-elemental'].damage);
});
