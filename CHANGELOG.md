# LubaPiano – historie verzí

## 0.1.3 – patch 001 (kandidát k testování)

- Zmenšené notové klíče a posunutá hrací čára pro lepší oddělení první noty.
- Na mobilu se po zahájení tréninku zapne kompaktní režim soustředění; nastavení lze vrátit tlačítkem Zpět.
- Na úzkých obrazovkách se zmenší mezery a výška virtuální klaviatury. V landscape režimu jsou noty a dotyková klaviatura vedle sebe.
- Chybná odpověď nyní napíše, jakou notu aplikace opravdu zachytila. Pokračovací režim zobrazí i správnou notu.
- Porovnávání názvů not pro dotyk a přesných MIDI tónů je sjednocené v jedné funkci.
- PWA má vlastní identifikátor v manifestu. Service worker odstraňuje pouze staré cache LubaPiano, nikdy cache jiných aplikací na stejném localhostu.

## 0.1.2 (2026-11-27)

- Číslo verze je vidět přímo vedle názvu LubaPiano i na mobilu.
- Nový service worker dává při připojení přednost aktuálním souborům a při výpadku internetu použije místní kopii.
- Když se během otevřené aplikace nainstaluje nová verze, zobrazí se tlačítko **Aktualizovat**.

## 0.1.1 (2026-11-27)

- Dotyková klaviatura rozpoznává názvy not bez ohledu na oktávu (C2 = C4 pro dotyk).
- Skutečné MIDI piano dál vyhodnocuje přesnou oktávu.
- Úzké displeje zobrazují jednu úplnou oktávu bez posouvání do stran.

## 0.1.0 (2026-11-27)

- První PWA: klidný/pohyblivý režim, houslový/basový klíč, virtuální klaviatura a názvy not.
- MIDI vstup přes USB, 20 not na cvičení, tempo, statistiky, offline cache a responzivní rozložení.

## Navržený postup pro další patche

1. Nový patch založit ve vlastní větvi z `main` (např. `oprava-klaviatury`).
2. Změnit jen potřebné soubory a zvýšit verzi.
3. Ověřit JavaScript, dotykovou klaviaturu, MIDI a orientaci displeje podle rozsahu změny.
4. Pull request zkontrolovat a začlenit do `main`.
5. Nasadit do soukromého webu a potvrdit verzi i funkci na telefonu.
