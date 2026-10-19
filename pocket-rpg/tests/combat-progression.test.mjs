import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMBAT_DOMAIN_XP_WEIGHTS,
  SHORT_SWORD_SKILL_CHAIN,
  applyArmorActionProgression,
  applyArmorMitigationSkill,
  applyBlockingActionProgression,
  applyBlockingChanceSkill,
  applyLoggedMagicProgression,
  applyMagicActionProgression,
  applyMagicEffectSkill,
  applyShortSwordAttackProgression,
  applyWeaponAttackProgression,
  armorMitigationMultiplier,
  blockingChanceMultiplier,
  magicEffectMultiplier,
  shortSwordDamageMultiplier,
  weaponDamageMultiplier
} from '../dist/game-core/combat/progression.js';
import {createDefaultSkillProgression} from '../dist/game-core/progression/skill-progress.js';
import {ARCANE_FOCUS_SKILL_PATH,arcaneFocusSpell} from '../dist/content/magic.js';

test('agreed combat domain weights remain explicit',()=>{
  assert.deepEqual(COMBAT_DOMAIN_XP_WEIGHTS,{
    weapon:1,
    armor:0.8,
    blocking:0.7,
    magic:0.3
  });
});

test('basic attack trains the full short sword chain at one hundred percent weight',()=>{
  const start=createDefaultSkillProgression();
  const next=applyShortSwordAttackProgression(start,true);
  assert.deepEqual(SHORT_SWORD_SKILL_CHAIN,[
    'weapons','one-handed','swords','short-sword'
  ]);
  assert.ok(Math.abs(next.weapons.xp-20)<1e-10);
  assert.ok(Math.abs(next['one-handed'].xp-33)<1e-10);
  assert.ok(Math.abs(next.swords.xp-54.45)<1e-10);
  assert.ok(Math.abs(next['short-sword'].xp-89.8425)<1e-10);
});

test('failed weapon action grants twenty five percent base XP before depth scaling',()=>{
  const next=applyShortSwordAttackProgression(createDefaultSkillProgression(),false);
  assert.ok(Math.abs(next.weapons.xp-5)<1e-10);
  assert.ok(Math.abs(next['one-handed'].xp-8.25)<1e-10);
  assert.ok(Math.abs(next.swords.xp-13.6125)<1e-10);
  assert.ok(Math.abs(next['short-sword'].xp-22.460625)<1e-10);
});

test('weapon hierarchy bonuses stack multiplicatively into attack damage',()=>{
  const progression=createDefaultSkillProgression();
  progression.weapons={level:100,xp:0};
  progression['one-handed']={level:100,xp:0};
  progression.swords={level:100,xp:0};
  progression['short-sword']={level:100,xp:0};
  assert.ok(Math.abs(shortSwordDamageMultiplier(progression)-(1.2**4))<1e-10);
});

test('weapon XP can level deeper nodes earlier because depth multiplier is stronger',()=>{
  let progression=createDefaultSkillProgression();
  for(let i=0;i<3;i++){
    progression=applyShortSwordAttackProgression(progression,true);
  }
  assert.equal(progression.weapons.level,0);
  assert.equal(progression['one-handed'].level,0);
  assert.equal(progression.swords.level,0);
  assert.equal(progression['short-sword'].level,1);
});


test('combat weapon action does not leak XP into peaceful skills',()=>{
  const start=createDefaultSkillProgression();
  const next=applyShortSwordAttackProgression(start,true);
  for(const id of ['fishing','farming','gathering','crafting','alchemy','trading','diplomacy']){
    assert.deepEqual(next[id],start[id]);
  }
});


test('unarmed attack has no weapon skill path progression or multiplier',()=>{
  const start=createDefaultSkillProgression();
  const next=applyWeaponAttackProgression(start,undefined,true);
  assert.equal(next,start);
  assert.equal(weaponDamageMultiplier(start,undefined),1);
});

