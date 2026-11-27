import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import vm from "node:vm";

const zdroj = readFileSync(new URL("../dist/app.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../dist/style.css", import.meta.url), "utf8");
function funkce(jmeno, context = {}) {
  const podpis = jmeno === "nastavOrientaci" ? `async function ${jmeno}(` : `function ${jmeno}(`;
  const zacatek = zdroj.indexOf(podpis);
  const konec = zdroj.indexOf("\n}", zacatek) + 2;
  assert.ok(zacatek >= 0 && konec > zacatek, `${jmeno} nenalezena`);
  return vm.runInNewContext(`(${zdroj.slice(zacatek, konec)})`, context);
}

test("tlačítko nabídne otočení podle aktuální orientace telefonu", () => {
  const cilOtoceni = funkce("cilOtoceni");
  assert.equal(cilOtoceni(390, 840), "landscape");
  assert.equal(cilOtoceni(840, 390), "portrait");
});

test("automatické soustředění funguje i na širokém telefonu", () => {
  const kompaktni = funkce("jeKompaktniDisplej");
  assert.equal(kompaktni(390, 840), true);
  assert.equal(kompaktni(900, 400), true);
  assert.equal(kompaktni(1200, 800), false);
});

test("landscape má osnovu nad klaviaturou přes celou šířku", () => {
  assert.match(css, /\(orientation: landscape\) and \(max-height: 650px\)/);
  assert.match(css, /\.app-shell\.focus main \{ display: flex; flex-direction: column; align-items: stretch; gap: 4px;/);
  assert.match(css, /\.app-shell\.focus \.practice-area \{ position: relative; display: flex; flex: 1 1 auto; flex-direction: column; align-self: stretch; width: 100%;/);
  assert.match(css, /\.app-shell\.focus \.input-card \{ width: 100%; flex: 0 0 auto;/);
  assert.match(css, /\.app-shell\.focus \.virtual-keyboard \{ width: 100%;/);
  assert.match(css, /\.app-shell\.focus \.feedback-row \{ position: static; flex: 0 0 auto; width: 100%; height: 30px;/);
  assert.doesNotMatch(css, /\.app-shell\.focus \.practice-area \{ display: contents; \}/);
  assert.match(css, /\.app-shell\.focus \.update-notice \{ display: none; \}/);
});

test("tempo i ovládání se na šířku přesune nahoru, po návratu zpět", () => {
  const tempo = {parentElement: null};
  const play = {parentElement: null};
  const topActions = {prepend: (node) => { node.parentElement = topActions; }};
  const headingRight = {append: (node) => { node.parentElement = headingRight; }};
  const practiceArea = {append: (node) => { node.parentElement = practiceArea; }};
  tempo.parentElement = headingRight;
  play.parentElement = practiceArea;
  const window = {innerWidth: 900, innerHeight: 400};
  const preloz = funkce("prelozTempo", {
    ui: {quickTempo: tempo, playActions: play, topActions, practiceHeadingRight: headingRight, practiceArea, shell: {classList: {contains: () => true}}},
    window,
  });
  preloz();
  assert.equal(tempo.parentElement, topActions);
  assert.equal(play.parentElement, topActions);
  window.innerWidth = 390;
  window.innerHeight = 820;
  preloz();
  assert.equal(tempo.parentElement, headingRight);
  assert.equal(play.parentElement, practiceArea);
});

test("otočení tlačítkem vyžádá fullscreen před zamknutím orientace", async () => {
  const volani = [];
  const document = {
    fullscreenElement: null,
    documentElement: {requestFullscreen: async () => {
      volani.push("fullscreen");
      document.fullscreenElement = {};
    }},
  };
  const stav = {orientation: "auto"};
  const nastav = funkce("nastavOrientaci", {
    screen: {orientation: {lock: async (orientace) => volani.push(`lock:${orientace}`), unlock: () => {}}},
    document,
    volba: stav,
    bezi: false,
    fullscreenKvuliOtoceni: false,
    vyberTlacitko: () => {},
    zpetnaVazba: () => {},
    aktualizujTlacitkoOtoceni: () => {},
    requestAnimationFrame: (fn) => fn(),
    vykresliOsnovu: () => {},
    vytvorKlaviaturu: () => {},
    ui: {shell: {classList: {contains: () => false}}},
  });
  await nastav("landscape", true);
  assert.deepEqual(volani, ["fullscreen", "lock:landscape"]);
  assert.equal(stav.orientation, "landscape");
});

test("zamítnuté otočení vrátí aplikaci z fullscreen a neschová chybu", async () => {
  let zprava = "";
  let ukonceno = false;
  const document = {
    fullscreenElement: null,
    documentElement: {requestFullscreen: async () => { document.fullscreenElement = {}; }},
    exitFullscreen: async () => { ukonceno = true; document.fullscreenElement = null; },
  };
  const stav = {orientation: "auto"};
  const nastav = funkce("nastavOrientaci", {
    screen: {orientation: {lock: async () => { throw new Error("denied"); }, unlock: () => {}}},
    document,
    volba: stav,
    bezi: false,
    fullscreenKvuliOtoceni: false,
    vyberTlacitko: () => {},
    zpetnaVazba: (text) => { zprava = text; },
    aktualizujTlacitkoOtoceni: () => {},
    requestAnimationFrame: (fn) => fn(),
    vykresliOsnovu: () => {},
    vytvorKlaviaturu: () => {},
    ui: {shell: {classList: {contains: () => false}}},
  });
  await nastav("landscape", true);
  assert.equal(ukonceno, true);
  assert.match(zprava, /nepovolil/i);
  assert.equal(stav.orientation, "auto");
});
