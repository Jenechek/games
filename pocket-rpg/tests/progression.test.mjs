import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ATTRIBUTE_IDS,
  addCharacterXp,
  characterXpRequired,
  characterXpSourceProfiles,
  combatCharacterXp,
  emptyAttributeProfile,
  levelUpCharacter,
  xpRequiredForLevel
} from '../dist/game-core/progression/character.js';
import {
  skillXpRequired,
  skillDepthMultiplier,
  addSkillXp
} from '../dist/game-core/progression/skills.js';

function freshCharacter(){
  return {
    level:1,
    xp:0,
    attributes:{
      strength:10,agility:10,intuition:10,vitality:10,
      wisdom:10,luck:10,charisma:10,intelligence:10
    },
    attributeXp:emptyAttributeProfile()
  };
}

test('character XP uses 1000 base and 15 percent growth',()=>{
  assert.equal(xpRequiredForLevel(1000,1),1000);
  assert.equal(xpRequiredForLevel(1000,2),1150);
  assert.equal(characterXpRequired(1),1000);
  assert.equal(characterXpRequired(2),1150);
});

test('every character XP source profile is normalized',()=>{
  for(const profile of Object.values(characterXpSourceProfiles)){
    const total=ATTRIBUTE_IDS.reduce((sum,id)=>sum+profile[id],0);
    assert.ok(Math.abs(total-1)<1e-10);
    for(const value of Object.values(profile))assert.ok(value>=0);
  }
});

test('level up adds exactly 15 whole attribute points with minimum one each',()=>{
  const before=freshCharacter();
  const next=levelUpCharacter(before,{
    strength:40,agility:20,intuition:10,vitality:10,
    wisdom:5,luck:5,charisma:5,intelligence:5
  });
  const sum=o=>Object.values(o).reduce((a,b)=>a+b,0);
  assert.equal(sum(next.attributes)-sum(before.attributes),15);
  for(const value of Object.values(next.attributes))assert.ok(Number.isInteger(value)&&value>=11);
});

test('combat-heavy level favors combat attributes without manual allocation',()=>{
  const before=freshCharacter();
  const result=addCharacterXp(before,1000,'combat');
  assert.equal(result.levelsGained,1);
  assert.equal(result.state.level,2);
  assert.equal(result.state.xp,0);
  assert.ok(result.state.attributes.strength>=result.state.attributes.charisma);
  assert.ok(result.state.attributes.vitality>=result.state.attributes.charisma);
  assert.deepEqual(result.state.attributeXp,emptyAttributeProfile());
});

test('mixed XP sources affect the same upcoming level proportionally',()=>{
  let state=freshCharacter();
  state=addCharacterXp(state,500,'trading').state;
  state=addCharacterXp(state,500,'combat').state;
  assert.equal(state.level,2);
  assert.ok(state.attributes.charisma>11);
  assert.ok(state.attributes.strength>11);
});

test('overflow XP starts a fresh source profile for the next level',()=>{
  let state=freshCharacter();
  state=addCharacterXp(state,900,'farming').state;
  const result=addCharacterXp(state,300,'combat');
  assert.equal(result.state.level,2);
  assert.equal(result.state.xp,200);
  const profileTotal=Object.values(result.state.attributeXp).reduce((a,b)=>a+b,0);
  assert.ok(Math.abs(profileTotal-200)<1e-9);
  assert.ok(result.state.attributeXp.strength>result.state.attributeXp.charisma);
});

test('one large reward can cross multiple character levels with carried XP',()=>{
  const result=addCharacterXp(freshCharacter(),2300,'gathering');
  assert.equal(result.state.level,3);
  assert.equal(result.levelsGained,2);
  assert.ok(Math.abs(result.state.xp-150)<1e-9);
});

test('combat character XP scales with enemy level',()=>{
  assert.equal(combatCharacterXp(1),60);
  assert.equal(combatCharacterXp(2),80);
  assert.equal(combatCharacterXp(7),180);
});

test('skill XP uses 250 base and 15 percent growth',()=>{
  assert.equal(skillXpRequired(1),250);
  assert.equal(skillXpRequired(2),287.5);
});

test('deeper skill nodes gain 65 percent more XP each depth',()=>{
  assert.equal(skillDepthMultiplier(0),1);
  assert.equal(skillDepthMultiplier(1),1.65);
  assert.ok(Math.abs(skillDepthMultiplier(2)-2.7225)<1e-10);
  assert.ok(Math.abs(skillDepthMultiplier(3)-4.492125)<1e-10);
});

test('child skill may exceed parent but never exceeds 100',()=>{
  const parent=addSkillXp({level:20,xp:0},100);
  const child=addSkillXp({level:99,xp:skillXpRequired(100)-1},1e9);
  assert.ok(parent.level>=20);
  assert.equal(child.level,100);
});
