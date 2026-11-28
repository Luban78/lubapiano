import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import vm from "node:vm";

const zdroj = readFileSync(new URL("../dist/app.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../dist/index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../dist/style.css", import.meta.url), "utf8");

function nactiFunkci(jmeno, context) {
  const zacatek = zdroj.indexOf(`function ${jmeno}(`);
  const konec = zdroj.indexOf("\n}", zacatek) + 2;
  assert.ok(zacatek >= 0 && konec > zacatek, `${jmeno} v aplikaci chybí`);
  return vm.runInNewContext(`(${zdroj.slice(zacatek, konec)})`, context);
}

test("výsledky jsou přístupný modal skrytý až do dokončení", () => {
  assert.match(html, /id="resultOverlay" hidden/);
  assert.match(html, /role="dialog" aria-modal="true" aria-labelledby="resultTitle"/);
  for (const id of ["resultAccuracy", "resultCorrect", "resultWrong", "resultRecord", "resultAgain", "resultClose"]) {
    assert.ok(html.includes(`id="${id}"`), `chybí ${id}`);
  }
  assert.match(css, /\.result-overlay\[hidden\], \.result-record\[hidden\] \{ display: none; \}/);
  assert.match(css, /\.result-overlay \{ position: fixed; inset: 0; z-index: 30;/);
});

test("výsledkový modal přesně ukáže úspěšnost, počet chyb i rekord", () => {
  const make = () => ({textContent: "", hidden: true});
  let focus = 0;
  const ui = {
    resultOverlay: make(), resultTitle: make(), resultSummary: make(),
    resultAccuracy: make(), resultCorrect: make(), resultWrong: make(),
    resultRecord: make(), resultAgain: {focus: () => { focus += 1; }},
  };
  const zobrazVysledky = nactiFunkci("zobrazVysledky", {ui, CELKEM: 20});
  zobrazVysledky(20, 100, true, 100);
  assert.equal(ui.resultOverlay.hidden, false);
  assert.equal(ui.resultAccuracy.textContent, "100 %");
  assert.equal(ui.resultCorrect.textContent, "20");
  assert.equal(ui.resultWrong.textContent, "0");
  assert.match(ui.resultRecord.textContent, /Nový osobní rekord: 100 %/);
  assert.equal(ui.resultRecord.hidden, false);
  assert.match(ui.resultTitle.textContent, /Dokonalé/);
  assert.equal(focus, 1);
  zobrazVysledky(15, 75, false, 100);
  assert.equal(ui.resultWrong.textContent, "5");
  assert.match(ui.resultRecord.textContent, /Osobní rekord: 100 %/);
  zobrazVysledky(0, 0, false, null);
  assert.equal(ui.resultRecord.hidden, true, "bez localStorage se neukazuje falešný rekord");
});

test("konec cvičení uloží výsledek a otevře modal jen jednou", () => {
  let ulozeno = JSON.stringify({sessions: 2, best: 80});
  const modal = [];
  const ui = {pause: {disabled: false}, start: {disabled: true, textContent: ""}};
  const stav = {
    hotovo: false, bezi: true, rucnePozastaveno: true, cekamNaOpravu: false,
    ui, CELKEM: 20,
    cviceni: Array.from({length: 20}, (_, i) => ({stav: i < 17 ? "ok" : "miss"})),
    zmenaStatistik: () => {}, zpetnaVazba: () => {},
    zobrazVysledky: (...args) => modal.push(args),
    localStorage: {getItem: () => ulozeno, setItem: (_key, value) => { ulozeno = value; }},
  };
  const konciCviceni = nactiFunkci("konciCviceni", stav);
  konciCviceni();
  konciCviceni();
  assert.equal(stav.hotovo, true);
  assert.equal(stav.bezi, false);
  assert.equal(ui.pause.disabled, true);
  assert.equal(ui.start.textContent, "Hrát znovu");
  assert.equal(modal.length, 1, "druhé volání nesmí otevřít nový modal");
  assert.deepEqual([...modal[0]], [17, 85, true, 85]);
  assert.deepEqual(JSON.parse(ulozeno), {sessions: 3, best: 85, last: 85});
});
