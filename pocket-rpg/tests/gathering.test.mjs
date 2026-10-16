import test from 'node:test';
import assert from 'node:assert/strict';
import { SeededRng } from '../dist/game-core/rng.js';
import {
  createDefaultGatheringState,
  gatheringSpeedMultiplier,
  gatheringCycleMs,
  focusedResourceWeights,
  chooseGatheringResource,
  rollGatheringYield,
  gatheringRareChance,
  startGathering,
  advanceGathering,
  stopGathering,
  gatheringLocationView
} from '../dist/game-core/peaceful/gathering/gathering.js';
import { gatheringPools, gatheringResourceDefs } from '../dist/content/gathering.js';
import { itemDefs } from '../dist/content/items.js';

test('default gathering state starts at level zero with no discoveries', () => {
  assert.deepEqual(createDefaultGatheringState(), {
    skill:{level:0,xp:0},
    discoveredResourceIds:[]
  });
});

test('gathering speed uses skill agility intuition and caps at two times', () => {
  assert.equal(gatheringSpeedMultiplier(0,10,10),1);
  assert.equal(gatheringSpeedMultiplier(100,20,20),1.6);
  assert.equal(gatheringSpeedMultiplier(100,100,100),2);
  assert.equal(gatheringCycleMs(0,10,10),5000);
  assert.equal(gatheringCycleMs(100,100,100),2500);
});

test('starter gathering pools match authored location weights', () => {
  assert.deepEqual(gatheringPools['tillanium-fields'],[
    {resourceId:'wild-herb',weight:45},
    {resourceId:'plant-fiber',weight:55}
  ]);
  assert.deepEqual(gatheringPools.meadow,[
    {resourceId:'wild-herb',weight:40},
    {resourceId:'wild-berries',weight:35},
    {resourceId:'plant-fiber',weight:25}
  ]);
  assert.deepEqual(gatheringPools['forest-edge'],[
    {resourceId:'medicinal-herb',weight:40},
    {resourceId:'wild-berries',weight:35},
    {resourceId:'plant-fiber',weight:25}
  ]);
});

test('focus triples matching category weights but keeps other resources possible', () => {
  assert.deepEqual(focusedResourceWeights('meadow','balanced'),[
    {resourceId:'wild-herb',weight:40},
    {resourceId:'wild-berries',weight:35},
    {resourceId:'plant-fiber',weight:25}
  ]);
  assert.deepEqual(focusedResourceWeights('meadow','herbs'),[
    {resourceId:'wild-herb',weight:120},
    {resourceId:'wild-berries',weight:35},
    {resourceId:'plant-fiber',weight:25}
  ]);

  const focusedChoice=chooseGatheringResource('meadow','herbs',{next:()=>0});
  const otherChoice=chooseGatheringResource('meadow','herbs',{next:()=>0.80});
  assert.equal(focusedChoice,'wild-herb');
  assert.notEqual(otherChoice,'wild-herb');
});

test('yield stays in authored range and high skill biases deterministic rolls upward', () => {
  const low=new SeededRng(91);
  const high=new SeededRng(91);
  let lowTotal=0;
  let highTotal=0;
  for(let i=0;i<500;i+=1){
    const a=rollGatheringYield('wild-herb',0,low);
    const b=rollGatheringYield('wild-herb',100,high);
    assert.ok(a>=1&&a<=3);
    assert.ok(b>=1&&b<=3);
    lowTotal+=a;
    highTotal+=b;
  }
  assert.ok(highTotal>lowTotal);
});

test('rare chance combines base skill luck gear and caps at fifty percent', () => {
  assert.equal(gatheringRareChance('wild-herb',0,10,0),0.01);
  assert.equal(gatheringRareChance('wild-herb',100,30,0),0.07);
  assert.equal(gatheringRareChance('wild-herb',100,1000,1),0.5);
});

test('start and stop gathering use the calculated repeating cycle', () => {
  const session=startGathering(createDefaultGatheringState(),'herbs',1_000,'meadow',10,10,1);
  assert.deepEqual(session,{focus:'herbs',nextAt:6_000,cycleMs:5_000});
  assert.equal(stopGathering(session),null);
  assert.throws(
    ()=>startGathering(createDefaultGatheringState(),'balanced',1_000,'tillanium',10,10,1),
    /gathering pool/i
  );
  assert.throws(
    ()=>startGathering(createDefaultGatheringState(),'balanced',1_000,'meadow',10,10,1.2),
    /overloaded/i
  );
});

