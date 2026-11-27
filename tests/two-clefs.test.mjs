import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import vm from "node:vm";

const zdroj = readFileSync(new URL("../dist/app.js", import.meta.url), "utf8");
function funkce(jmeno, context = {}) {
  const zacatek = zdroj.indexOf(`function ${jmeno}(`);
  const konec = zdroj.indexOf("\n}", zacatek) + 2;
  assert.ok(zacatek >= 0 && konec > zacatek, `${jmeno} nenalezena`);
  return vm.runInNewContext(`(${zdroj.slice(zacatek, konec)})`, context);
}
const sediNota = funkce("sediNota");
const najdiCastDvojice = funkce("najdiCastDvojice", {sediNota});

test("MIDI rozezná noty obou rukou přesně podle oktávy", () => {
  const dvojice = {midi: 60, bassMidi: 48, splnene: new Set()};
  assert.equal(najdiCastDvojice(dvojice, 48, false), "bass");
  dvojice.splnene.add("bass");
  assert.equal(najdiCastDvojice(dvojice, 48, false), null);
  assert.equal(najdiCastDvojice(dvojice, 60, false), "treble");
});

test("dotyk dovolí odpovědět na dvojici postupně v libovolné oktávě", () => {
  const dvojice = {midi: 60, bassMidi: 48, splnene: new Set()};
  assert.equal(najdiCastDvojice(dvojice, 72, true), "treble");
  dvojice.splnene.add("treble");
  assert.equal(najdiCastDvojice(dvojice, 36, true), "bass");
  dvojice.splnene.add("bass");
  assert.equal(najdiCastDvojice(dvojice, 60, true), null);
});

test("nesprávná nota se do dvojice nezapočítá", () => {
  const dvojice = {midi: 64, bassMidi: 43, splnene: new Set()};
  assert.equal(najdiCastDvojice(dvojice, 60, true), null);
  assert.equal(najdiCastDvojice(dvojice, 43, false), "bass");
});

test("cvičení obou rukou připraví dvacet dvojic z odpovídajících rozsahů", () => {
  const rozsahy = {treble: [60, 62, 64, 65, 67, 69, 71, 72], bass: [43, 45, 47, 48, 50, 52, 53, 55]};
  const generuj = funkce("vygenerujCviceni", {volba: {clef: "both"}, PRAHA_NOT: rozsahy, CELKEM: 20, Math});
  const cviceni = generuj();
  assert.equal(cviceni.length, 20);
  for (const dvojice of cviceni) {
    assert.ok(rozsahy.treble.includes(dvojice.midi));
    assert.ok(rozsahy.bass.includes(dvojice.bassMidi));
    assert.equal(dvojice.splnene.size, 0);
  }
});

test("vykreslení dvou osnov vytvoří deset linek a oba notové klíče", () => {
  const prvky = [];
  const atributy = {};
  const kresli = (tag, attrs = {}, obsah = "") => {
    const prvek = {tag, attrs, obsah, deti: [], append(...deti) { this.deti.push(...deti); }};
    prvky.push(prvek);
    return prvek;
  };
  const svgElement = {
    getBoundingClientRect: () => ({width: 900, height: 225}),
    setAttribute: (jmeno, hodnota) => { atributy[jmeno] = hodnota; },
    replaceChildren: () => {},
    append: () => {},
  };
  const kresliOsnovu = funkce("vykresliOsnovu", {
    ui: {svg: svgElement}, volba: {clef: "both", preview: 3, mode: "moving"},
    cviceni: [], stavSvg: null, spusteno: false, hotovo: false, pozice: 0,
    rozvrhOsnovy: funkce("rozvrhOsnovy"), svg: kresli, posunNot: () => {},
  });
  kresliOsnovu();
  assert.equal(atributy.viewBox, "0 0 900 225");
  const linky = prvky.filter((p) => p.tag === "line" && p.attrs.stroke === "#abc2c8");
  assert.equal(linky.length, 10);
  const roztec = linky[1].attrs.y1 - linky[0].attrs.y1;
  const mezera = linky[5].attrs.y1 - linky[4].attrs.y1;
  assert.ok(mezera >= 2 * roztec, "klíče potřebují viditelný rozestup mezi osnovami");
  assert.equal(prvky.filter((p) => p.tag === "text" && p.obsah === "𝄞").length, 1);
  assert.equal(prvky.filter((p) => p.tag === "text" && p.obsah === "𝄢").length, 1);
});
