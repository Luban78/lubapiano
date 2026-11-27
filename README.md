# LubaPiano 0.1.3

První offline-first PWA pro trénink poznávání not s volitelným USB MIDI vstupem z Kurzweil M90.

## Rozsah v0.1

- Houslový a basový klíč (vždy jedna osnova).
- Klidný režim a pohyblivé noty s nastavitelným tempem 20–140 not/min.
- Odpověď názvem noty nebo virtuální klaviaturou; USB MIDI funguje v obou režimech.
- Dotyková klaviatura na úzkých displejích ukazuje jednu oktávu bez posouvání a kontroluje jen název noty; fyzický MIDI vstup kontroluje i přesnou oktávu.
- Při chybě v pohyblivém režimu pokračovat nebo zastavit.
- 20 not na cvičení, procento správných prvních odpovědí, lokální záznam nejlepšího výsledku.
- Přizpůsobení orientaci displeje a možnost pokusu o její zamknutí.
- Manifest + service worker s místní cache pro offline režim po prvním načtení.
- Viditelné číslo verze u loga a upozornění na připravenou aktualizaci PWA.

## Test na Kurzweilu

1. Připojit USB TO HOST přes kabel USB-B → USB-A a USB-C OTG redukci.
2. Otevřít nasazenou HTTPS PWA v Chrome Android a dát **Připojit MIDI**.
3. Začít cvičení. Zahrát notu až ve chvíli, kdy je blízko svislé modré čáry.
4. Ověřit úspěch, chyby, pauzu, změnu tempa a přepnutí na basový klíč.

## Zatím není součástí

- Dvě osnovy současně, akordy v cvičení, skutečné skladby / MusicXML a LubaLevel.
- Časový rytmus rozličných hodnot not (v0.1 všechny noty trvají jednu dobu).
- Automatické rozpoznání oktávy v režimu názvů (tam se zkouší jen název noty).

Všechno běží v prohlížeči bez externího API. Pouze testovací statistiky se ukládají do localStorage.

## Lokální práce a patche

- V SPCK otevři `dist/index.html` a prohlédni projekt na větvi s patchem.
- První patch je větev `oprava-001-rozlozeni`. Do `main` se dostane až po otestování a schválení PR.
- Logika rozpoznání not má jednoduché testy bez instalace závislostí: `node --test tests/notes.test.mjs`.
- Číslo verze měň v `dist/index.html`, `dist/sw.js`, `README.md` a `CHANGELOG.md`.
- Produkční PWA na soukromém webu se nasazuje samostatně až z odsouhlasené verze.