test('completed cycle grants XP discovers resource and rare output replaces ordinary output', () => {
  const gathering=createDefaultGatheringState();
  const session=startGathering(gathering,'balanced',0,'meadow',10,10,1);

  const ordinary=advanceGathering(
    gathering,
    session,
    5_000,
    {next:()=>0,chance:()=>false},
    'meadow',
    10
  );
  assert.equal(ordinary.results.length,1);
  assert.equal(ordinary.results[0].resourceId,'wild-herb');
  assert.equal(ordinary.results[0].itemId,'wild-herb');
  assert.equal(ordinary.results[0].rare,false);
  assert.equal(ordinary.gathering.skill.xp,gatheringResourceDefs['wild-herb'].xp);
  assert.deepEqual(ordinary.gathering.discoveredResourceIds,['wild-herb']);
  assert.equal(ordinary.session.nextAt,10_000);

  const rare=advanceGathering(
    gathering,
    session,
    5_000,
    {next:()=>0,chance:()=>true},
    'meadow',
    10
  );
  assert.equal(rare.results[0].itemId,'wild-herb-rare');
  assert.equal(rare.results[0].rare,true);
  assert.equal(rare.results[0].quantity,ordinary.results[0].quantity);
  assert.equal(rare.gathering.skill.xp,gatheringResourceDefs['wild-herb'].xp*2);
  assert.deepEqual(rare.gathering.discoveredResourceIds,['wild-herb']);
});

test('advance gathering processes multiple overdue cycles without depleting the pool', () => {
  const gathering=createDefaultGatheringState();
  const session=startGathering(gathering,'fiber',0,'tillanium-fields',10,10,1);
  const result=advanceGathering(
    gathering,
    session,
    15_000,
    {next:()=>0.99,chance:()=>false},
    'tillanium-fields',
    10
  );
  assert.equal(result.results.length,3);
  assert.equal(result.results.every(x=>x.resourceId==='plant-fiber'),true);
  assert.equal(result.session.nextAt,20_000);
});


test('undiscovered gathering view exposes only vague category hints', () => {
  const view=gatheringLocationView('meadow',createDefaultGatheringState());
  assert.deepEqual(view.hints,[
    'здесь встречаются травы',
    'здесь можно найти ягоды',
    'здесь есть волокнистые растения'
  ]);
  assert.deepEqual(view.discovered,[]);
  assert.equal(JSON.stringify(view).includes('Дикорастущие травы'),false);
});

test('discovered resource names are visible at every location containing that resource', () => {
  const state=createDefaultGatheringState();
  state.discoveredResourceIds=['medicinal-herb','wild-berries'];

  assert.deepEqual(gatheringLocationView('forest-edge',state).discovered,[
    {resourceId:'medicinal-herb',label:'Лечебные травы'},
    {resourceId:'wild-berries',label:'Дикие ягоды'}
  ]);
  assert.deepEqual(gatheringLocationView('dark-forest',state).discovered,[
    {resourceId:'medicinal-herb',label:'Лечебные травы'},
    {resourceId:'wild-berries',label:'Дикие ягоды'}
  ]);
  assert.deepEqual(gatheringLocationView('tillanium-fields',state).discovered,[]);
});

test('ordinary and rare gathering items use the same authored unit mass', () => {
  assert.equal(itemDefs['wild-herb'].weight,0.10);
  assert.equal(itemDefs['wild-herb-rare'].weight,0.10);
  assert.equal(itemDefs['medicinal-herb'].weight,0.10);
  assert.equal(itemDefs['medicinal-herb-rare'].weight,0.10);
  assert.equal(itemDefs['wild-berries'].weight,0.15);
  assert.equal(itemDefs['wild-berries-rare'].weight,0.15);
  assert.equal(itemDefs['plant-fiber'].weight,0.10);
  assert.equal(itemDefs['plant-fiber-rare'].weight,0.10);
  assert.match(itemDefs['plant-fiber-rare'].label,/редк/i);
});

test('overdue gathering can stop between cycles when a runtime limit is reached',()=>{
  const state=createDefaultGatheringState();
  const session=startGathering(state,'fiber',0,'tillanium-fields',10,10,1);
  const result=advanceGathering(
    state,
    session,
    15000,
    {next:()=>0.99,chance:()=>false},
    'tillanium-fields',
    10,
    0,
    results=>results.length<2
  );
  assert.equal(result.results.length,2);
});
