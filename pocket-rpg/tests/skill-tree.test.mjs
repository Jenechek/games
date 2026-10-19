import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTION_XP_BASE,
  FAILED_ACTION_XP_RATIO,
  SKILL_BONUS_PER_LEVEL,
  SKILL_TREE_MAX_CHILDREN,
  SKILL_TREE_MAX_LEVELS,
  SKILL_UNLOCK_THRESHOLDS,
  actionXp,
  applyWeightedSkillUse,
  isAbilityUnlocked,
  multiplicativeSkillMultiplier,
  siblingSpilloverBonus,
  skillPrimaryBonus,
  unlockedThresholds,
  validateSkillAbilities,
  validateSkillTree,
  visibleSkillNodes,
  weightedSkillXp
} from '../dist/game-core/progression/skill-tree.js';
import {skills} from '../dist/content/skills.js';

test('authored skill tree obeys depth and child limits',()=>{
  const result=validateSkillTree(skills);
  assert.equal(result.ok,true,result.errors.join('\n'));
  assert.equal(SKILL_TREE_MAX_LEVELS,4);
  assert.equal(SKILL_TREE_MAX_CHILDREN,8);
});

test('entire authored tree is visible from the start',()=>{
  const visible=visibleSkillNodes(skills);
  assert.deepEqual(visible,skills);
  assert.notEqual(visible,skills);
});

test('action XP uses twenty baseline and failed actions receive twenty five percent',()=>{
  assert.equal(ACTION_XP_BASE,20);
  assert.equal(FAILED_ACTION_XP_RATIO,0.25);
  assert.equal(actionXp(true),20);
  assert.equal(actionXp(false),5);
  assert.equal(actionXp(false,40),10);
});

test('weighted skill XP applies fifty to one hundred percent before depth multiplier',()=>{
  const root={id:'root',parentId:null,depth:0,label:'Root'};
  const deep={id:'deep',parentId:'root',depth:3,label:'Deep'};
  assert.equal(weightedSkillXp(20,root,0.5),10);
  assert.ok(Math.abs(weightedSkillXp(20,deep,1)-20*(1.65**3))<1e-10);
  assert.throws(()=>weightedSkillXp(20,root,0.49),/between 0.5 and 1/);
  assert.throws(()=>weightedSkillXp(20,root,1.01),/between 0.5 and 1/);
});

test('one action can progress every eligible branch with independent weights',()=>{
  const nodes=[
    {id:'root',parentId:null,depth:0,label:'Root'},
    {id:'direct',parentId:'root',depth:1,label:'Direct'},
    {id:'support',parentId:'root',depth:1,label:'Support'}
  ];
  const result=applyWeightedSkillUse(
    {},
    nodes,
    [{skillId:'direct',weight:1},{skillId:'support',weight:0.5}],
    20
  );
  assert.equal(result.direct.level,0);
  assert.ok(Math.abs(result.direct.xp-33)<1e-10);
  assert.ok(Math.abs(result.support.xp-16.5)<1e-10);
});

test('skill bonus is point two percent per level and caps at twenty percent',()=>{
  assert.equal(SKILL_BONUS_PER_LEVEL,0.002);
  assert.equal(skillPrimaryBonus(1),0.002);
  assert.equal(skillPrimaryBonus(50),0.1);
  assert.equal(skillPrimaryBonus(100),0.2);
  assert.equal(skillPrimaryBonus(999),0.2);
  assert.equal(siblingSpilloverBonus(100),0.02);
});

test('applicable skill bonuses stack multiplicatively',()=>{
  assert.ok(Math.abs(multiplicativeSkillMultiplier([0.2,0.1])-1.32)<1e-10);
  assert.equal(multiplicativeSkillMultiplier([]),1);
});

test('fixed unlock thresholds are exactly the agreed seven levels',()=>{
  assert.deepEqual(SKILL_UNLOCK_THRESHOLDS,[10,20,35,50,70,85,100]);
  assert.deepEqual(unlockedThresholds(9),[]);
  assert.deepEqual(unlockedThresholds(35),[10,20,35]);
  assert.deepEqual(unlockedThresholds(100),[10,20,35,50,70,85,100]);
});

test('ability definitions must use fixed thresholds and existing skills',()=>{
  const abilities=[
    {id:'a',label:'A',skillId:'swords',unlockLevel:10},
    {id:'b',label:'B',skillId:'farming',unlockLevel:100}
  ];
  assert.equal(validateSkillAbilities(skills,abilities).ok,true);
  assert.equal(validateSkillAbilities(skills,[
    {id:'bad',label:'Bad',skillId:'missing',unlockLevel:10}
  ]).ok,false);
  assert.equal(validateSkillAbilities(skills,[
    {id:'bad-threshold',label:'Bad',skillId:'swords',unlockLevel:20},
    {id:'bad-threshold',label:'Bad2',skillId:'swords',unlockLevel:20}
  ]).ok,false);
});

test('ability availability is automatic once its skill reaches threshold',()=>{
  const ability={id:'a',label:'A',skillId:'swords',unlockLevel:35};
  assert.equal(isAbilityUnlocked(ability,{swords:{level:34,xp:0}}),false);
  assert.equal(isAbilityUnlocked(ability,{swords:{level:35,xp:0}}),true);
});
