# LubaPiano 0.1.6.1

První offline-first PWA pro trénink poznávání not s volitelným USB MIDI vstupem z Kurzweil M90.

## Rozsah v0.1

- **Akademie** je výchozí obrazovka výuky od úplných základů. První čtyři postupné lekce houslového klíče mají vlastní rozsahy not a vysvětlení. Každou lze neomezeně procvičovat v režimu **Klid** nebo **Pohyb**; k odemčení následující lekce jsou potřeba dvě samostatné zkoušky po 20 notách s výsledkem 100 %. Zkoušky dávají nové náhodné pořadí a hodnotí první pokus, chyby ve cvičení nejsou trestány. Pokrok Akademie se ukládá samostatně pouze do localStorage tohoto zařízení.
- V Akademii lze přepnout **Klid · plynulý posun** (po správné odpovědi nota během 320 ms odjede vlevo a další plynule přijede) nebo **Pohyb · pod tlakem** (nepřetržité čtení zprava). Pohyb má přímo u lekce nastavení 20–140 not/min. Akademie si na tomto zařízení pamatuje zvolený režim a tempo; výchozí je Pohyb na 55 not/min. Přepnutí režimu připraví novou sérii, rozehraná série se tak nepletě s novým časováním.
- Přepínač **Volný trénink** zachovává veškeré dosavadní režimy, včetně pohyblivých not, obou klíčů, osobního rekordu a MIDI. Návrat z Akademie obnoví nastavení volného tréninku.
- Houslový, basový nebo obě osnovy najednou (mobilní trénink náhodného střídání klíčů).
- Klidný režim a pohyblivé noty s nastavitelným tempem 20–140 not/min.
- Odpověď názvem noty nebo virtuální klaviaturou; USB MIDI funguje v obou režimech.
- Dotyková klaviatura na úzkých displejích ukazuje jednu oktávu bez posouvání a kontroluje jen název noty. V landscape se dvěma oktávami samostatný houslový/basový klíč kontroluje i přesnou oktávu (C4 není C5). Při střídání obou klíčů zůstává pro dotyk kontrola názvu, protože jejich plný rozsah přesahuje dvě oktávy. Fyzický MIDI vstup vždy kontroluje přesnou oktávu.
- Při chybě v pohyblivém režimu pokračovat nebo zastavit.
- 20 not na cvičení, procento správných prvních odpovědí, lokální záznam nejlepšího výsledku.
- Po dokončení 20 not se v klidném i pohyblivém režimu automaticky otevře výsledkový modal se správnými/chybnými notami, procenty a osobním rekordem. Lze ihned spustit nové cvičení nebo výsledek zavřít. V průběhu hraní zůstává soustředěná plocha bez dalších údajů.
- Zavření výsledku automaticky opustí režim Soustředění, aby hráč nezůstal na prázdné dohrané osnově. Další cvičení z modalu naopak rovnou startuje další sérii.
- Přizpůsobení orientaci displeje a možnost pokusu o její zamknutí.
- Mobilní režim soustředění využívá plochu displeje pro noty a odpovědi bez scrollování; změny tempa po 5 notách/min jsou dostupné přímo během hraní.
- Na širokém telefonu v landscape Soustředění vyplňují obrazovku pouze notové osnovy nahoře a vyšší klaviatura dole se dvěma oktávami (14 bílých kláves). Klepnutí kamkoliv do osnovy zobrazí ovládání a stavové údaje jako překryvnou vrstvu; dalším klepnutím se skryjí. Při otevření panelu se běžící pohyblivé noty bezpečně pozastaví, při zavření opět pokračují, pokud je nepozastavil uživatel. Úzký telefon zachovává jednu oktávu.
- Režim **Střídat** zobrazuje obě osnovy, ale na každém kroku jen jednu notu v jednom náhodně vybraném klíči. Přibližně polovina not připadá na každou osnovu. Dotykem stačí odpovědět jednou; MIDI stále hlídá přesnou oktávu. Současnou hru obou rukou si necháváme na samostatný pokročilý režim.
- Pro dvojitou osnovu v landscape se generují noty uvnitř pětilinkových osnov, aby nepřekážely pomocné linky. Na výšku zůstává i C4 pod houslovou osnovou. Při otočení před spuštěním se připraví nová série pro aktuální orientaci; rozjetá série se nepřeruší.
- Obě osnovy mají od sebe bezpečnou mezeru, zmenšené samostatné symboly klíčů a automatickou rozteč podle výšky. Na úzkém mobilu jsou ovladače tří klíčů přes celou šířku nastavení.
- Nožičky ve dvojité osnově jsou delší. V landscape Soustředění je stavový proužek skrytý a objeví se jen s ovládáním; v běžném rozložení zůstává pod osnovami.
- Tlačítko v horní liště zkouší otočení na šířku/výšku přes Screen Orientation API. Pokud je to nutné, pokusí se přejít na celou obrazovku. Prohlížeč může požadavek odmítnout; ruční otočení vždy zůstává možností.
- Upozornění na dostupnou aktualizaci je v režimu Soustředění skryté, aby nezabíralo prostor hře. Po návratu do nastavení se opět objeví.
- V dalších nastaveních lze zvolit 1–4 následující noty. Rozestupy a nástup not se přizpůsobí šířce telefonu; po otočení se zachová poloha právě čtené noty.
- V pohyblivém režimu se každá další nota plynule objeví až od pravého okraje osnovy. Zvolený počet následujících not určuje jejich rozestupy; už se žádná neodkrývá uprostřed displeje.
- Animace při každém snímku posouvá jedinou společnou SVG skupinu. Jednotlivé noty mění barvu a viditelnost jen při skutečné změně, což snižuje počet změn v DOM při pohybu.
- Jakmile se podaří připojit skutečný MIDI vstup, virtuální klaviatura se schová i mimo režim Soustředění; po odpojení se znovu objeví.
- Manifest + service worker s místní cache pro offline režim po prvním načtení.
- Viditelné číslo verze u loga a upozornění na připravenou aktualizaci PWA.

## Test na Kurzweilu

1. Připojit USB TO HOST přes kabel USB-B → USB-A a USB-C OTG redukci.
2. Otevřít nasazenou HTTPS PWA v Chrome Android a dát **Připojit MIDI**.
3. Začít cvičení. Zahrát notu až ve chvíli, kdy je blízko svislé modré čáry.
4. Ověřit úspěch, chyby, pauzu, změnu tempa a přepnutí na basový klíč.

## Zatím není součástí

- Pokročilý adaptivní výběr slabých not, opakování v dalších dnech a navazující lekce basového klíče a rytmu. V první Akademii je učitel řízený jednoduchými, zcela offline pravidly; nejde o konverzační AI.
- Skutečné akordy a rytmická souhra obou rukou, skladby / MusicXML a LubaLevel.
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
