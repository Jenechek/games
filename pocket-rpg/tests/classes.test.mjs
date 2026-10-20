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

test('expanded roster has twelve unique persistent class IDs and balanced modifier caps',()=>{
 const ids=Object.keys(playerClasses);
 assert.equal(ids.length,12);
 for(const [id,definition] of Object.entries(playerClasses)){
  assert.equal(definition.id,id);
  assert.ok(definition.label&&definition.description);
  assert.ok(definition.personalDamageMultiplier>=.4&&definition.personalDamageMultiplier<=1.3);
  assert.ok((definition.hpMultiplier??1)>=.8&&(definition.hpMultiplier??1)<=1.35);
  assert.ok((definition.manaMultiplier??1)>=.85&&(definition.manaMultiplier??1)<=1.5);
  assert.ok((definition.mitigationBonus??0)>=0&&(definition.mitigationBonus??0)<=.2);
  assert.ok(Math.abs(definition.accuracyBonus??0)<=.15);
  assert.ok(Math.abs(definition.evasionBonus??0)<=.15);
  assert.ok(definition.summonLimit>=1&&definition.summonLimit<=3);
 }
});
test('non-summoning classes level their class skill without creature participation',()=>{
 for(const id of Object.keys(playerClasses).filter(id=>id!=='mage'&&id!=='tamer')){
  const state=choosePlayerClass(createDefaultClassState(),id);
  const result=addClassCombatXp(state,100,false);
  assert.equal(result.xp,50,id);
  assert.equal(result.state.skill.xp,50,id);
  assert.deepEqual(unlockedSummonIds(state,playerClasses[id]),[]);
 }
});
test('class archetypes provide distinct strengths without replacing the existing mage or tamer',()=>{
 assert.equal(playerClasses.mage.personalDamageMultiplier,.45);
 assert.equal(playerClasses.tamer.summonLimit,3);
 assert.ok(playerClasses.guardian.hpMultiplier>playerClasses.assassin.hpMultiplier);
 assert.ok(playerClasses.assassin.personalDamageMultiplier>playerClasses.guardian.personalDamageMultiplier);
 assert.ok(playerClasses.berserker.personalDamageMultiplier>playerClasses.warrior.personalDamageMultiplier);
 assert.ok(playerClasses.battlemage.manaMultiplier>(playerClasses.warrior.manaMultiplier??1));
 assert.ok(playerClasses.paladin.mitigationBonus>(playerClasses.duelist.mitigationBonus??0));
});

test('specializations beat basic physical symmetry while preserving magic hierarchy',()=>{
 const mage=playerClasses.mage,warrior=playerClasses.warrior,tamer=playerClasses.tamer;
 assert.ok(mage.personalDamageMultiplier<warrior.personalDamageMultiplier*.5);
 assert.ok(tamer.personalDamageMultiplier<warrior.personalDamageMultiplier*.6);
 assert.ok(playerClasses.druid.personalDamageMultiplier<playerClasses.guardian.personalDamageMultiplier);
 assert.ok(playerClasses.battlemage.personalDamageMultiplier<warrior.personalDamageMultiplier);
 assert.ok(mage.magicPowerMultiplier>playerClasses.battlemage.magicPowerMultiplier);
 assert.ok(playerClasses.druid.magicPowerMultiplier>1);
 assert.ok(playerClasses.paladin.magicPowerMultiplier>1);
 assert.ok(mage.summonLimit===1&&tamer.summonLimit===3);
});
