"use strict";

// LubaPiano 0.1.5.1. All exercise generation and scoring happens on this device.
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
  tempoMinus: document.getElementById("tempoMinus"),
  tempoPlus: document.getElementById("tempoPlus"),
  quickTempoValue: document.getElementById("quickTempoValue"),
  quickTempo: document.getElementById("quickTempo"),
  topActions: document.getElementById("topActions"),
  practiceHeadingRight: document.getElementById("practiceHeadingRight"),
  practiceArea: document.getElementById("practiceArea"),
  playActions: document.getElementById("playActions"),
  preview: document.getElementById("previewRange"),
  previewValue: document.getElementById("previewValue"),
  clefCaption: document.getElementById("clefCaption"),
  modeCaption: document.getElementById("modeCaption"),
  instructions: document.getElementById("playInstruction"),
  start: document.getElementById("startButton"),
  pause: document.getElementById("pauseButton"),
  next: document.getElementById("newButton"),
  focus: document.getElementById("focusButton"),
  rotate: document.getElementById("rotateButton"),
  rotateLabel: document.getElementById("rotateLabel"),
  keyboard: document.getElementById("virtualKeyboard"),
  names: document.getElementById("noteNames"),
  inputTitle: document.getElementById("inputTitle"),
  inputHint: document.getElementById("inputHint"),
  midi: document.getElementById("midiButton"),
  midiStatus: document.getElementById("midiStatus"),
  updateNotice: document.getElementById("updateNotice"),
  reload: document.getElementById("reloadButton"),
};

const volba = {mode: "moving", clef: "treble", answer: "keyboard", error: "continue", tempo: 55, preview: 3, orientation: "auto"};
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
let fullscreenKvuliOtoceni = false;

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

function najdiCastDvojice(polozka, zahrana, jenNazev) {
  if (!polozka.splnene.has("treble") && sediNota(zahrana, polozka.midi, jenNazev)) return "treble";
  if (!polozka.splnene.has("bass") && sediNota(zahrana, polozka.bassMidi, jenNazev)) return "bass";
  return null;
}

function omezTempo(tempo) {
  return Math.max(20, Math.min(140, Math.round(tempo / 5) * 5));
}

function jeKompaktniDisplej(sirka, vyska) {
  return sirka <= 760 || (sirka > vyska && vyska <= 650);
}

function jenJednaOktava(sirkaKlaviatury, sirkaOkna, vyskaOkna) {
  return sirkaKlaviatury < 616;
}

// Na telefonu se noty přizpůsobí šířce. Aktuální nota a zvolený výhled
// zůstávají čitelné bez horizontálního scrollování.
function rozvrhOsnovy(sirka, preview) {
  const caraX = Math.max(104, Math.min(152, sirka * .31));
  const rozestup = Math.max(39, Math.min(104, (sirka - caraX - 20) / (preview + .35)));
  const nastup = Math.min(3, Math.max(1.1, (sirka - caraX - 24) / rozestup - .25));
  return {caraX, rozestup, nastup};
}

function vyskaNoty(midi, klic, horni = HORE, roztec = VYSKA_LINKY) {
  const jmeno = NAZVY[midi % 12];
  const diatonicke = PRIROZENE.indexOf(jmeno);
  if (diatonicke < 0) return horni + 2 * roztec;
  const oktava = Math.floor(midi / 12) - 1;
  const odspodu = klic === "treble" ? 4 * 7 + 2 : 2 * 7 + 4;
  return horni + 4 * roztec - (oktava * 7 + diatonicke - odspodu) * (roztec / 2);
}

function barvaNoty(polozka, aktualni, cast = "treble") {
  if (polozka.splnene?.has(cast)) return "#6ee0b4";
  if (polozka.stav === "ok") return "#6ee0b4";
  if (polozka.stav === "bad" || polozka.stav === "miss") return "#ff9e9e";
  return aktualni ? "#65deeb" : "#f1f7f8";
}

