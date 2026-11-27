"use strict";

// LubaPiano 0.1. All exercise generation and scoring happens on this device.
const SVG_NS = "http://www.w3.org/2000/svg";
const CELKEM = 20;
const NAZVY = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "B", "H"];
const PRIROZENE = ["C", "D", "E", "F", "G", "A", "H"];
const PRAHA_NOT = {
  treble: [60, 62, 64, 65, 67, 69, 71, 72],  // C4 – C5
  bass: [43, 45, 47, 48, 50, 52, 53, 55],     // G2 – G3
};
const BILE = new Set([0, 2, 4, 5, 7, 9, 11]);
const VYSKA_LINKY = 17;
const HORE = 64;
const DOLE = HORE + 4 * VYSKA_LINKY;

const ui = {
  shell: document.querySelector(".app-shell"),
  svg: document.getElementById("musicSheet"),
  feedback: document.getElementById("feedback"),
  progress: document.getElementById("progressText"),
  progressFill: document.getElementById("progressFill"),
  correct: document.getElementById("correctValue"),
  accuracy: document.getElementById("accuracyValue"),
  tempo: document.getElementById("tempoRange"),
  tempoValue: document.getElementById("tempoValue"),
  clefCaption: document.getElementById("clefCaption"),
  modeCaption: document.getElementById("modeCaption"),
  instructions: document.getElementById("playInstruction"),
  start: document.getElementById("startButton"),
  pause: document.getElementById("pauseButton"),
  next: document.getElementById("newButton"),
  focus: document.getElementById("focusButton"),
  keyboard: document.getElementById("virtualKeyboard"),
  names: document.getElementById("noteNames"),
  inputTitle: document.getElementById("inputTitle"),
  inputHint: document.getElementById("inputHint"),
  midi: document.getElementById("midiButton"),
  midiStatus: document.getElementById("midiStatus"),
  updateNotice: document.getElementById("updateNotice"),
  reload: document.getElementById("reloadButton"),
};

const volba = {mode: "moving", clef: "treble", answer: "keyboard", error: "continue", tempo: 55, orientation: "auto"};
let cviceni = [];
let index = 0;
let pozice = 0;
let posledniSnimek = 0;
let animaceBezi = false;
let spusteno = false;
let bezi = false;
let rucnePozastaveno = false;
let cekamNaOpravu = false;
let hotovo = false;
let stavSvg = null;
let midiPristup = null;
let midiVstup = null;
let midiAktivni = new Set();
let soustredeniRucne = false;

function svg(tag, atributy = {}, text = "") {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [nazev, hodnota] of Object.entries(atributy)) el.setAttribute(nazev, String(hodnota));
  if (text) el.textContent = text;
  return el;
}

