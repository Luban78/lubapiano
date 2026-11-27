import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import vm from "node:vm";

const zdroj = readFileSync(new URL("../dist/app.js", import.meta.url), "utf8");
function nactiFunkci(jmeno, context = {}) {
  const zacatek = zdroj.indexOf(`function ${jmeno}(`);
  const konec = zdroj.indexOf("\n}", zacatek) + 2;
  assert.ok(zacatek >= 0 && konec > zacatek, `${jmeno} v aplikaci chybí`);
  return vm.runInNewContext(`(${zdroj.slice(zacatek, konec)})`, context);
}

const rozvrhOsnovy = nactiFunkci("rozvrhOsnovy");
const omezTempo = nactiFunkci("omezTempo");
const jeKompaktniDisplej = nactiFunkci("jeKompaktniDisplej");
const jenJednaOktava = nactiFunkci("jenJednaOktava", {jeKompaktniDisplej});

test("na úzkém mobilu je první pohyblivá nota vidět hned od začátku", () => {
  for (const sirka of [280, 320, 360, 390, 430]) {
    for (const nahled of [1, 2, 3, 4]) {
      const {caraX, rozestup, nastup} = rozvrhOsnovy(sirka, nahled);
      const prvniNota = caraX + nastup * rozestup;
      assert.ok(prvniNota < sirka - 5, `šířka ${sirka}, náhled ${nahled}: nota za okrajem`);
      assert.ok(caraX > 100, "čtecí čára ponechává místo pro klíč");
      assert.ok(rozestup >= 39, "noty se nesmí stlačit přes sebe");
      assert.ok(nastup >= 1.1 && nastup <= 3, "přiměřený nástupní čas");
    }
  }
});

test("větší výhled na stejném displeji přibližuje noty, ne čtecí čáru", () => {
  const male = rozvrhOsnovy(360, 1);
  const velke = rozvrhOsnovy(360, 4);
  assert.equal(male.caraX, velke.caraX);
  assert.ok(male.rozestup > velke.rozestup);
});

test("rychlá změna tempa drží 20–140 not/min a kroky po pěti", () => {
  assert.equal(omezTempo(18), 20);
  assert.equal(omezTempo(56), 55);
  assert.equal(omezTempo(59), 60);
  assert.equal(omezTempo(143), 140);
});

test("mobilní landscape zobrazuje jednu oktávu se sedmi širokými bílými klávesami", () => {
  assert.equal(jenJednaOktava(900, 900, 400), true);
  assert.equal(jenJednaOktava(700, 390, 820), true);
  assert.equal(jenJednaOktava(700, 1200, 800), false);
});
