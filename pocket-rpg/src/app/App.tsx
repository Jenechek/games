import React from 'react';
import {GameProvider} from './GameProvider';
import {CharacterPanel} from './components/CharacterPanel';
import {LocationPanel} from './components/LocationPanel';
import {CombatPanel} from './components/CombatPanel';
import {InventoryPanel} from './components/InventoryPanel';
import {LootDialog} from './components/LootDialog';
import {FishingPanel} from './components/FishingPanel';
import {FarmingPanel} from './components/FarmingPanel';
import {GatheringPanel} from './components/GatheringPanel';
import {MerchantPanel} from './components/MerchantPanel';
import {GameLog} from './components/GameLog';
import {InjuryPanel} from './components/InjuryPanel';
import {CraftingPanel} from './components/CraftingPanel';
import {FactionPanel} from './components/FactionPanel';
import {UniversityPanel} from './components/UniversityPanel';
import {SummonsPanel} from './components/SummonsPanel';

export function App(){
  return <GameProvider>
    <main>
      <header><h1>Pocket RPG</h1><p>Первая игровая вертикаль</p></header>
      <div className="columns">
        <div><CharacterPanel/><SummonsPanel/><InjuryPanel/><LocationPanel/><CombatPanel/><FishingPanel/><GatheringPanel/><FarmingPanel/><CraftingPanel/><UniversityPanel/><FactionPanel/><MerchantPanel/></div>
        <div><InventoryPanel/><GameLog/></div>
      </div>
      <LootDialog/>
    </main>
  </GameProvider>;
}
