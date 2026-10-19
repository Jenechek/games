import test from 'node:test';
import assert from 'node:assert/strict';
import {SeededRng} from '../dist/game-core/rng.js';
import {
  startFishing,
  advanceFishing,
  stopFishing,
  weightedFishChance
} from '../dist/game-core/peaceful/fishing.js';

function baseState(stacks=[]){
  return {
    inventory:{stacks,equipment:[]},
    fishingSkill:{level:0,xp:0},
    fishing:null
  };
}

test('fishing runs automatic cycles and progresses shared SkillState',()=>{
  const state=startFishing(baseState(),'worms',1000,1);
  const out=advanceFishing(state,13000,new SeededRng(1),'meadow',10);
  assert.ok(out.state.inventory.stacks.length>0);
  assert.ok(out.gainedXp>0);
  assert.ok(out.state.fishingSkill.xp>0||out.state.fishingSkill.level>0);
  assert.ok(out.state.fishing?.nextAt>13000);
});

test('fishing XP crosses normal skill levels rather than storing lifetime scalar XP',()=>{
  const state=startFishing(baseState(),'worms',0,1,1000);
  const out=advanceFishing(state,20000,new SeededRng(1),'meadow',10);
  assert.ok(out.gainedXp>=250);
  assert.ok(out.state.fishingSkill.level>=1);
  assert.ok(out.state.fishingSkill.xp<out.gainedXp);
});

test('stopping mid-cycle loses progress',()=>{
  const state=startFishing(baseState(),'worms',1000,1);
  const restarted=startFishing(stopFishing(state),'worms',3000,1);
  assert.equal(restarted.fishing.nextAt,8000);
});

test('bait changes weights without excluding other fish',()=>{
  const a=weightedFishChance(.2,1.5,.1),b=weightedFishChance(.2,.8,.1);
  assert.ok(a>b);
  assert.ok(b>0);
});

test('cannot start fishing at 120 percent load',()=>{
  assert.throws(()=>startFishing(baseState(),'worms',0,1.2));
  assert.doesNotThrow(()=>startFishing(baseState(),'worms',0,1.199));
});

test('ongoing fishing stops immediately after a catch reaches peaceful overload cutoff',()=>{
  const state=startFishing(baseState([{itemId:'healing-potion',quantity:198,itemClass:1}]),'worms',0,1.188);
  const out=advanceFishing(
    state,
    20000,
    {next:()=>0},
    'meadow',
    10,
    inventory=>{
      const potionMass=(inventory.stacks.find(x=>x.itemId==='healing-potion')?.quantity??0)*0.3;
      const roachMass=(inventory.stacks.find(x=>x.itemId==='roach')?.quantity??0)*0.4;
      return (potionMass+roachMass)/50<1.2;
    }
  );
  assert.equal(out.state.inventory.stacks.find(x=>x.itemId==='roach')?.quantity,2);
  assert.equal(out.state.fishing,null);
  assert.equal(out.gainedXp,40);
});
