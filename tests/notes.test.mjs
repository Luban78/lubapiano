import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import vm from "node:vm";

// Testujeme přímo funkci používanou v PWA; nepotřebujeme DOM ani knihovny.
const soubor = readFileSync(new URL("../dist/app.js", import.meta.url), "utf8");
const zacatek = soubor.indexOf("function sediNota(");
const konec = soubor.indexOf("\n}", zacatek) + 2;
assert.ok(zacatek >= 0 && konec > zacatek, "Funkce sediNota nebyla nalezena");
const sediNota = vm.runInNewContext(`(${soubor.slice(zacatek, konec)})`);

test("dotyk: C2 se uzná pro C4 a naopak", () => {
  assert.equal(sediNota(36, 60, true), true);
  assert.equal(sediNota(60, 36, true), true);
  assert.equal(sediNota(72, 60, true), true);
});

test("dotyk: různá jména not se nezamění", () => {
  assert.equal(sediNota(62, 60, true), false);
  assert.equal(sediNota(61, 60, true), false);
  assert.equal(sediNota(59, 71, true), true);
});

test("MIDI: rozhoduje přesná nota včetně oktávy", () => {
  assert.equal(sediNota(36, 60, false), false);
  assert.equal(sediNota(72, 60, false), false);
  assert.equal(sediNota(60, 60, false), true);
});
