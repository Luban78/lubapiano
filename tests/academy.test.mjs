import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import vm from "node:vm";

const js = readFileSync(new URL("../dist/app.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../dist/index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../dist/style.css", import.meta.url), "utf8");
const zacatek = js.indexOf("const LEKCE = [");
const konec = js.indexOf("\n];", zacatek) + 3;
const LEKCE = vm.runInNewContext(`${js.slice(zacatek, konec)}\nLEKCE`);

function funkce(jmeno, context = {}) {
  const zac = js.indexOf(`function ${jmeno}(`);
  const kon = js.indexOf("\n}", zac) + 2;
  assert.ok(zac >= 0 && kon > zac, `Chybí ${jmeno}`);
  return vm.runInNewContext(`(${js.slice(zac, kon)})`, context);
}

test("Akademie má čtyři postupné lekce v houslovém klíči a volný trénink zůstává", () => {
  assert.equal(LEKCE.length, 4);
  assert.deepEqual(Array.from(LEKCE[0].noty), [64, 65, 67]);
  assert.ok(LEKCE[1].noty.length > LEKCE[0].noty.length);
  assert.match(html, /data-learning="academy"/);
  assert.match(html, /data-learning="free"/);
  assert.match(html, /id="lessonPractice"/);
  assert.match(html, /id="lessonExam"/);
  assert.match(css, /\.app-shell\.focus \.learning-switch, \.app-shell\.focus \.academy-panel \{ display: none;/);
  assert.match(js, /prepniVyuku\("academy"\);/);
});

test("Postup Akademie ignoruje poškozená data a drží se nejvýše dvou zkoušek", () => {
  const ulozene = {zkousky: [2, 99, -4, "2"]};
  const nacti = funkce("nactiPostupAkademie", {
    localStorage: {getItem: () => JSON.stringify(ulozene)},
    AKADEMIE_KLIC: "test", LEKCE,
  });
  assert.deepEqual(Array.from(nacti().zkousky), [2, 2, 0, 0]);
  const chyba = funkce("nactiPostupAkademie", {
    localStorage: {getItem: () => "{bad json"},
    AKADEMIE_KLIC: "test", LEKCE,
  });
  assert.deepEqual(Array.from(chyba().zkousky), [0, 0, 0, 0]);
});

test("Další lekce se odemkne až po dvou bezchybných zkouškách", () => {
  const postupAkademie = {zkousky: [0, 0, 0, 0]};
  const lekceOdemcena = funkce("lekceOdemcena", {postupAkademie});
  assert.equal(lekceOdemcena(0), true);
  assert.equal(lekceOdemcena(1), false);
  postupAkademie.zkousky[0] = 1;
  assert.equal(lekceOdemcena(1), false);
  postupAkademie.zkousky[0] = 2;
  assert.equal(lekceOdemcena(1), true);
  assert.equal(lekceOdemcena(2), false);
});

test("Cvičení a neúplná zkouška neodemknou lekci; dvě 100% zkoušky ano", () => {
  const postupAkademie = {zkousky: [0, 0, 0, 0]};
  const ulozeni = [];
  const ui = {
    resultTitle: {textContent: ""}, resultSummary: {textContent: ""},
    resultAgain: {textContent: ""}, resultRecord: {hidden: false},
    academyCoach: {textContent: ""},
  };
  let rezim = "practice";
  const kontext = {
    akademieAktivni: true, get lekceRezim() { return rezim; },
    vybranaLekce: 0, postupAkademie, LEKCE, CELKEM: 20, ui,
    cviceni: Array.from({length: 20}, (_, i) => ({midi: i === 0 ? 65 : 64, stav: i === 0 ? "bad" : "ok"})),
    jmenoBezOktavy: (n) => n === 65 ? "F" : "E",
    ulozPostupAkademie: () => { ulozeni.push([...postupAkademie.zkousky]); return true; },
    vykresliAkademii: () => {},
  };
  const vyhodnot = funkce("vyhodnotLekci", kontext);
  vyhodnot(19, 95);
  assert.equal(postupAkademie.zkousky[0], 0);
  assert.equal(ulozeni.length, 0);
  rezim = "exam";
  vyhodnot(19, 95);
  assert.equal(postupAkademie.zkousky[0], 0);
  assert.match(ui.resultSummary.textContent, /F/);
  kontext.cviceni[0].stav = "ok";
  vyhodnot(20, 100);
  assert.equal(postupAkademie.zkousky[0], 1);
  assert.match(ui.resultSummary.textContent, /Ještě druhá/);
  vyhodnot(20, 100);
  assert.equal(postupAkademie.zkousky[0], 2);
  assert.match(ui.resultAgain.textContent, /Další lekce/);
  vyhodnot(20, 100);
  assert.equal(postupAkademie.zkousky[0], 2);
  assert.equal(ulozeni.length, 2);
});
