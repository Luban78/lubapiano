import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import vm from "node:vm";

const manifest = JSON.parse(readFileSync(new URL("../dist/manifest.webmanifest", import.meta.url), "utf8"));
const worker = readFileSync(new URL("../dist/sw.js", import.meta.url), "utf8");

test("LubaPiano má vlastní identitu a stále podporuje instalaci PWA", () => {
  assert.notEqual(manifest.id, "/");
  assert.equal(manifest.display, "standalone");
  assert.ok(manifest.start_url);
  assert.ok(manifest.scope);
  assert.ok(manifest.icons.length >= 2);
});

test("aktivace nemaže cache LubaWallet ani jiných aplikací", async () => {
  const udalosti = new Map();
  const smazane = [];
  let klientPrevzat = false;
  const cache = {
    keys: async () => ["lubawallet-cache-v1", "lubapiano-v0-1-2", "lubapiano-v0-1-3", "lubapiano-v0-1-4", "lubapiano-v0-1-4-1", "lubapiano-v0-1-4-2", "lubapiano-v0-1-5", "lubapiano-v0-1-5-1", "lubapiano-v0-1-5-2", "lubapiano-v0-1-5-3", "lubapiano-v0-1-5-4", "lubapiano-v0-1-5-5", "jina-aplikace"],
    delete: async (nazev) => { smazane.push(nazev); return true; },
  };
  vm.runInNewContext(worker, {
    caches: cache,
    self: {
      addEventListener: (typ, handler) => udalosti.set(typ, handler),
      clients: {claim: async () => { klientPrevzat = true; }},
    },
    URL,
  });
  let cekani;
  udalosti.get("activate")({waitUntil: (promise) => { cekani = promise; }});
  await cekani;
  assert.deepEqual(smazane, ["lubapiano-v0-1-2", "lubapiano-v0-1-3", "lubapiano-v0-1-4", "lubapiano-v0-1-4-1", "lubapiano-v0-1-4-2", "lubapiano-v0-1-5", "lubapiano-v0-1-5-1", "lubapiano-v0-1-5-2", "lubapiano-v0-1-5-3", "lubapiano-v0-1-5-4", "lubapiano-v0-1-5-5"]);
  assert.equal(klientPrevzat, true);
});