function kresliJednuNotu(midi, klic, horni, roztec, mala = false) {
  const y = vyskaNoty(midi, klic, horni, roztec);
  const skupina = svg("g");
  const linky = svg("g", {stroke: "#9dbcc3", "stroke-width": mala ? 1.2 : 1.7});
  const spodni = horni + 4 * roztec;
  const polovina = mala ? 12 : 17;
  if (y > spodni) {
    for (let linka = spodni + roztec; linka <= y + .2; linka += roztec) {
      linky.append(svg("line", {x1: -polovina, x2: polovina, y1: linka, y2: linka}));
    }
  }
  if (y < horni) {
    for (let linka = horni - roztec; linka >= y - .2; linka -= roztec) {
      linky.append(svg("line", {x1: -polovina, x2: polovina, y1: linka, y2: linka}));
    }
  }
  const nahoru = y >= horni + 2 * roztec;
  const radius = mala ? 9 : 12;
  const hlavicka = svg("ellipse", {cx: 0, cy: y, rx: radius, ry: mala ? 5.8 : 8, transform: `rotate(-21 0 ${y})`});
  const stonek = svg("line", {
    x1: nahoru ? radius - 1 : 1 - radius,
    x2: nahoru ? radius - 1 : 1 - radius,
    y1: y,
    y2: nahoru ? y - (mala ? 27 : 45) : y + (mala ? 27 : 45),
    "stroke-width": mala ? 1.8 : 2.6, "stroke-linecap": "round",
  });
  skupina.append(linky, hlavicka, stonek);
  return {skupina, hlavicka, stonek, klic};
}

function vytvorNotu(polozka, rozvrh) {
  const skupina = svg("g");
  const noty = volba.clef === "both"
    ? [kresliJednuNotu(polozka.midi, "treble", rozvrh.trebleTop, rozvrh.dualRoztec, true),
       kresliJednuNotu(polozka.bassMidi, "bass", rozvrh.bassTop, rozvrh.dualRoztec, true)]
    : [kresliJednuNotu(polozka.midi, volba.clef, HORE, VYSKA_LINKY)];
  for (const nota of noty) skupina.append(nota.skupina);
  polozka.kresba = {skupina, noty};
  return skupina;
}

function vykresliOsnovu() {
  const sirka = Math.max(280, Math.round(ui.svg.getBoundingClientRect().width || 720));
  const vyska = Math.max(125, Math.round(ui.svg.getBoundingClientRect().height || 215));
  const {caraX, rozestup, nastup} = rozvrhOsnovy(sirka, volba.preview);
  const dvojita = volba.clef === "both";
  // Velké fontové symboly klíčů nesmí zasahovat do druhé osnovy.
  // Na krátkém landscape se proto zmenšuje rozteč, mezera mezi
  // osnovami však zůstává větší než dva řádky notové osnovy.
  const dualRoztec = Math.max(9, Math.min(17, (vyska - 42) / 11));
  const mezera = Math.max(25, dualRoztec * 2.6);
  const trebleTop = Math.max(8, (vyska - 8 * dualRoztec - mezera) / 2);
  const bassTop = trebleTop + 4 * dualRoztec + mezera;
  const rozvrh = {trebleTop, bassTop, dualRoztec};
  if (stavSvg && spusteno && !hotovo && volba.mode === "moving") {
    // Otočení telefonu ani změna výhledu nesmí přeskočit právě čtenou notu.
    pozice += nastup - stavSvg.nastup;
  }
  // Poměr viewBoxu odpovídá skutečnému prostoru: noty se při změně výšky
  // obrazovky neškálují a na úzkém telefonu zůstává využitá celá šířka.
  ui.svg.setAttribute("viewBox", dvojita ? `0 0 ${sirka} ${vyska}` : `0 ${Math.round((215 - vyska) / 2)} ${sirka} ${vyska}`);
  ui.svg.replaceChildren();

  const podklad = svg("g");
  const osnovy = dvojita
    ? [{klic: "treble", top: trebleTop, roztec: dualRoztec}, {klic: "bass", top: bassTop, roztec: dualRoztec}]
    : [{klic: volba.clef, top: HORE, roztec: VYSKA_LINKY}];
  const prvniTop = osnovy[0].top;
  const posledniSpodek = osnovy.at(-1).top + 4 * osnovy.at(-1).roztec;
  podklad.append(svg("rect", {x: caraX - 17, y: prvniTop - 9, width: 34, height: posledniSpodek - prvniTop + 18, rx: 14, fill: "#55d6e6", opacity: ".12"}));
  for (const osnova of osnovy) {
    for (let i = 0; i < 5; i += 1) {
      podklad.append(svg("line", {x1: 12, x2: sirka - 12, y1: osnova.top + i * osnova.roztec, y2: osnova.top + i * osnova.roztec, stroke: "#abc2c8", "stroke-width": 1.35}));
    }
    const houslovy = osnova.klic === "treble";
    const glyphY = dvojita ? osnova.top + (houslovy ? 4.15 : 2.9) * osnova.roztec : (houslovy ? 146 : 108);
    const glyphSize = dvojita ? Math.min(houslovy ? 59 : 47, osnova.roztec * (houslovy ? 4.5 : 3.9)) : (houslovy ? 82 : 76);
    podklad.append(svg("text", {x: 18, y: glyphY, "font-family": "Noto Music, Segoe UI Symbol, serif", "font-size": glyphSize, fill: "#e9f5f6"}, houslovy ? "𝄞" : "𝄢"));
  }
  if (!dvojita) podklad.append(svg("text", {x: 33, y: 185, "text-anchor": "middle", "font-size": 11, "font-weight": "700", fill: "#9abdc5"}, volba.clef === "treble" ? "G" : "F"));
  ui.svg.append(podklad);

  const skupinaNot = svg("g");
  for (const polozka of cviceni) skupinaNot.append(vytvorNotu(polozka, rozvrh));
  ui.svg.append(skupinaNot);
  const caraHorni = dvojita ? Math.max(4, prvniTop - 9) : 34;
  const caraDolni = dvojita ? Math.min(vyska - 4, posledniSpodek + 9) : 165;
  ui.svg.append(svg("line", {x1: caraX, x2: caraX, y1: caraHorni, y2: caraDolni, stroke: "#61dce9", "stroke-width": 2.8, "stroke-linecap": "round"}));
  ui.svg.append(svg("path", {d: `M ${caraX-7} ${caraHorni-4} L ${caraX+7} ${caraHorni-4} L ${caraX} ${caraHorni+5} Z`, fill: "#61dce9"}));
  stavSvg = {sirka, caraX, rozestup, nastup};
  posunNot();
}

