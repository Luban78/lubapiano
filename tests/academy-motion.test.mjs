import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import vm from "node:vm";

const js = readFileSync(new URL("../dist/app.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../dist/index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../dist/style.css", import.meta.url), "utf8");

function zdrojFunkce(jmeno) {
  const zacatek = js.indexOf(`function ${jmeno}(`);
  const konec = js.indexOf("\n}", zacatek) + 2;
  assert.ok(zacatek >= 0 && konec > zacatek, `${jmeno} nenalezena`);
  return js.slice(zacatek, konec);
}

test("Akademie nabízí Klid i Pohyb s lokálně zapamatovaným tempem", () => {
  assert.match(html, /data-academy-mode="still"/);
  assert.match(html, /data-academy-mode="moving"/);
  assert.match(html, /id="academyTempoMinus"/);
  assert.match(html, /id="academyTempoPlus"/);
  assert.match(css, /\.academy-tempo\[hidden\] \{ display: none;/);
  const context = vm.createContext({
    AKADEMIE_VOLBY_KLIC: "akademie-test",
    localStorage: {getItem: () => JSON.stringify({mode: "still", tempo: 87})},
  });
  vm.runInContext(`${zdrojFunkce("omezTempo")}\n${zdrojFunkce("nactiVolbyAkademie")}`, context);
  assert.deepEqual(JSON.parse(JSON.stringify(context.nactiVolbyAkademie())), {mode: "still", tempo: 85});
  context.localStorage.getItem = () => "{bad json";
  assert.deepEqual(JSON.parse(JSON.stringify(context.nactiVolbyAkademie())), {mode: "moving", tempo: 55});
});

test("V Klidu nota neodskočí: celá skupina se posune přesně o rozestup za 320 ms", () => {
  const posuny = [];
  const snimky = [];
  const kresba = () => ({
    skupina: {setAttribute: () => {}},
    noty: [{hlavicka: {setAttribute: () => {}}, stonek: {setAttribute: () => {}}}],
  });
  const kontext = vm.createContext({
    volba: {mode: "still", preview: 3},
    index: 1,
    pozice: 0,
    animaceKlidu: null,
    stavSvg: {
      sirka: 700, caraX: 100, rozestup: 180, nastup: 3,
      skupinaNot: {setAttribute: (_, hodnota) => posuny.push(hodnota)},
    },
    cviceni: [0, 1, 2, 3].map(() => ({stav: null, kresba: kresba()})),
    barvaNoty: () => "#fff",
    window: {matchMedia: () => ({matches: false})},
    requestAnimationFrame: (callback) => snimky.push(callback),
    TRVANI_POSUNU_KLIDU: 320,
  });
  vm.runInContext(["posunNot", "zahajPosunKlidu", "animujKlid"].map(zdrojFunkce).join("\n"), kontext);
  kontext.zahajPosunKlidu();
  assert.equal(posuny.at(-1), "translate(100.00 0)", "na začátku nesmí nic skočit");
  snimky.shift()(1000);
  snimky.shift()(1160);
  assert.equal(posuny.at(-1), "translate(10.00 0)", "v polovině musí být nota na půli cesty");
  snimky.shift()(1320);
  assert.equal(posuny.at(-1), "translate(-80.00 0)", "nota plynule dojela na další krok");
  assert.equal(kontext.animaceKlidu, null);
  assert.equal(snimky.length, 0);
});

test("Rychlé opakované klepnutí během přejezdu nezapočítá další notu", () => {
  const kontext = {
    spusteno: true, hotovo: false, rucnePozastaveno: false,
    bezi: true, cekamNaOpravu: false,
    animaceKlidu: {aktualniX: 100},
    volba: {mode: "still"},
    index: 1,
    cviceni: [{midi: 64, stav: "ok"}, {midi: 67, stav: null}],
    zpetnaVazba: () => { throw new Error("během animace nemá být potřeba zpětná vazba"); },
  };
  vm.runInNewContext(`(${zdrojFunkce("odpovez")})`, kontext)(67);
  assert.equal(kontext.index, 1);
  assert.equal(kontext.cviceni[1].stav, null);
});

test("Předvolba omezeného pohybu přeskočí animaci a okamžitě ukáže další notu", () => {
  let posuny = 0;
  const kontext = {
    stavSvg: {caraX: 100, rozestup: 180}, volba: {mode: "still"},
    window: {matchMedia: () => ({matches: true})},
    index: 1, posunNot: () => { posuny += 1; },
    requestAnimationFrame: () => { throw new Error("při reduced-motion se RAF nespouští"); },
  };
  vm.runInNewContext(`(${zdrojFunkce("zahajPosunKlidu")})`, kontext)();
  assert.equal(posuny, 1);
});
