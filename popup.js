const toggle = document.querySelector('#toggle');
const status = document.querySelector('#status');
const languages = { sourceLanguage: 'en', targetLanguage: 'cs' };
let tab;
let enabled = false;
let modelStatus;

function updateButton() {
  toggle.textContent = enabled ? 'Vypnout na této kartě' : 'Zapnout na této kartě';
  toggle.disabled = false;
}

async function initialize() {
  [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !/^https?:/.test(tab.url ?? '')) {
    status.textContent = 'Otevři kartu s webovou čtečkou mangy.';
    return;
  }

  const [state, availability] = await Promise.all([
    chrome.tabs.sendMessage(tab.id, { type: 'manga-hover-state' }).catch(() => null),
    globalThis.Translator?.availability(languages).catch(() => 'unavailable'),
  ]);
  enabled = state?.enabled ?? false;
  modelStatus = availability;

  if ((!modelStatus || modelStatus === 'unavailable') && !enabled) {
    status.textContent = 'Vestavěný překladač EN → CS v tomto Chrome není dostupný.';
    return;
  }
  if (modelStatus === 'downloadable' || modelStatus === 'downloading') {
    status.textContent = 'Při prvním zapnutí Chrome stáhne jazykový balíček.';
  }
  updateButton();
}

toggle.addEventListener('click', async () => {
  toggle.disabled = true;
  try {
    if (!enabled && modelStatus !== 'available') {
      status.textContent = 'Připravuji jazykový balíček. Nech toto okno otevřené.';
      const translator = await Translator.create({
        ...languages,
        monitor(monitor) {
          monitor.addEventListener('downloadprogress', ({ loaded }) => {
            status.textContent = `Stahuji jazykový balíček… ${Math.round(loaded * 100)} %`;
          });
        },
      });
      translator.destroy();
      modelStatus = 'available';
    }
    if (!enabled) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id }, files: ['geometry.js', 'content.js'],
      });
    }

    const state = await chrome.tabs.sendMessage(tab.id, { type: 'manga-hover-toggle' });
    enabled = state.enabled;
    status.textContent = enabled ? 'Zapnuto. Teď najeď na bublinu v manze.' : 'Vypnuto.';
    try {
      await chrome.action.setBadgeText({ tabId: tab.id, text: enabled ? 'CZ' : '' });
    } catch {
      // The tab may have closed while updating its badge.
    }
  } catch (error) {
    status.textContent = modelStatus === 'available'
      ? 'Na této stránce se rozšíření nepodařilo přepnout.'
      : 'Balíček se nepodařilo stáhnout. Zkus to znovu.';
    console.warn(error);
  } finally {
    updateButton();
  }
});

initialize().catch(() => { status.textContent = 'Nepodařilo se načíst stav karty.'; });
