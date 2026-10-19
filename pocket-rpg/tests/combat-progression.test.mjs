import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMBAT_DOMAIN_XP_WEIGHTS,
  SHORT_SWORD_SKILL_CHAIN,
  applyShortSwordAttackProgression,
  shortSwordDamageMultiplier
} from '../dist/game-core/combat/progression.js';
import {createDefaultSkillProgression} from '../dist/game-core/progression/skill-progress.js';

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
