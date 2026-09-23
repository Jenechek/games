import test from 'node:test';import assert from 'node:assert/strict';import {SeededRng} from '../dist/game-core/rng.js';
test('replays same sequence from same seed',()=>{const a=new SeededRng(12345),b=new SeededRng(12345);assert.deepEqual([a.next(),a.next(),a.next()],[b.next(),b.next(),b.next()]);});
test('inclusive integers stay in range',()=>{const rng=new SeededRng(7);for(let i=0;i<50;i++){const n=rng.int(4,8);assert.ok(n>=4&&n<=8);}});
