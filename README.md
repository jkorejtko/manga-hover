# Manga Hover

Rozšíření pro desktopový Google Chrome 138 a novější s dostupným vestavěným překladačem angličtiny do češtiny.

## Instalace

1. Rozbal ZIP.
2. V adresním řádku Chrome otevři `chrome://extensions`.
3. Zapni **Režim pro vývojáře** a klikni na **Načíst rozbalené**.
4. Vyber složku `manga-hover`, ve které najdeš soubor `manifest.json`.
5. Ve webové čtečce otevři z nabídky rozšíření **Manga Hover** a klikni na **Zapnout na této kartě**. Při prvním zapnutí nech okno otevřené, dokud Chrome nestáhne jazykový balíček.

## Použití

- Podrž kurzor na anglické bublině. Při prvním najetí v dané části stránky rozšíření přečte text z obrázku a zobrazí český překlad u kurzoru. Pod překladem uvidíš anglický text, který OCR z obrázku přečetlo.
- Pokud OCR spojí sousední bubliny nebo text mine, podrž **Alt** (**⌥ Option** na Macu) a myší orámuj jednu bublinu. Ruční výsledek zavřeš klávesou **Esc** nebo kliknutím mimo něj.
- Rozšíření umí přeložit také běžné anglické odstavce a nadpisy. Po přechodu na novou stránku ho znovu zapni. Ve čtečkách, které mění kapitoly bez načtení nové stránky, může zůstat zapnuté.

Rozšíření čte pouze viditelnou část aktivní karty. Text z obrázků rozpoznává lokálně pomocí přibaleného Tesseractu a překlad zajišťuje Chrome na zařízení. Kvalita rozpoznání záleží na velikosti a čitelnosti písma. U malých bublin může pomoci přiblížení v prohlížeči.

## Zdroje

- [Vestavěný překladač Chrome](https://developer.chrome.com/docs/ai/translator-api)
- [Tesseract.js 6.0.1](https://github.com/naptha/tesseract.js/tree/v6.0.1)
- Licence přibalených komponent jsou ve složce `vendor`.
