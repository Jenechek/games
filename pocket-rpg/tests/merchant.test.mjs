import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyBuyPressure,
  applySellProgress,
  createDefaultEconomyState,
  decayedPressureValue,
  factionPriceBonus,
  personalMarketPressure,
  tradingAdvantage
} from '../dist/game-core/economy/merchant.js';
import {
  stackBuyQuote,
  stackSellQuote
} from '../dist/app/market-controller.js';
import {
  activeMarketEvent,
  MARKET_EVENT_WINDOW_MS
} from '../dist/content/economy.js';

test('buying quantity raises each next unit by five percent',()=>{
  const economy=createDefaultEconomyState();
  const quote=stackBuyQuote(economy,'tillanium','healing-potion',1,3,MARKET_EVENT_WINDOW_MS,10);
  assert.deepEqual(quote.unitPrices,[10,10.5,11]);
  assert.equal(quote.pressureAfter,0.15);
});

test('personal price pressure is city-local and recovers over twelve real hours',()=>{
  const now=1000;
  const economy=createDefaultEconomyState();
  const quote=stackBuyQuote(economy,'tillanium','healing-potion',1,4,now,10);
  const changed=applyBuyPressure(economy,'tillanium','healing-potion',quote,now);
  assert.equal(personalMarketPressure(changed,'tillanium','healing-potion',now),0.2);
  assert.equal(personalMarketPressure(changed,'karnholm','healing-potion',now),0);
  assert.ok(Math.abs(decayedPressureValue(0.2,now,now+6*60*60*1000)-0.1)<1e-10);
  assert.equal(decayedPressureValue(0.2,now,now+12*60*60*1000),0);
});

test('immediate same-city resale remains a loss',()=>{
  const now=MARKET_EVENT_WINDOW_MS;
  const economy=createDefaultEconomyState();
  const buy=stackBuyQuote(economy,'tillanium','healing-potion',1,1,now,10);
  const afterBuy=applyBuyPressure(economy,'tillanium','healing-potion',buy,now);
  const sell=stackSellQuote(afterBuy,'tillanium','healing-potion',1,1,now,10);
  assert.ok(sell.total<buy.total);
});

test('specialized city surplus creates real but bounded intercity arbitrage',()=>{
  const now=2*MARKET_EVENT_WINDOW_MS;
  const economy=createDefaultEconomyState();

  const ironBuy=stackBuyQuote(economy,'karnholm','iron-ingot',1,1,now,10).total;
  const ironSell=stackSellQuote(economy,'greenwald','iron-ingot',1,1,now,10).total;
  assert.ok(ironSell>ironBuy);
  assert.ok(ironSell/ironBuy<1.5);

  const grainBuy=stackBuyQuote(economy,'greenwald','grain-sack',1,1,now,10).total;
  const grainSell=stackSellQuote(economy,'karnholm','grain-sack',1,1,now,10).total;
  assert.ok(grainSell>grainBuy);
  assert.ok(grainSell/grainBuy<1.5);
});

test('skill charisma and faction relation improve prices but stay bounded',()=>{
  assert.equal(tradingAdvantage(0,10),0);
  assert.equal(tradingAdvantage(100,30),0.12);
  assert.equal(tradingAdvantage(1000,1000),0.12);
  assert.equal(factionPriceBonus(100),0.05);
  assert.equal(factionPriceBonus(-100),-0.05);
});

test('city events follow deterministic six-hour market windows',()=>{
  assert.equal(activeMarketEvent('karnholm',MARKET_EVENT_WINDOW_MS)?.id,'karnholm-war-demand');
  assert.equal(activeMarketEvent('rivermark',3*MARKET_EVENT_WINDOW_MS)?.id,'rivermark-poor-catch');
  assert.equal(activeMarketEvent('greenwald',0)?.id,'greenwald-rich-harvest');
  assert.equal(activeMarketEvent('karnholm',2*MARKET_EVENT_WINDOW_MS),null);
});

test('selling advances trading skill and creates local surplus pressure',()=>{
  const now=2*MARKET_EVENT_WINDOW_MS;
  const economy=createDefaultEconomyState();
  const quote=stackSellQuote(economy,'tillanium','grain-sack',1,5,now,10);
  const result=applySellProgress(economy,'tillanium','grain-sack',quote,now);
  assert.ok(result.trading.xp>0);
  assert.equal(result.trading.level,0);
  assert.equal(personalMarketPressure(result,'tillanium','grain-sack',now),-0.25);
});