function nazevNoty(midi) {
  return `${NAZVY[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

function jmenoBezOktavy(midi) { return NAZVY[midi % 12]; }

function sediNota(zahrana, cilova, jenNazev) {
  return jenNazev ? zahrana % 12 === cilova % 12 : zahrana === cilova;
}

function vyskaNoty(midi, klic) {
  const jmeno = NAZVY[midi % 12];
  const diatonicke = PRIROZENE.indexOf(jmeno);
  if (diatonicke < 0) return HORE + 2 * VYSKA_LINKY;
  const oktava = Math.floor(midi / 12) - 1;
  const odspodu = klic === "treble" ? 4 * 7 + 2 : 2 * 7 + 4;
  return DOLE - (oktava * 7 + diatonicke - odspodu) * (VYSKA_LINKY / 2);
}

function barvaNoty(polozka, aktualni) {
  if (polozka.stav === "ok") return "#6ee0b4";
  if (polozka.stav === "bad" || polozka.stav === "miss") return "#ff9e9e";
  return aktualni ? "#65deeb" : "#f1f7f8";
}

function vytvorNotu(polozka) {
  const y = vyskaNoty(polozka.midi, volba.clef);
  const skupina = svg("g");
  const linky = svg("g", {stroke: "#9dbcc3", "stroke-width": 1.7});
  if (y > DOLE) {
    for (let linka = DOLE + VYSKA_LINKY; linka <= y + .2; linka += VYSKA_LINKY) {
      linky.append(svg("line", {x1: -17, x2: 17, y1: linka, y2: linka}));
    }
  }
  if (y < HORE) {
    for (let linka = HORE - VYSKA_LINKY; linka >= y - .2; linka -= VYSKA_LINKY) {
      linky.append(svg("line", {x1: -17, x2: 17, y1: linka, y2: linka}));
    }
  }
  const nahoru = y >= HORE + 2 * VYSKA_LINKY;
  const hlavicka = svg("ellipse", {cx: 0, cy: y, rx: 12, ry: 8, transform: `rotate(-21 0 ${y})`});
  const stonek = svg("line", {
    x1: nahoru ? 10.5 : -10.5,
    x2: nahoru ? 10.5 : -10.5,
    y1: y,
    y2: nahoru ? y - 45 : y + 45,
    "stroke-width": 2.6, "stroke-linecap": "round",
  });
  skupina.append(linky, hlavicka, stonek);
  polozka.kresba = {skupina, hlavicka, stonek};
  return skupina;
}

function vykresliOsnovu() {
  const sirka = Math.max(280, Math.round(ui.svg.getBoundingClientRect().width || 720));
  const caraX = Math.max(112, Math.min(172, sirka * .32));
  const rozestup = sirka < 450 ? 75 : sirka < 800 ? 86 : 104;
  ui.svg.setAttribute("viewBox", `0 0 ${sirka} 215`);
  ui.svg.replaceChildren();

  const podklad = svg("g");
  podklad.append(svg("rect", {x: caraX - 17, y: HORE - 16, width: 34, height: 121, rx: 14, fill: "#55d6e6", opacity: ".12"}));
  for (let i = 0; i < 5; i += 1) {
    podklad.append(svg("line", {x1: 12, x2: sirka - 12, y1: HORE + i * VYSKA_LINKY, y2: HORE + i * VYSKA_LINKY, stroke: "#abc2c8", "stroke-width": 1.35}));
  }
  // Unicode music glyph; the fallback G/F label remains visible if a system lacks a music font.
  const symbol = volba.clef === "treble" ? "𝄞" : "𝄢";
  const znak = svg("text", {x: 20, y: volba.clef === "treble" ? 146 : 108, "font-family": "Noto Music, Segoe UI Symbol, serif", "font-size": volba.clef === "treble" ? 82 : 76, fill: "#e9f5f6"}, symbol);
  podklad.append(znak);
  const popisek = svg("text", {x: 33, y: 185, "text-anchor": "middle", "font-size": 11, "font-weight": "700", fill: "#9abdc5"}, volba.clef === "treble" ? "G" : "F");
  podklad.append(popisek);
  ui.svg.append(podklad);

  const skupinaNot = svg("g");
  for (const polozka of cviceni) skupinaNot.append(vytvorNotu(polozka));
  ui.svg.append(skupinaNot);
  ui.svg.append(svg("line", {x1: caraX, x2: caraX, y1: 34, y2: 165, stroke: "#61dce9", "stroke-width": 2.8, "stroke-linecap": "round"}));
  ui.svg.append(svg("path", {d: `M ${caraX-7} 30 L ${caraX+7} 30 L ${caraX} 39 Z`, fill: "#61dce9"}));
  stavSvg = {sirka, caraX, rozestup};
  posunNot();
}

function posunNot() {
  if (!stavSvg) return;
  for (let i = 0; i < cviceni.length; i += 1) {
    const polozka = cviceni[i];
    const x = stavSvg.caraX + (volba.mode === "moving" ? i + 3 - pozice : i - index) * stavSvg.rozestup;
    const viditelna = x >= -35 && x <= stavSvg.sirka + 35;
    polozka.kresba.skupina.setAttribute("visibility", viditelna ? "visible" : "hidden");
    if (!viditelna) continue;
    polozka.kresba.skupina.setAttribute("transform", `translate(${x.toFixed(2)} 0)`);
    const barva = barvaNoty(polozka, i === index);
    polozka.kresba.hlavicka.setAttribute("fill", barva);
    polozka.kresba.stonek.setAttribute("stroke", barva);
    polozka.kresba.skupina.setAttribute("opacity", polozka.stav ? .75 : i === index ? 1 : .93);
  }
}

function vygenerujCviceni() {
  const rozsah = PRAHA_NOT[volba.clef];
  const noty = [];
  let minula = -1;
  let predminula = -1;
  for (let i = 0; i < CELKEM; i += 1) {
    let nova = rozsah[Math.floor(Math.random() * rozsah.length)];
    let pokusy = 0;
    while ((nova === minula || (nova === predminula && Math.random() < .7)) && pokusy < 15) {
      nova = rozsah[Math.floor(Math.random() * rozsah.length)];
      pokusy += 1;
    }
    noty.push({midi: nova, stav: null, kresba: null});
    predminula = minula;
    minula = nova;
  }
  return noty;
}

function zpetnaVazba(text, druh = "") {
  ui.feedback.textContent = text;
  ui.feedback.className = `feedback ${druh}`;
}

function zmenaStatistik() {
  const spravne = cviceni.filter((nota) => nota.stav === "ok").length;
  const spatne = cviceni.filter((nota) => nota.stav === "bad" || nota.stav === "miss").length;
  const pokusy = spravne + spatne;
  ui.correct.textContent = String(spravne);
  ui.accuracy.textContent = pokusy ? `${Math.round(spravne / pokusy * 100)} %` : "—";
  ui.progress.textContent = `${index} / ${CELKEM} not`;
  ui.progressFill.style.width = `${index / CELKEM * 100}%`;
}

function pripravCviceni() {
  cviceni = vygenerujCviceni();
  index = 0;
  pozice = 0;
  posledniSnimek = 0;
  spusteno = false;
  bezi = false;
  rucnePozastaveno = false;
  cekamNaOpravu = false;
  hotovo = false;
  ui.start.textContent = "Začít cvičení";
  ui.start.disabled = false;
  ui.pause.disabled = true;
  ui.pause.textContent = "Pauza";
  ui.clefCaption.textContent = volba.clef === "treble" ? "𝄞 Houslový klíč" : "𝄢 Basový klíč";
  ui.modeCaption.textContent = volba.mode === "moving" ? "Noty přijíždějí zprava" : "Noty čekají na odpověď";
  ui.instructions.textContent = volba.mode === "moving" ? "Hraj u modré čáry. Očima už sleduj i další noty." : "Zahraj zvýrazněnou notu. Další přijde po tvé odpovědi.";
  zmenaStatistik();
  vykresliOsnovu();
  zpetnaVazba("Připraveno. Stiskni „Začít“ a hraj.");
}

function konciCviceni() {
  if (hotovo) return;
  hotovo = true;
  bezi = false;
  rucnePozastaveno = false;
  cekamNaOpravu = false;
  ui.pause.disabled = true;
  ui.start.disabled = false;
  ui.start.textContent = "Hrát znovu";
  zmenaStatistik();
  const spravne = cviceni.filter((nota) => nota.stav === "ok").length;
  const presnost = Math.round(spravne / CELKEM * 100);
  let rekord = false;
  try {
    const data = JSON.parse(localStorage.getItem("lubapiano-postup-01") || "{}");
    rekord = presnost > (data.best || 0);
    localStorage.setItem("lubapiano-postup-01", JSON.stringify({sessions: (data.sessions || 0) + 1, best: Math.max(data.best || 0, presnost), last: presnost}));
  } catch { /* Local storage is optional (privacy modes). */ }
  zpetnaVazba(`Hotovo! ${spravne} z ${CELKEM} správně (${presnost} %).${rekord ? " Nový osobní rekord! 🥳" : ""}`, "good");
}

function spustCviceni() {
  if (hotovo) pripravCviceni();
  if (spusteno && !hotovo) {
    // The pause button is responsible for resuming an existing run.
    if (!bezi && rucnePozastaveno) { pauza(); return; }
    return;
  }
  spusteno = true;
  if (window.innerWidth <= 760 && !soustredeniRucne) nastavSoustredeni(true);
  bezi = true;
  posledniSnimek = 0;
  ui.start.disabled = true;
  ui.pause.disabled = false;
  ui.pause.textContent = "Pauza";
  zpetnaVazba(volba.mode === "moving" ? "Jedeme! První nota přijede za tři doby. 🎹" : "Hraj první zvýrazněnou notu. 🎹");
  if (volba.mode === "moving") spustAnimaci();
}

function pauza() {
  if (!spusteno || hotovo || cekamNaOpravu) return;
  rucnePozastaveno = !rucnePozastaveno;
  bezi = !rucnePozastaveno;
  posledniSnimek = 0;
  ui.pause.textContent = rucnePozastaveno ? "Pokračovat" : "Pauza";
  zpetnaVazba(rucnePozastaveno ? "Pauza. Až budeš připravený, pokračuj." : "Pokračujeme! 🎹");
  if (bezi && volba.mode === "moving") spustAnimaci();
}

function zaznamenejZmeskanou() {
  const nota = cviceni[index];
  if (!nota) return;
  nota.stav = "miss";
  if (volba.error === "stop") {
    bezi = false;
    cekamNaOpravu = true;
    pozice = index + 3;
    zpetnaVazba("Nota ujela. Zahraj ji správně a pokračujeme.", "bad");
  } else {
    index += 1;
    zpetnaVazba("Nota ujela. Nic se neděje, čti dál.", "bad");
  }
  zmenaStatistik();
  if (index >= CELKEM) konciCviceni();
}

function animacniSmycka(cas) {
  animaceBezi = false;
  if (!bezi || hotovo || volba.mode !== "moving") return;
  if (posledniSnimek) pozice += Math.min(150, cas - posledniSnimek) / (60000 / volba.tempo);
  posledniSnimek = cas;
  while (bezi && index < CELKEM && pozice > index + 3 + .42) zaznamenejZmeskanou();
  posunNot();
  if (bezi && !hotovo) spustAnimaci();
}

function spustAnimaci() {
  if (animaceBezi || !bezi || hotovo || volba.mode !== "moving") return;
  animaceBezi = true;
  requestAnimationFrame(animacniSmycka);
}

function odpovez(midi, jenNazev = false) {
  if (!spusteno || hotovo) {
    zpetnaVazba("Nejdřív spusť cvičení, pak hraj. 🙂");
    return;
  }
  if (rucnePozastaveno) {
    zpetnaVazba("Cvičení je pozastavené. Klikni na Pokračovat.");
    return;
  }
  if (!bezi && !cekamNaOpravu) return;
  const nota = cviceni[index];
  if (!nota) return;
  if (volba.mode === "moving" && !cekamNaOpravu) {
    const predstih = index + 3 - pozice;
    if (predstih > 1.2) {
      zpetnaVazba("Ještě chvilku počkej, až nota přijede blíž k modré čáře.");
      return;
    }
    if (predstih < -.42) {
      zaznamenejZmeskanou();
      posunNot();
      return;
    }
  }
  const spravne = sediNota(midi, nota.midi, jenNazev);
  if (spravne) {
    const bylaChyba = Boolean(nota.stav);
    if (!nota.stav) nota.stav = "ok";
    index += 1;
    if (cekamNaOpravu) {
      cekamNaOpravu = false;
      bezi = true;
      posledniSnimek = 0;
      if (volba.mode === "moving") spustAnimaci();
    }
    zpetnaVazba(bylaChyba ? `Teď správně: ${nazevNoty(nota.midi)}. Pokračujeme!` : `Správně! ${nazevNoty(nota.midi)} ✓`, "good");
  } else {
    if (!nota.stav) nota.stav = "bad";
    const zahrana = jenNazev ? jmenoBezOktavy(midi) : nazevNoty(midi);
    if (volba.mode === "moving" && volba.error === "continue" && !cekamNaOpravu) {
      index += 1;
      zpetnaVazba(`Zahráno ${zahrana}, správně bylo ${nazevNoty(nota.midi)}. Čti dál.`, "bad");
    } else {
      if (volba.mode === "moving") {
        bezi = false;
        cekamNaOpravu = true;
        pozice = index + 3;
      }
      zpetnaVazba(`Zahráno ${zahrana}. Ještě ne, zkus stejnou notu znovu.`, "bad");
    }
  }
  zmenaStatistik();
  posunNot();
  if (index >= CELKEM) konciCviceni();
}

function vytvorKlaviaturu() {
  const zacatek = volba.clef === "treble" ? 60 : 36;
  ui.keyboard.replaceChildren();
  const sirka = ui.keyboard.clientWidth || 660;
  // Na úzkém displeji ukaž celou jedinou oktávu bez horizontálního posouvání.
  const kompaktni = sirka < 616;
  const konec = zacatek + (kompaktni ? 11 : 23);
  const bileW = sirka / (kompaktni ? 7 : 14);
  let bilyIndex = 0;
  for (let midi = zacatek; midi <= konec; midi += 1) {
    const bila = BILE.has(midi % 12);
    const klavesa = document.createElement("button");
    klavesa.type = "button";
    klavesa.className = `piano-key ${bila ? "white" : "black"}`;
    klavesa.dataset.midi = String(midi);
    klavesa.setAttribute("aria-label", `Nota ${jmenoBezOktavy(midi)} (libovolná oktáva)`);
    const klavesaSirka = bila ? bileW : bileW * .63;
    const left = bila ? bilyIndex * bileW : bilyIndex * bileW - klavesaSirka / 2;
    klavesa.style.width = `${klavesaSirka}px`;
    klavesa.style.left = `${left}px`;
    if (bila) {
      bilyIndex += 1;
      if (midi % 12 === 0) {
        const popis = document.createElement("span");
        popis.className = "piano-label";
        popis.textContent = "C";
        klavesa.append(popis);
      }
    }
    // Dotyk rozpoznává název tónu. USB MIDI vyhodnocuje přesnou výšku.
    klavesa.addEventListener("click", () => odpovez(midi, true));
    ui.keyboard.append(klavesa);
  }
  ui.keyboard.style.minWidth = "0";
}

function vytvorNazvy() {
  ui.names.replaceChildren();
  for (const jmeno of PRIROZENE) {
    const tlacitko = document.createElement("button");
    tlacitko.className = "name-key";
    tlacitko.type = "button";
    tlacitko.textContent = jmeno;
    const midi = PRAHA_NOT[volba.clef].find((n) => jmenoBezOktavy(n) === jmeno);
    if (midi !== undefined) tlacitko.addEventListener("click", () => odpovez(midi, true));
    ui.names.append(tlacitko);
  }
}

function prepniOdpoved() {
  const klaviatura = volba.answer === "keyboard";
  ui.keyboard.hidden = !klaviatura;
  ui.names.hidden = klaviatura;
  ui.inputTitle.textContent = klaviatura ? "Klaviatura" : "Názvy not";
  ui.inputHint.textContent = klaviatura ? "Dotyk: správný název noty platí v každé oktávě, bez posouvání klaviatury. MIDI piano: kontrolujeme i oktávu." : "Vyber C, D, E, F, G, A nebo H. V tomto režimu nezáleží na oktávě.";
}

function vyberTlacitko(typ, hodnota) {
  document.querySelectorAll(`button[data-${typ}]`).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset[typ] === hodnota)));
}

function zmenNastaveni(typ, hodnota) {
  volba[typ] = hodnota;
  vyberTlacitko(typ, hodnota);
  if (typ === "answer") { prepniOdpoved(); return; }
  if (typ === "error") return;
  if (typ === "clef") { vytvorKlaviaturu(); vytvorNazvy(); }
  pripravCviceni();
}

async function nastavOrientaci(orientace) {
  try {
    if (!screen.orientation?.lock || !screen.orientation?.unlock) throw new Error("Prohlížeč otočení neumožňuje.");
    if (orientace === "auto") screen.orientation.unlock();
    else await screen.orientation.lock(orientace);
    volba.orientation = orientace;
    vyberTlacitko("orientation", orientace);
    zpetnaVazba(orientace === "auto" ? "Automatická orientace je zapnutá." : "Orientace změněna.");
  } catch {
    volba.orientation = "auto";
    vyberTlacitko("orientation", "auto");
    zpetnaVazba("Prohlížeč nedovolil otočení. Otoč telefon ručně; rozložení se přizpůsobí.");
  }
}

function obarviMidiKlavesu(midi, stisknuta) {
  const klavesa = ui.keyboard.querySelector(`[data-midi="${midi}"]`);
  if (klavesa) klavesa.classList.toggle("active", stisknuta);
}

function prijmiMidi(event) {
  const zprava = event.data;
  if (zprava.length < 3) return;
  const typ = zprava[0] & 0xf0;
  const kanal = zprava[0] & 0x0f;
  const cislo = zprava[1];
  const rychlost = zprava[2];
  const identifikator = `${kanal}:${cislo}`;
  if (typ === 0x90 && rychlost > 0) {
    midiAktivni.add(identifikator);
    obarviMidiKlavesu(cislo, true);
    odpovez(cislo);
  } else if (typ === 0x80 || (typ === 0x90 && rychlost === 0)) {
    midiAktivni.delete(identifikator);
    const drziJinyKanal = [...midiAktivni].some((id) => id.endsWith(`:${cislo}`));
    if (!drziJinyKanal) obarviMidiKlavesu(cislo, false);
  }
}

async function obnovMidi() {
  if (!midiPristup) return;
  const vstupy = [...midiPristup.inputs.values()].filter((v) => v.state !== "disconnected");
  if (!vstupy.length) {
    if (midiVstup) midiVstup.removeEventListener("midimessage", prijmiMidi);
    midiVstup = null;
    midiAktivni.clear();
    ui.shell.classList.remove("midi-ready");
    ui.midiStatus.textContent = "Piano nenalezeno. Zkontroluj USB kabel.";
    return;
  }
  const vstup = vstupy[0];
  if (midiVstup && midiVstup.id === vstup.id && midiVstup.connection === "open") return;
  if (midiVstup) midiVstup.removeEventListener("midimessage", prijmiMidi);
  try {
    await vstup.open();
    midiVstup = vstup;
    midiVstup.addEventListener("midimessage", prijmiMidi);
    ui.midiStatus.textContent = `Připojeno: ${vstup.name || "USB MIDI"}`;
    ui.midi.textContent = "Znovu hledat";
    ui.shell.classList.add("midi-ready");
    zpetnaVazba("Kurzweil je připraven! 🎹 Můžeš hrát na skutečném pianu.", "good");
  } catch (chyba) {
    ui.midiStatus.textContent = `Nelze otevřít MIDI: ${chyba.message || chyba}`;
  }
}

async function pripojMidi() {
  if (!window.isSecureContext || typeof navigator.requestMIDIAccess !== "function") {
    ui.midiStatus.textContent = "Web MIDI není v tomto prohlížeči dostupné. Zkus Chrome na Androidu.";
    return;
  }
  ui.midi.disabled = true;
  ui.midi.textContent = "Připojuji…";
  try {
    if (!midiPristup) {
      midiPristup = await navigator.requestMIDIAccess({sysex: false});
      midiPristup.addEventListener("statechange", () => void obnovMidi());
    }
    await obnovMidi();
  } catch (chyba) {
    ui.midiStatus.textContent = `Nepřipojeno: ${chyba.name || chyba.message || "chyba"}. Zkontroluj oprávnění MIDI.`;
  } finally {
    ui.midi.disabled = false;
    if (ui.midi.textContent === "Připojuji…") ui.midi.textContent = "Znovu hledat";
  }
}

function nastavSoustredeni(aktivni) {
  ui.shell.classList.toggle("focus", aktivni);
  ui.focus.setAttribute("aria-pressed", String(aktivni));
  ui.focus.title = aktivni ? "Zobrazit celé ovládání" : "Soustředěný režim";
  ui.focus.innerHTML = aktivni ? "⊟ <span class=\"focus-label\">Zpět</span>" : "⛶ <span class=\"focus-label\">Soustředění</span>";
  requestAnimationFrame(vykresliOsnovu);
}

function pripravOvladani() {
  document.querySelectorAll("button[data-mode]").forEach((button) => button.addEventListener("click", () => zmenNastaveni("mode", button.dataset.mode)));
  document.querySelectorAll("button[data-clef]").forEach((button) => button.addEventListener("click", () => zmenNastaveni("clef", button.dataset.clef)));
  document.querySelectorAll("button[data-answer]").forEach((button) => button.addEventListener("click", () => zmenNastaveni("answer", button.dataset.answer)));
  document.querySelectorAll("button[data-error]").forEach((button) => button.addEventListener("click", () => zmenNastaveni("error", button.dataset.error)));
  document.querySelectorAll("button[data-orientation]").forEach((button) => button.addEventListener("click", () => void nastavOrientaci(button.dataset.orientation)));
  ui.tempo.addEventListener("input", () => {volba.tempo = Number(ui.tempo.value); ui.tempoValue.textContent = String(volba.tempo);});
  ui.start.addEventListener("click", spustCviceni);
  ui.pause.addEventListener("click", pauza);
  ui.next.addEventListener("click", pripravCviceni);
  ui.midi.addEventListener("click", () => void pripojMidi());
  ui.focus.addEventListener("click", () => {
    soustredeniRucne = true;
    nastavSoustredeni(!ui.shell.classList.contains("focus"));
  });
  window.addEventListener("resize", () => {
    vykresliOsnovu();
    vytvorKlaviaturu();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && bezi) pauza();
  });
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    const melStaryKontroler = Boolean(navigator.serviceWorker.controller);
    ui.reload.addEventListener("click", () => location.reload());
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (melStaryKontroler) ui.updateNotice.hidden = false;
    });
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
  }
}

pripravOvladani();
vytvorKlaviaturu();
vytvorNazvy();
prepniOdpoved();
pripravCviceni();