function posunNot() {
  if (!stavSvg) return;
  for (let i = 0; i < cviceni.length; i += 1) {
    const polozka = cviceni[i];
    const x = stavSvg.caraX + (volba.mode === "moving" ? i + stavSvg.nastup - pozice : i - index) * stavSvg.rozestup;
    const viditelna = i >= index - 1 && i <= index + volba.preview && x >= -35 && x <= stavSvg.sirka + 35;
    polozka.kresba.skupina.setAttribute("visibility", viditelna ? "visible" : "hidden");
    if (!viditelna) continue;
    polozka.kresba.skupina.setAttribute("transform", `translate(${x.toFixed(2)} 0)`);
    for (const kresba of polozka.kresba.noty) {
      const barva = barvaNoty(polozka, i === index, kresba.klic);
      kresba.hlavicka.setAttribute("fill", barva);
      kresba.stonek.setAttribute("stroke", barva);
    }
    polozka.kresba.skupina.setAttribute("opacity", polozka.stav ? .75 : i === index ? 1 : .93);
  }
}

function vygenerujCviceni() {
  const dvojita = volba.clef === "both";
  const rozsah = PRAHA_NOT[dvojita ? "treble" : volba.clef];
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
    const bassMidi = dvojita ? PRAHA_NOT.bass[Math.floor(Math.random() * PRAHA_NOT.bass.length)] : null;
    noty.push({midi: nova, bassMidi, splnene: new Set(), stav: null, kresba: null});
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
  ui.progress.textContent = `${index} / ${CELKEM} ${volba.clef === "both" ? "dvojic" : "not"}`;
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
  ui.clefCaption.textContent = volba.clef === "both" ? "𝄞 + 𝄢 Obě ruce" : volba.clef === "treble" ? "𝄞 Houslový klíč" : "𝄢 Basový klíč";
  ui.modeCaption.textContent = volba.mode === "moving" ? "Noty přijíždějí zprava" : "Noty čekají na odpověď";
  ui.instructions.textContent = volba.clef === "both" ? "Zahraj obě noty u modré čáry. Na displeji můžeš klepnout na obě postupně." : volba.mode === "moving" ? "Hraj u modré čáry. Očima už sleduj i další noty." : "Zahraj zvýrazněnou notu. Další přijde po tvé odpovědi.";
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
  zpetnaVazba(`Hotovo! ${spravne} z ${CELKEM} ${volba.clef === "both" ? "dvojic" : "not"} správně (${presnost} %).${rekord ? " Nový osobní rekord! 🥳" : ""}`, "good");
}

