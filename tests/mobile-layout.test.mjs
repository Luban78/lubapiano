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

test("první pohyblivá nota začíná až za pravým okrajem na výšku i na šířku", () => {
  for (const sirka of [280, 320, 360, 390, 430, 768, 900, 1536]) {
    for (const nahled of [1, 2, 3, 4]) {
      const {caraX, rozestup, nastup} = rozvrhOsnovy(sirka, nahled);
      const prvniNota = caraX + nastup * rozestup;
      const posledniVNahledu = caraX + nahled * rozestup;
      assert.ok(prvniNota >= sirka + 12, `šířka ${sirka}, náhled ${nahled}: první nota už je na obrazovce`);
      assert.ok(posledniVNahledu <= sirka - 5, `šířka ${sirka}, náhled ${nahled}: výhled se nevejde`);
      assert.ok(caraX > 100, "čtecí čára ponechává místo pro klíč");
      assert.ok(rozestup >= 39, "noty se nesmí stlačit přes sebe");
      assert.equal(nastup, nahled + 1, "počet dob do příjezdu první noty odpovídá výhledu");
    }
  }
});

test("další pohyblivá nota vjíždí plynule zprava i před změnou indexu", () => {
  const sirka = 768;
  const rozvrh = rozvrhOsnovy(sirka, 1);
  const viditelnost = [];
  const cviceni = Array.from({length: 4}, (_, i) => ({
    stav: "",
    kresba: {skupina: {
      setAttribute: (nazev, hodnota) => {
        if (nazev === "visibility") viditelnost[i] = hodnota;
      },
    }, noty: []},
  }));
  const posunNot = nactiFunkci("posunNot", {
    stavSvg: {sirka, ...rozvrh},
    cviceni, volba: {mode: "moving", preview: 1},
    index: 0, pozice: rozvrh.nastup + 0.3,
  });
  posunNot();
  assert.equal(viditelnost[2], "visible", "nota, která už vjela zprava, nesmí čekat skrytá na změnu indexu");
  assert.equal(viditelnost[3], "hidden", "nota daleko za pravým okrajem se nekreslí");
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

test("landscape s plnou šířkou má dvě oktávy, úzký telefon jednu", () => {
  assert.equal(jenJednaOktava(900, 900, 400), false);
  assert.equal(jenJednaOktava(350, 390, 820), true);
  assert.equal(jenJednaOktava(700, 1200, 800), false);
  assert.equal(jenJednaOktava(360, 360, 800), true);
});

test("úzký telefon skládá výběr tří notových klíčů do celé řady", () => {
  const css = readFileSync(new URL("../dist/style.css", import.meta.url), "utf8");
  assert.match(css, /@media \(max-width: 460px\) \{[\s\S]*?\.setup-grid \{ grid-template-columns: minmax\(0, 1fr\); \}/);
  assert.match(css, /\.setup-grid \.segment \{ min-width: 0; \}/);
});
