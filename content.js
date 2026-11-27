(() => {
  if (globalThis.mangaHoverInstalled) return;
  globalThis.mangaHoverInstalled = true;

  const languages = { sourceLanguage: 'en', targetLanguage: 'cs' };
  const surface = document.createElement('div');
  surface.style.cssText = 'all:initial!important;position:fixed!important;inset:0!important;z-index:2147483647!important;pointer-events:none!important';
  const shadow = surface.attachShadow({ mode: 'closed' });
  const style = new CSSStyleSheet();
  style.replaceSync(`
    [hidden] { display:none!important; }
    .bubble { position:fixed; box-sizing:border-box; max-width:min(380px,calc(100vw - 16px));
      max-height:calc(100vh - 16px); overflow:auto; padding:10px 14px; border-radius:10px;
      border:1px solid #696185; background:#1e1b2c; color:#fff; box-shadow:0 4px 22px #0007;
      font:15px/1.45 system-ui,sans-serif; overflow-wrap:anywhere; }
    .source { margin-top:7px; padding-top:6px; border-top:1px solid #696185; color:#ccc4dc; font-size:12px; }
    .bubble:has(button) { pointer-events:auto; }
    button { font:inherit; color:inherit; padding:4px 8px; margin-top:8px; display:block;
      border:1px solid #a89ad7; border-radius:6px; background:#463775; cursor:pointer; }
    .area { position:fixed; box-sizing:border-box; border:2px solid #b4a2ff; background:#8466ff33; }
  `);
  shadow.adoptedStyleSheets = [style];
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.setAttribute('role', 'status');
  bubble.hidden = true;
  const area = document.createElement('div');
  area.className = 'area';
  area.hidden = true;
  shadow.append(bubble, area);

  const translations = new Map();
  let enabled = false;
  let translatorPromise;
  let timer;
  let sequence = 0;
  let snapshot;
  let drag;
  let anchor;
  let selected = false;
  let suppressClickUntil = 0;

  function dismiss() {
    clearTimeout(timer);
    sequence += 1;
    bubble.hidden = true;
  }

  function invalidate() {
    dismiss();
    snapshot = undefined;
    anchor = undefined;
    selected = false;
  }

  function show(text, point, { action, source } = {}) {
    bubble.textContent = text;
    if (source) {
      const original = document.createElement('div');
      original.className = 'source';
      original.lang = 'en';
      original.textContent = source;
      bubble.append(original);
    }
    if (action) {
      const button = document.createElement('button');
      button.textContent = 'Připravit překladač';
      button.onclick = action;
      bubble.append(button);
    }
    bubble.hidden = false;
    const left = Math.max(8, Math.min(point.x + 12, innerWidth - bubble.offsetWidth - 8));
    const below = point.y + 15;
    const top = below + bubble.offsetHeight <= innerHeight - 8
      ? below : Math.max(8, point.y - bubble.offsetHeight - 10);
    bubble.style.left = left + 'px';
    bubble.style.top = top + 'px';
  }

  function createTranslator() {
    translatorPromise = Translator.create(languages).catch(error => {
      translatorPromise = undefined;
      throw error;
    });
    return translatorPromise;
  }

  async function translate(text, point, request, fromImage = true) {
    if (!text || sequence !== request) return;
    const details = fromImage ? { source: text } : undefined;
    if (translations.has(text)) {
      show(translations.get(text), point, details);
      return;
    }
    try {
      if (!globalThis.Translator) {
        show('Vestavěný překladač na této stránce není dostupný.', point);
        return;
      }
      if (!translatorPromise) {
        const availability = await Translator.availability(languages);
        if (sequence !== request) return;
        if (availability === 'unavailable') {
          show('Překlad EN → CS v tomto Chrome není dostupný.', point);
          return;
        }
        if (availability !== 'available') {
          show('Chrome potřebuje připravit jazykový balíček.', point, { action: async () => {
            show('Připravuji jazykový balíček…', point);
            try {
              await (translatorPromise ?? createTranslator());
              await translate(text, point, request, fromImage);
            } catch {
              if (sequence === request) show('Balíček se nepodařilo připravit. Zkus znovu zapnout rozšíření.', point);
            }
          } });
          return;
        }
      }

      const translator = await (translatorPromise ?? createTranslator());
      if (sequence !== request) return;
      const result = await translator.translate(text);
      if (translations.size >= 150) translations.delete(translations.keys().next().value);
      translations.set(text, result);
      if (sequence === request) show(result, point, details);
    } catch {
      if (sequence === request) show('Překlad se nepodařil. Zkus to ještě jednou.', point);
    }
  }

  const repaint = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  function recognize(viewport, selection) {
    return chrome.runtime.sendMessage({ type: 'manga-hover-read', viewport, selection }).then(result => {
      if (!result || result.error) throw new Error(result?.error ?? 'OCR nedokončilo čtení.');
      return result;
    });
  }

  async function read(point, selection) {
    const request = ++sequence;
    bubble.hidden = true;
    const viewport = { width: innerWidth, height: innerHeight };
    let loading;
    try {
      await repaint();
      if (sequence !== request || !enabled) return;
      if (selection || !snapshot || Date.now() - snapshot.time > 12000) {
        const scan = { time: Date.now(), promise: recognize(viewport, selection) };
        if (!selection) snapshot = scan;
        scan.promise.catch(() => { if (snapshot === scan) snapshot = undefined; });
        loading = setTimeout(() => {
          if (sequence === request) show('Čtu text z obrázku…', point);
        }, 650);
        if (selection) {
          const { text } = await scan.promise;
          if (sequence !== request) return;
          clearTimeout(loading);
          if (text) await translate(text, point, request);
          else show('V označené oblasti se nepodařilo spolehlivě přečíst text. Zkus těsněji orámovat celou bublinu.', point);
          return;
        }
      }
      const { groups, scaleX, scaleY } = await snapshot.promise;
      if (sequence !== request) return;
      clearTimeout(loading);
      const group = mangaHoverGeometry.nearest(groups, point.x * scaleX, point.y * scaleY);
      if (group) await translate(group.text, point, request);
    } catch {
      if (sequence === request) show('Obrázek se nepodařilo přečíst. Zkus vybrat oblast pomocí Alt + tažení.', point);
    } finally {
      clearTimeout(loading);
    }
  }

  const pointAt = event => ({ x: event.clientX, y: event.clientY });
  const rectangle = (a, b) => ({
    x: Math.max(0, Math.min(a.x, b.x)),
    y: Math.max(0, Math.min(a.y, b.y)),
    width: Math.min(innerWidth, Math.max(a.x, b.x)) - Math.max(0, Math.min(a.x, b.x)),
    height: Math.min(innerHeight, Math.max(a.y, b.y)) - Math.max(0, Math.min(a.y, b.y)),
  });

  function isIllustration(element) {
    if (!(element instanceof Element)) return false;
    if (element.closest('img, canvas, svg, picture')) return true;
    for (let item = element; item && item !== document.body; item = item.parentElement) {
      if (getComputedStyle(item).backgroundImage.includes('url(')) return true;
    }
    return false;
  }

  function move(event) {
    if (event.target === surface) return;
    const point = pointAt(event);
    if (drag) {
      event.preventDefault();
      const box = rectangle(drag, point);
      Object.assign(area.style, {
        left: box.x + 'px', top: box.y + 'px', width: box.width + 'px', height: box.height + 'px',
      });
      area.hidden = false;
      return;
    }
    if (event.buttons || selected) return;
    if (anchor && Math.hypot(anchor.x - point.x, anchor.y - point.y) < 18) return;
    clearTimeout(timer);
    sequence += 1;
    anchor = point;
    if (!isIllustration(event.target)) {
      bubble.hidden = true;
      const block = event.target instanceof Element
        ? event.target.closest('p, blockquote, h1, h2, h3, h4, figcaption') : null;
      const text = block?.innerText?.trim();
      if (text && text.length >= 8 && text.length <= 2500 &&
          !block.closest('[contenteditable]:not([contenteditable="false"]), [lang="cs"], [lang^="cs-"]')) {
        const request = sequence;
        timer = setTimeout(() => translate(text, point, request, false), 420);
      }
      return;
    }
    timer = setTimeout(() => read(point), 420);
  }

  function startSelection(event) {
    if (event.target === surface) return;
    if (selected) invalidate();
    if (!event.altKey || event.button !== 0) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    invalidate();
    drag = pointAt(event);
  }

  function finishSelection(event) {
    if (!drag) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const point = pointAt(event);
    const selection = rectangle(drag, point);
    drag = undefined;
    area.hidden = true;
    if (selection.width < 12 || selection.height < 12) return;
    selected = true;
    suppressClickUntil = performance.now() + 250;
    read(point, selection);
  }

  function suppressSelectionClick(event) {
    if (event.detail && event.target !== surface && performance.now() < suppressClickUntil) {
      event.preventDefault();
      event.stopImmediatePropagation();
      suppressClickUntil = 0;
    }
  }

  function cancel() {
    drag = undefined;
    area.hidden = true;
    invalidate();
  }

  function keydown(event) {
    if (event.key === 'Escape') cancel();
  }

  function onPointerOut(event) {
    if (!event.relatedTarget && !selected) invalidate();
  }

  const handlers = {
    pointermove: move, pointerdown: startSelection, pointerup: finishSelection,
    click: suppressSelectionClick, pointercancel: cancel, pointerout: onPointerOut, scroll: cancel, resize: cancel,
    blur: cancel, keydown,
  };

  function setEnabled(value) {
    enabled = value;
    for (const [name, handler] of Object.entries(handlers)) {
      if (enabled) window.addEventListener(name, handler, true);
      else window.removeEventListener(name, handler, true);
    }
    if (enabled) document.documentElement.append(surface);
    else {
      cancel();
      surface.remove();
    }
  }

  chrome.runtime.onMessage.addListener((message, _sender, respond) => {
    if (message.type === 'manga-hover-toggle') setEnabled(!enabled);
    if (message.type === 'manga-hover-toggle' || message.type === 'manga-hover-state') respond({ enabled });
  });
})();
