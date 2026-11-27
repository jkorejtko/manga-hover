# Manga Hover

Unpacked extension for desktop Google Chrome 138+ that translates English manga, comics, and page text into Czech on hover using local OCR and Chrome's built-in Translator API.

> Not published on the Chrome Web Store — install locally from this repository.

## Installation

1. Clone this repository (`git clone https://github.com/jkorejtko/manga-hover.git`) or download and extract the ZIP from GitHub.
2. Open `chrome://extensions` in Google Chrome.
3. Enable **Developer mode** and click **Load unpacked**.
4. Select the `manga-hover` folder (containing `manifest.json`).
5. Open a manga reader tab, click **Manga Hover** in the extensions menu, and click **Zapnout na této kartě** (*Enable on this tab*). On first use, keep the popup open until Chrome finishes downloading the English-to-Czech language pack.

## Usage

- **Hover over a speech bubble:** On the first hover in the current viewport, the extension runs OCR on the visible image and shows the Czech translation next to the cursor, with the recognized English source text underneath.
- **Manual area selection:** If OCR merges neighboring bubbles or misses text, hold **Alt** (**⌥ Option** on macOS) and drag a box around a single bubble. Dismiss a manual selection with **Esc**, scrolling, or clicking outside.
- **Plain page text:** Hovering over regular English paragraphs, headings, blockquotes, or captions translates them as well.
- **Navigation:** Re-enable the extension after a full page load. In single-page readers that switch chapters without reloading, it stays active.

## Privacy & Notes

Everything runs locally on your device: only the visible part of the active tab is captured, image text is recognized in an offscreen worker via bundled Tesseract.js, and translation uses Chrome's on-device model. OCR accuracy depends on font size and clarity — zooming in helps with small speech bubbles.

## Credits & Licenses

- [Chrome Translator API](https://developer.chrome.com/docs/ai/translator-api)
- [Tesseract.js 6.0.1](https://github.com/naptha/tesseract.js/tree/v6.0.1)
- Third-party licenses for bundled assets are located in the `vendor/` directory.

## TODO

- [ ] Publish on the Chrome Web Store