test('declared short sword item path routes through the same progression chain',()=>{
  const start=createDefaultSkillProgression();
  const next=applyWeaponAttackProgression(
    start,
    ['weapons','one-handed','swords','short-sword'],
    true
  );
  assert.ok(Math.abs(next.weapons.xp-20)<1e-10);
  assert.ok(Math.abs(next['short-sword'].xp-89.8425)<1e-10);
});


test('light armor action progression uses eighty percent weight across its hierarchy',()=>{
  const start=createDefaultSkillProgression();
  const next=applyArmorActionProgression(
    start,
    ['armor','body-armor','light-armor'],
    true
  );
  assert.ok(Math.abs(next.armor.xp-16)<1e-10);
  assert.ok(Math.abs(next['body-armor'].xp-26.4)<1e-10);
  assert.ok(Math.abs(next['light-armor'].xp-43.56)<1e-10);
  assert.deepEqual(next['heavy-armor'],start['heavy-armor']);
});

test('heavy armor progression uses its own child branch',()=>{
  const next=applyArmorActionProgression(
    createDefaultSkillProgression(),
    ['armor','body-armor','heavy-armor'],
    true
  );
  assert.ok(Math.abs(next.armor.xp-16)<1e-10);
  assert.ok(Math.abs(next['body-armor'].xp-26.4)<1e-10);
  assert.ok(Math.abs(next['heavy-armor'].xp-43.56)<1e-10);
  assert.deepEqual(next['light-armor'],{level:0,xp:0});
});

test('failed armor action receives one quarter baseline before eighty percent weight',()=>{
  const next=applyArmorActionProgression(
    createDefaultSkillProgression(),
    ['armor','body-armor','light-armor'],
    false
  );
  assert.ok(Math.abs(next.armor.xp-4)<1e-10);
  assert.ok(Math.abs(next['body-armor'].xp-6.6)<1e-10);
  assert.ok(Math.abs(next['light-armor'].xp-10.89)<1e-10);
});

test('equipped shield progression uses seventy percent blocking weight',()=>{
  const success=applyBlockingActionProgression(
    createDefaultSkillProgression(),
    ['shields'],
    true
  );
  const failure=applyBlockingActionProgression(
    createDefaultSkillProgression(),
    ['shields'],
    false
  );
  assert.ok(Math.abs(success.shields.xp-14)<1e-10);
  assert.ok(Math.abs(failure.shields.xp-3.5)<1e-10);
});

test('armor and shield skill bonuses multiply their primary effects',()=>{
  const progression=createDefaultSkillProgression();
  progression.armor={level:100,xp:0};
  progression['body-armor']={level:100,xp:0};
  progression['light-armor']={level:100,xp:0};
  progression.shields={level:100,xp:0};

  assert.ok(Math.abs(
    armorMitigationMultiplier(
      progression,
      ['armor','body-armor','light-armor']
    )-(1.2**3)
  )<1e-10);
  assert.ok(Math.abs(
    blockingChanceMultiplier(progression,['shields'])-1.2
  )<1e-10);
});

test('missing armor or shield path grants no defensive progression',()=>{
  const start=createDefaultSkillProgression();
  assert.equal(applyArmorActionProgression(start,undefined,true),start);
  assert.equal(applyBlockingActionProgression(start,undefined,true),start);
});


test('defensive skill transforms scale only their primary stat',()=>{
  const progression=createDefaultSkillProgression();
  progression.armor={level:100,xp:0};
  progression['body-armor']={level:100,xp:0};
  progression['light-armor']={level:100,xp:0};
  progression.shields={level:100,xp:0};

  assert.ok(Math.abs(
    applyArmorMitigationSkill(
      0.05,
      progression,
      ['armor','body-armor','light-armor']
    )-(0.05*(1.2**3))
  )<1e-10);
  assert.ok(Math.abs(
    applyBlockingChanceSkill(
      0.12,
      progression,
      ['shields']
    )-0.144
  )<1e-10);
});