function spustCviceni() {
  if (hotovo) pripravCviceni();
  if (spusteno && !hotovo) {
    // The pause button is responsible for resuming an existing run.
    if (!bezi && rucnePozastaveno) { pauza(); return; }
    return;
  }
  spusteno = true;
  if (jeKompaktniDisplej(window.innerWidth, window.innerHeight) && !soustredeniRucne) nastavSoustredeni(true);
  bezi = true;
  posledniSnimek = 0;
  ui.start.disabled = true;
  ui.pause.disabled = false;
  ui.pause.textContent = "Pauza";
  zpetnaVazba(volba.mode === "moving" ? "Jedeme! Očima sleduj noty, které přicházejí. 🎹" : "Hraj první zvýrazněnou notu. 🎹");
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
    pozice = index + (stavSvg?.nastup ?? 3);
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
  while (bezi && index < CELKEM && pozice > index + (stavSvg?.nastup ?? 3) + .42) zaznamenejZmeskanou();
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
    const predstih = index + (stavSvg?.nastup ?? 3) - pozice;
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
  if (volba.clef === "both") {
    const cast = najdiCastDvojice(nota, midi, jenNazev);
    if (cast) {
      nota.splnene.add(cast);
      if (nota.splnene.size === 2) {
        const bylaChyba = Boolean(nota.stav);
        if (!nota.stav) nota.stav = "ok";
        index += 1;
        if (cekamNaOpravu) {
          cekamNaOpravu = false;
          bezi = true;
          posledniSnimek = 0;
          if (volba.mode === "moving") spustAnimaci();
        }
        zpetnaVazba(bylaChyba ? "Obě noty opraveny, pokračujeme!" : "Obě noty správně! ✓", "good");
      } else {
        zpetnaVazba(`Správně ${cast === "treble" ? "houslový" : "basový"} klíč. Ještě druhá nota.`, "good");
      }
    } else {
      if (!nota.stav) nota.stav = "bad";
      const zahrana = jenNazev ? jmenoBezOktavy(midi) : nazevNoty(midi);
      if (volba.mode === "moving" && volba.error === "continue" && !cekamNaOpravu) {
        index += 1;
        zpetnaVazba(`Zahráno ${zahrana}, ale dvojice nesedí. Čti dál.`, "bad");
      } else {
        if (volba.mode === "moving") {
          bezi = false;
          cekamNaOpravu = true;
          pozice = index + (stavSvg?.nastup ?? 3);
        }
        zpetnaVazba(`Zahráno ${zahrana}. Zkus zbývající notu znovu.`, "bad");
      }
    }
    zmenaStatistik();
    posunNot();
    if (index >= CELKEM) konciCviceni();
    return;
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
        pozice = index + (stavSvg?.nastup ?? 3);
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
  // Na úzkém mobilu sedm bílých kláves; v širokém landscape 14 pro přiměřenou velikost.
  const kompaktni = jenJednaOktava(sirka, window.innerWidth, window.innerHeight);
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
    const midi = PRAHA_NOT[volba.clef === "both" ? "treble" : volba.clef].find((n) => jmenoBezOktavy(n) === jmeno);
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

function cilOtoceni(sirka, vyska) {
  return sirka > vyska ? "portrait" : "landscape";
}

function aktualizujTlacitkoOtoceni() {
  const cil = cilOtoceni(window.innerWidth, window.innerHeight);
  const popisek = cil === "landscape" ? "Na šířku" : "Na výšku";
  ui.rotateLabel.textContent = popisek;
  ui.rotate.setAttribute("aria-label", `Otočit zobrazení ${cil === "landscape" ? "na šířku" : "na výšku"}`);
  ui.rotate.title = `Zkusit otočit zobrazení ${cil === "landscape" ? "na šířku" : "na výšku"}`;
}

async function nastavOrientaci(orientace, zTlacitka = false) {
  let novyFullscreen = false;
  if (zTlacitka && bezi) pauza();
  try {
    if (!screen.orientation?.lock || !screen.orientation?.unlock) throw new Error("Prohlížeč otočení neumožňuje.");
    if (orientace === "auto") {
      screen.orientation.unlock();
      if (fullscreenKvuliOtoceni && document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
        fullscreenKvuliOtoceni = false;
      }
    } else {
      // V běžném Chromu může zámek orientace fungovat až na celé obrazovce.
      // Fullscreen požadujeme výhradně po vědomém stisku tlačítka.
      if (zTlacitka && !document.fullscreenElement && document.documentElement.requestFullscreen) {
        try {
          await document.documentElement.requestFullscreen();
          novyFullscreen = true;
          fullscreenKvuliOtoceni = true;
        } catch { /* Někdy se zamknutí podaří i bez fullscreen režimu. */ }
      }
      await screen.orientation.lock(orientace);
    }
    volba.orientation = orientace;
    vyberTlacitko("orientation", orientace);
    zpetnaVazba(orientace === "auto" ? "Automatická orientace je zapnutá." : `Zobrazení přepnuto ${orientace === "landscape" ? "na šířku" : "na výšku"}. 🎹`, "good");
  } catch {
    if (novyFullscreen && document.fullscreenElement && document.exitFullscreen) {
      try { await document.exitFullscreen(); } catch { /* Vracíme se do původního stavu, pokud to jde. */ }
      fullscreenKvuliOtoceni = false;
    }
    volba.orientation = "auto";
    vyberTlacitko("orientation", "auto");
    zpetnaVazba("Telefon otočení tlačítkem nepovolil. Zkus ho otočit ručně.", "bad");
  } finally {
    aktualizujTlacitkoOtoceni();
    requestAnimationFrame(() => {
      vykresliOsnovu();
      vytvorKlaviaturu();
      if (ui.shell.classList.contains("focus")) window.scrollTo(0, 0);
    });
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
  prelozTempo();
  if (aktivni && jeKompaktniDisplej(window.innerWidth, window.innerHeight)) window.scrollTo(0, 0);
  requestAnimationFrame(() => {
    vykresliOsnovu();
    vytvorKlaviaturu();
  });
}

function prelozTempo() {
  // Na krátké landscape obrazovce patří rychlost do horní lišty.
  // Díky tomu zůstane maximum místa pro osnovu nad celou klaviaturou.
  const naSirku = ui.shell.classList.contains("focus") && window.innerWidth >= 560 && window.innerWidth > window.innerHeight && window.innerHeight <= 650;
  const cil = naSirku ? ui.topActions : ui.practiceHeadingRight;
  if (ui.quickTempo.parentElement !== cil) {
    if (naSirku) cil.prepend(ui.quickTempo);
    else cil.append(ui.quickTempo);
  }
  const cilOvladani = naSirku ? ui.topActions : ui.practiceArea;
  if (ui.playActions.parentElement !== cilOvladani) {
    if (naSirku) cilOvladani.prepend(ui.playActions);
    else cilOvladani.append(ui.playActions);
  }
}

function nastavTempo(tempo) {
  volba.tempo = omezTempo(tempo);
  ui.tempo.value = String(volba.tempo);
  ui.tempoValue.textContent = String(volba.tempo);
  ui.quickTempoValue.textContent = String(volba.tempo);
  ui.tempoMinus.disabled = volba.tempo <= 20;
  ui.tempoPlus.disabled = volba.tempo >= 140;
}

function nastavNahled(pocet) {
  volba.preview = Math.max(1, Math.min(4, Math.round(pocet)));
  ui.preview.value = String(volba.preview);
  ui.previewValue.textContent = String(volba.preview);
  vykresliOsnovu();
}

function pripravOvladani() {
  document.querySelectorAll("button[data-mode]").forEach((button) => button.addEventListener("click", () => zmenNastaveni("mode", button.dataset.mode)));
  document.querySelectorAll("button[data-clef]").forEach((button) => button.addEventListener("click", () => zmenNastaveni("clef", button.dataset.clef)));
  document.querySelectorAll("button[data-answer]").forEach((button) => button.addEventListener("click", () => zmenNastaveni("answer", button.dataset.answer)));
  document.querySelectorAll("button[data-error]").forEach((button) => button.addEventListener("click", () => zmenNastaveni("error", button.dataset.error)));
  document.querySelectorAll("button[data-orientation]").forEach((button) => button.addEventListener("click", () => void nastavOrientaci(button.dataset.orientation)));
  ui.rotate.addEventListener("click", () => void nastavOrientaci(cilOtoceni(window.innerWidth, window.innerHeight), true));
  ui.tempo.addEventListener("input", () => nastavTempo(Number(ui.tempo.value)));
  ui.tempoMinus.addEventListener("click", () => nastavTempo(volba.tempo - 5));
  ui.tempoPlus.addEventListener("click", () => nastavTempo(volba.tempo + 5));
  ui.preview.addEventListener("input", () => nastavNahled(Number(ui.preview.value)));
  ui.start.addEventListener("click", spustCviceni);
  ui.pause.addEventListener("click", pauza);
  ui.next.addEventListener("click", pripravCviceni);
  ui.midi.addEventListener("click", () => void pripojMidi());
  ui.focus.addEventListener("click", () => {
    soustredeniRucne = true;
    if (ui.shell.classList.contains("focus") && bezi) pauza();
    nastavSoustredeni(!ui.shell.classList.contains("focus"));
  });
  window.addEventListener("resize", () => {
    prelozTempo();
    vykresliOsnovu();
    vytvorKlaviaturu();
    aktualizujTlacitkoOtoceni();
    if (ui.shell.classList.contains("focus")) window.scrollTo(0, 0);
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
aktualizujTlacitkoOtoceni();
nastavTempo(volba.tempo);
vytvorKlaviaturu();
vytvorNazvy();
prepniOdpoved();
pripravCviceni();
