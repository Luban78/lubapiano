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
const rozsahy = {treble: [60, 62, 64, 65, 67, 69, 71, 72], bass: [43, 45, 47, 48, 50, 52, 53, 55]};
const bezPomocnych = {treble: [64, 65, 67, 69, 71, 72, 74, 76, 77], bass: [43, 45, 47, 48, 50, 52, 53, 55, 57]};
const rozsahProCviceni = funkce("rozsahProCviceni", {PRAHA_NOT: rozsahy, NOTY_BEZ_POMOCNYCH: bezPomocnych});

function generujNaDispleji(sirka, vyska) {
  const generuj = funkce("vygenerujCviceni", {
    volba: {clef: "both"}, PRAHA_NOT: rozsahy, CELKEM: 20, Math,
    window: {innerWidth: sirka, innerHeight: vyska}, rozsahProCviceni,
  });
  return generuj();
}

test("střídání čte vždy jen jednu notu v jednom klíči", () => {
  const cviceni = generujNaDispleji(390, 850);
  assert.equal(cviceni.length, 20);
  assert.equal(cviceni.filter((nota) => nota.klic === "treble").length, 10);
  assert.equal(cviceni.filter((nota) => nota.klic === "bass").length, 10);
  for (const nota of cviceni) {
    assert.ok(rozsahy[nota.klic].includes(nota.midi));
    assert.equal(nota.bassMidi, undefined);
  }
});

test("pořadí obou klíčů je náhodné, ale není v něm dlouhá série", () => {
  for (let pokus = 0; pokus < 10; pokus += 1) {
    const cviceni = generujNaDispleji(390, 850);
    for (let i = 2; i < cviceni.length; i += 1) {
      assert.ok(!(cviceni[i].klic === cviceni[i - 1].klic && cviceni[i].klic === cviceni[i - 2].klic));
    }
  }
});

test("na šířku se používá jen rozsah uvnitř osnov, na výšku i pomocné linky", () => {
  assert.ok(rozsahProCviceni("treble", true, false).includes(60));
  assert.ok(!rozsahProCviceni("treble", true, true).includes(60));
  const landscape = generujNaDispleji(900, 400);
  for (const nota of landscape) assert.ok(bezPomocnych[nota.klic].includes(nota.midi));
});

test("dvojitá osnova kreslí u každého kroku jedinou notu", () => {
  const kreslene = [];
  const vytvor = funkce("vytvorNotu", {
    volba: {clef: "both"},
    svg: () => ({append: () => {}}),
    kresliJednuNotu: (midi, klic, top, roztec) => {
      kreslene.push({midi, klic, top, roztec});
      return {skupina: {}, klic};
    },
  });
  const rozvrh = {trebleTop: 20, bassTop: 110, dualRoztec: 14};
  const nota = {midi: 43, klic: "bass"};
  vytvor(nota, rozvrh);
  assert.equal(nota.kresba.noty.length, 1);
  assert.deepEqual(kreslene, [{midi: 43, klic: "bass", top: 110, roztec: 14}]);
});

test("nožičky not ve dvojité osnově jsou delší než původních 27 jednotek", () => {
  const kresli = funkce("kresliJednuNotu", {
    vyskaNoty: () => 100,
    svg: (tag, attrs) => ({tag, attrs, append: () => {}}),
  });
  const nota = kresli(64, "treble", 50, 17, true);
  assert.ok(Math.abs(nota.stonek.attrs.y2 - nota.stonek.attrs.y1) >= 45);
});

test("jedna správná odpověď dokončí jediný krok střídání klíčů", () => {
  const nota = {midi: 64, klic: "treble", stav: null};
  const context = {
    spusteno: true, hotovo: false, rucnePozastaveno: false,
    bezi: true, cekamNaOpravu: false, cviceni: [nota], index: 0, CELKEM: 20,
    volba: {clef: "both", mode: "still", error: "continue"}, sediNota: funkce("sediNota"),
    nazevNoty: () => "E4", zpetnaVazba: () => {}, zmenaStatistik: () => {},
    posunNot: () => {}, konciCviceni: () => {},
  };
  const odpovez = funkce("odpovez", context);
  odpovez(64, false);
  assert.equal(context.index, 1);
  assert.equal(nota.stav, "ok");
});

test("chybné MIDI v druhém klíči se nepočítá jako správná nota", () => {
  const nota = {midi: 43, klic: "bass", stav: null};
  const context = {
    spusteno: true, hotovo: false, rucnePozastaveno: false,
    bezi: true, cekamNaOpravu: false, cviceni: [nota], index: 0, CELKEM: 20,
    volba: {clef: "both", mode: "still", error: "continue"}, sediNota: funkce("sediNota"),
    nazevNoty: () => "G2", jmenoBezOktavy: () => "C", zpetnaVazba: () => {},
    zmenaStatistik: () => {}, posunNot: () => {}, konciCviceni: () => {},
  };
  const odpovez = funkce("odpovez", context);
  odpovez(60, false);
  assert.equal(context.index, 0);
  assert.equal(nota.stav, "bad");
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