test('magic action progression uses thirty percent weight across its hierarchy',()=>{
  const start=createDefaultSkillProgression();
  const next=applyMagicActionProgression(
    start,
    ['magic','arcane','concentration','arcane-focus'],
    true
  );
  assert.ok(Math.abs(next.magic.xp-6)<1e-10);
  assert.ok(Math.abs(next.arcane.xp-9.9)<1e-10);
  assert.ok(Math.abs(next.concentration.xp-16.335)<1e-10);
  assert.ok(Math.abs(next['arcane-focus'].xp-26.95275)<1e-10);
});

test('failed magic action receives one quarter baseline before thirty percent weight',()=>{
  const next=applyMagicActionProgression(
    createDefaultSkillProgression(),
    ['magic','arcane','concentration','arcane-focus'],
    false
  );
  assert.ok(Math.abs(next.magic.xp-1.5)<1e-10);
  assert.ok(Math.abs(next.arcane.xp-2.475)<1e-10);
  assert.ok(Math.abs(next.concentration.xp-4.08375)<1e-10);
  assert.ok(Math.abs(next['arcane-focus'].xp-6.7381875)<1e-10);
});

test('magic hierarchy scales only the authored magical effect magnitude',()=>{
  const progression=createDefaultSkillProgression();
  progression.magic={level:100,xp:0};
  progression.arcane={level:100,xp:0};
  progression.concentration={level:100,xp:0};
  progression['arcane-focus']={level:100,xp:0};

  assert.ok(Math.abs(
    magicEffectMultiplier(
      progression,
      ['magic','arcane','concentration','arcane-focus']
    )-(1.2**4)
  )<1e-10);
  assert.ok(Math.abs(
    applyMagicEffectSkill(
      0.08,
      progression,
      ['magic','arcane','concentration','arcane-focus']
    )-(0.08*(1.2**4))
  )<1e-10);
});

test('missing magic path grants no magic progression or effect multiplier',()=>{
  const start=createDefaultSkillProgression();
  assert.equal(applyMagicActionProgression(start,undefined,true),start);
  assert.equal(magicEffectMultiplier(start,undefined),1);
  assert.equal(applyMagicEffectSkill(0.08,start,undefined),0.08);
});

test('magic progression does not leak into weapon defense or peaceful skills',()=>{
  const start=createDefaultSkillProgression();
  const next=applyMagicActionProgression(
    start,
    ['magic','arcane','concentration','arcane-focus'],
    true
  );
  for(const id of [
    'fishing','farming','gathering','crafting','alchemy','trading','diplomacy',
    'weapons','one-handed','swords','short-sword',
    'armor','body-armor','light-armor','heavy-armor','shields'
  ]){
    assert.deepEqual(next[id],start[id]);
  }
});


test('authored Arcane Focus content declares the expected magic path and cost',()=>{
  assert.deepEqual(ARCANE_FOCUS_SKILL_PATH,[
    'magic','arcane','concentration','arcane-focus'
  ]);
  assert.equal(arcaneFocusSpell.manaCost,20);
  assert.equal(arcaneFocusSpell.baseMagnitude,0.08);
  assert.equal(arcaneFocusSpell.durationRounds,3);
  assert.deepEqual(arcaneFocusSpell.skillPath,ARCANE_FOCUS_SKILL_PATH);
});


test('logged magic progression requires a real applied magical effect',()=>{
  const start=createDefaultSkillProgression();
  const skipped=applyLoggedMagicProgression(start,{
    magicEffectApplied:false,
    magicSkillPath:['magic','arcane','concentration','arcane-focus'],
    success:false
  });
  assert.equal(skipped,start);

  const applied=applyLoggedMagicProgression(start,{
    magicEffectApplied:true,
    magicSkillPath:['magic','arcane','concentration','arcane-focus'],
    success:true
  });
  assert.ok(Math.abs(applied.magic.xp-6)<1e-10);
  assert.ok(Math.abs(applied['arcane-focus'].xp-26.95275)<1e-10);
});
