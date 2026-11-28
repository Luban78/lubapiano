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
const presnaDotykovaOdpoved = nactiFunkci("presnaDotykovaOdpoved", {jenJednaOktava});

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
    stavSvg: {sirka, ...rozvrh, skupinaNot: {setAttribute: () => {}}},
    cviceni, volba: {mode: "moving", preview: 1},
    index: 0, pozice: rozvrh.nastup + 0.3,
    barvaNoty: () => "#65deeb",
  });
  posunNot();
  assert.equal(viditelnost[2], "visible", "nota, která už vjela zprava, nesmí čekat skrytá na změnu indexu");
  assert.equal(viditelnost[3], "hidden", "nota daleko za pravým okrajem se nekreslí");
});

test("dvojitá klaviatura na šířku vyhodnocuje přesnou oktávu pouze v pokrytém rozsahu", () => {
  assert.equal(presnaDotykovaOdpoved(800, 900, 400, "treble"), true);
  assert.equal(presnaDotykovaOdpoved(800, 900, 400, "bass"), true);
  assert.equal(presnaDotykovaOdpoved(800, 900, 400, "both"), false, "oba klíče přesahují dvě oktávy");
  assert.equal(presnaDotykovaOdpoved(360, 390, 840, "treble"), false, "na výšku uznáváme oktávy z názvu");
  assert.equal(presnaDotykovaOdpoved(550, 900, 400, "bass"), false, "jedna oktáva nemůže vyhodnocovat celý rozsah");
});

test("dotykové C4 a C5 se na šířku rozlišují, ve střídání a na výšku zůstávají rovnocenné", () => {
  const odezvy = [];
  function postavKlaviaturu(sirka, vyska, klic) {
    const prvky = [];
    const klaviatura = {
      clientWidth: sirka, style: {},
      replaceChildren: () => { prvky.length = 0; },
      append: (p) => prvky.push(p),
    };
    const document = {createElement: () => ({
      dataset: {}, style: {}, deti: [],
      setAttribute(nazev, hodnota) { this[nazev] = hodnota; },
      addEventListener(nazev, fn) { if (nazev === "click") this.klik = fn; },
      append(prvek) { this.deti.push(prvek); },
    })};
    const f = nactiFunkci("vytvorKlaviaturu", {
      ui: {keyboard: klaviatura}, document,
      window: {innerWidth: sirka, innerHeight: vyska}, volba: {clef: klic},
      jenJednaOktava, presnaDotykovaOdpoved, BILE: new Set([0, 2, 4, 5, 7, 9, 11]),
      jmenoBezOktavy: (midi) => midi % 12 === 0 ? "C" : "D",
      nazevNoty: (midi) => `C${Math.floor(midi / 12) - 1}`,
      odpovez: (...args) => odezvy.push(args),
    });
    f();
    return prvky;
  }
  const houslovy = postavKlaviaturu(900, 400, "treble");
  houslovy[0].klik();
  houslovy[12].klik();
  assert.deepEqual(odezvy.splice(0), [[60, false], [72, false]]);
  assert.equal(houslovy[0]["aria-label"], "Nota C4");
  assert.equal(houslovy[12]["aria-label"], "Nota C5");
  const stridani = postavKlaviaturu(900, 400, "both");
  stridani[0].klik();
  stridani[12].klik();
  assert.deepEqual(odezvy.splice(0), [[36, true], [48, true]]);
  const portret = postavKlaviaturu(390, 840, "treble");
  portret[0].klik();
  assert.deepEqual(odezvy.splice(0), [[60, true]]);
});

test("animace posouvá jedinou SVG skupinu bez opakovaného přepisování not", () => {
  const posuny = [];
  const vykreslovani = [];
  const kresba = {
    skupina: {setAttribute: (name) => vykreslovani.push(name)},
    noty: [{hlavicka: {setAttribute: (name) => vykreslovani.push(name)}, stonek: {setAttribute: (name) => vykreslovani.push(name)}}],
  };
  const context = {
    stavSvg: {sirka: 768, caraX: 152, rozestup: 205, nastup: 3, skupinaNot: {setAttribute: (name, value) => posuny.push([name, value])}},
    volba: {mode: "moving", preview: 2}, pozice: 2.5, index: 0,
    cviceni: [{stav: "", kresba}], barvaNoty: () => "#65deeb",
  };
  const posunNot = nactiFunkci("posunNot", context);
  posunNot();
  const prvniZapis = vykreslovani.length;
  context.pozice += .01;
  posunNot();
  assert.equal(posuny.length, 2, "každý snímek posouvá jen rodiče");
  assert.notEqual(posuny[0][1], posuny[1][1]);
  assert.equal(vykreslovani.length, prvniZapis, "barva a viditelnost not se při pohybu znovu nepřepisují");
  assert.ok(!vykreslovani.includes("transform"), "každá nota zůstává na své místní souřadnici");
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
