# LubaPiano – historie verzí

## 0.1.5.2 – na mobilu střídáme klíče

- Při zvolených obou osnovách se náhodně střídá **jediná nota** mezi houslovým a basovým klíčem. Každá dvacítka má deset not z každého klíče; stačí jeden dotyk, MIDI také čeká jeden přesný tón.
- Nožičky not v obou osnovách jsou delší a přehlednější.
- V landscape se pro dvojitou osnovu vybírají noty uvnitř linek, na výšku lze dál procvičovat i notu na pomocné lince. Otočení před startem připraví odpovídající rozsah.
- Proužek s výsledkem a chybovými hláškami je na šířku pod notovou osnovou, takže už nepřekrývá spodní linky ani noty.
- Pokročilá současná hra dvěma rukama zůstává plánovaným samostatným režimem.

## 0.1.5.1 – čistší dvojitá osnova a oprava mobilního výběru

- Houslový a basový klíč mají v režimu „Oba“ menší symboly a větší mezeru mezi osnovami, aby se nepřekrývaly.
- Rozteč linek dvojité osnovy se více přizpůsobuje výšce displeje, zejména na šířku.
- Na úzkém telefonu jsou přepínače Trénink, Notový klíč a Odpověď v samostatných řadách. Volba „Oba“ už nepřetéká mimo obrazovku.

## 0.1.5 – čtení oběma rukama a oprava široké osnovy

- Na šířku vyplňuje notová osnova celou dostupnou šířku, nikoli jen levou část obrazovky.
- Tlačítka Začít, Pauza/Pokračovat a Nové noty jsou nahoře vedle tempa a otočení.
- Spodní klaviatura má v širokém landscape dvě oktávy (14 bílých kláves), aby nebyly klávesy přehnaně široké; na úzkém mobilu zůstává sedm.
- Nová volba **Oba klíče** kreslí houslovou osnovu nad basovou. Dvojice not se čte u stejné hrací čáry, dotykově lze noty zadat postupně a MIDI rozpoznává přesné výšky.
- Toto je první hratelný prototyp obou rukou: skutečnou současnost stisků ani rytmické hodnoty zatím nevyhodnocuje.

## 0.1.4.2 – landscape jako skutečné piano

- Landscape v režimu Soustředění má osnovu nahoře a klaviaturu dole přes celou šířku, nikoli dva úzké sloupce.
- Mobilní dotyková klaviatura nyní drží jedinou oktávu i na širokém displeji, takže bílé klávesy mají velké dotykové plochy.
- Rychlé tempo se v landscape přesune do horní lišty a po návratu na výšku zpět k nadpisu cvičení.
- Zpětná vazba zůstává viditelná v kompaktním proužku nad ovládáním a nezabírá další výšku.
- Zachováno tlačítko otočení, MIDI a všechny dosavadní tréninkové režimy.

## 0.1.4.1 – oprava landscape a tlačítko otočení

- Opravené soustředěné rozložení i pro telefony, jejichž CSS šířka v landscape překročí 760 px.
- Na šířku se používá široká notová osnova vlevo a klaviatura s herními tlačítky vpravo.
- Nové tlačítko Na šířku / Na výšku se pokusí o otočení telefonu; podle potřeby vyžádá fullscreen, pokud to zařízení dovolí.
- Pokud orientaci prohlížeč nepovolí, uživatel dostane vysvětlení a může telefon otočit ručně.
- V soustředěném režimu nepřekáží upozornění na aktualizaci PWA.

## 0.1.4 – mobilní čtení dopředu

- Režim Soustředění na telefonu používá výšku displeje na notovou osnovu a odpovědi bez nutnosti posouvání stránky.
- Landscape dává osnovu a klaviaturu vedle sebe; důležité ovládání zůstává přímo při hraní.
- Tempo lze během cvičení snížit/zvýšit tlačítky − / + po 5 notách za minutu.
- V Dalších nastaveních lze zvolit výhled na 1–4 následující noty; dynamické rozestupy udržují noty čitelné na malém displeji.
- Opravené měřítko osnovy při změně výšky; otočení telefonu nenaruší načasování aktuální noty.
- Zachovaný MIDI vstup a dosavadní režimy; nová testovací sada pro mobilní rozvržení.

## 0.1.3 – patch 001

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

## Postup pro další patche

1. Změnit potřebné soubory, zvýšit verzi a projít testy.
2. Začlenit ověřené změny do GitHub `main`.
3. V SPCK stáhnout **Pull** a otestovat na telefonu.
4. Soukromý web nasadit až při samostatném rozhodnutí o publikování.
