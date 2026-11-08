import assert from "node:assert/strict";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { installMapTiles } from "../lib/map-tiles.ts";

function fixture(timeoutMs = 60_000) {
  const layers = [];
  const statuses = [];
  const L = {
    tileLayer(url) {
      const handlers = {};
      const layer = {
        url,
        removed: false,
        on(event, callback) {
          handlers[event] = callback;
          return layer;
        },
        off() {
          for (const name of Object.keys(handlers)) delete handlers[name];
          return layer;
        },
        remove() {
          layer.removed = true;
          return layer;
        },
        addTo() {
          return layer;
        },
        emit(event) {
          handlers[event]?.();
        },
      };
      layers.push(layer);
      return layer;
    },
  };
  const controller = installMapTiles(L, {}, (status) => statuses.push(status), timeoutMs);
  return { layers, statuses, controller };
}

test("failed standard tiles recover on the independent provider", async () => {
  const f = fixture();
  try {
    assert.match(f.layers[0].url, /^https:\/\/tile\.openstreetmap\.org\//);
    f.layers[0].emit("tileerror");
    f.layers[0].emit("tileerror");
    await Promise.resolve();
    assert.equal(f.layers.length, 2);
    assert.equal(f.layers[0].removed, true);
    assert.match(f.layers[1].url, /^https:\/\/tile\.openstreetmap\.de\//);
    f.layers[1].emit("tileload");
    assert.equal(f.statuses.at(-1), "ready");
  } finally {
    f.controller.destroy();
  }
});

test("all providers failing exposes retry and permits recovery", async () => {
  const f = fixture();
  try {
    f.layers[0].emit("tileerror");
    await Promise.resolve();
    f.layers[1].emit("tileerror");
    f.layers[1].emit("tileload");
    assert.equal(f.statuses.at(-1), "error");
    f.controller.retry();
    assert.equal(f.layers.length, 3);
    assert.equal(f.statuses.at(-1), "loading");
    f.layers[2].emit("tileload");
    assert.equal(f.statuses.at(-1), "ready");
  } finally {
    f.controller.destroy();
  }
});

test("a stalled provider times out and cleanup cancels pending recovery", async () => {
  const f = fixture(10);
  try {
    await delay(15);
    assert.equal(f.layers.length, 2);
    f.controller.destroy();
    const statusCount = f.statuses.length;
    await delay(20);
    f.layers[1].emit("tileload");
    assert.equal(f.statuses.length, statusCount);
    assert.equal(f.layers.length, 2);
    assert.equal(f.layers[1].removed, true);
  } finally {
    f.controller.destroy();
  }
});

test("unmounting before fallback prevents new requests", async () => {
  const f = fixture();
  f.layers[0].emit("tileerror");
  f.controller.destroy();
  await Promise.resolve();
  assert.equal(f.layers.length, 1);
  assert.equal(f.layers[0].removed, true);
});

test("panning after a successful load still detects a stalled viewport", async () => {
  const f = fixture(10);
  try {
    f.layers[0].emit("tileload");
    await delay(15);
    assert.equal(f.layers.length, 1);
    f.layers[0].emit("loading");
    await delay(15);
    assert.equal(f.layers.length, 2);
  } finally {
    f.controller.destroy();
  }
});
