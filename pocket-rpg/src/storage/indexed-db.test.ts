import { beforeEach, describe, expect, it } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { createInitialGameState } from "../game-core/game-state";
import { loadGame, saveGame } from "./indexed-db";

beforeEach(() => { Object.defineProperty(globalThis, "indexedDB", { value: new IDBFactory(), configurable: true }); });

describe("save storage", () => {
  it("round trips durable state", async () => {
    const state = createInitialGameState();
    state.gold = 77;
    await saveGame(state);
    expect((await loadGame())?.gold).toBe(77);
  });

  it("returns null for corrupted data instead of throwing", async () => {
    const request = indexedDB.open("pocket-rpg", 1);
    await new Promise<void>((resolve) => { request.onupgradeneeded = () => request.result.createObjectStore("saves"); request.onsuccess = () => resolve(); });
    const db = request.result;
    const tx = db.transaction("saves", "readwrite");
    tx.objectStore("saves").put({ nope: true }, "main");
    await new Promise((resolve) => { tx.oncomplete = resolve; });
    expect(await loadGame()).toBeNull();
  });
});
