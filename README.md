# LubaPiano 0.1.4

První offline-first PWA pro trénink poznávání not s volitelným USB MIDI vstupem z Kurzweil M90.

## Rozsah v0.1

- Houslový a basový klíč (vždy jedna osnova).
- Klidný režim a pohyblivé noty s nastavitelným tempem 20–140 not/min.
- Odpověď názvem noty nebo virtuální klaviaturou; USB MIDI funguje v obou režimech.
- Dotyková klaviatura na úzkých displejích ukazuje jednu oktávu bez posouvání a kontroluje jen název noty; fyzický MIDI vstup kontroluje i přesnou oktávu.
- Při chybě v pohyblivém režimu pokračovat nebo zastavit.
- 20 not na cvičení, procento správných prvních odpovědí, lokální záznam nejlepšího výsledku.
- Přizpůsobení orientaci displeje a možnost pokusu o její zamknutí.
- Mobilní režim soustředění využívá plochu displeje pro noty a odpovědi bez scrollování; změny tempa po 5 notách/min jsou dostupné přímo během hraní.
- V dalších nastaveních lze zvolit 1–4 následující noty. Rozestupy a nástup not se přizpůsobí šířce telefonu; po otočení se zachová poloha právě čtené noty.
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

- V SPCK zůstávej na `main`, dej **Pull** a otevři `dist/index.html`.
- Logika rozpoznání, mobilního rozložení a PWA má testy bez instalace závislostí: `node --test tests/*.test.mjs`.
- Číslo verze měň v `dist/index.html`, `dist/sw.js`, `README.md` a `CHANGELOG.md`.
- GitHub `main` slouží pro patche testované v SPCK. Soukromý nasazený web se aktualizuje samostatně, až jej budeme chtít nasadit.

## Více PWA na localhostu

LubaPiano má vlastní manifest `id` a svůj cache prefix. Zůstává instalovatelnou PWA (`display: standalone`) s offline soubory. Pro skutečně oddělené aplikace **nestačí samotné `id`**: LubaWallet a LubaPiano musí používat odlišný origin (např. jiný localhost port) nebo neprolínající se rozsahy URL a service workerů. Pokud obě aplikace běží v kořeni stejného localhostu a portu, Android může stále otevřít adresu pod nainstalovanou LubaWallet. Nikdy kvůli tomu nemaž data LubaWallet.
