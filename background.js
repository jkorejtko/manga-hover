let creatingDocument;
let screenshotTail = Promise.resolve();
let lastCapture = 0;
let activation = 0;
chrome.tabs.onActivated.addListener(() => { activation += 1; });
chrome.tabs.onUpdated.addListener((tabId, change) => {
  if (change.status === 'loading') chrome.action.setBadgeText({ tabId, text: '' }).catch(() => {});
});

async function ensureOcrDocument() {
  if (!creatingDocument) {
    creatingDocument = (async () => {
      if (await chrome.offscreen.hasDocument()) return;
      await chrome.offscreen.createDocument({
        url: 'ocr.html',
        reasons: ['WORKERS'],
        justification: 'Read visible manga text locally in an OCR worker.',
      });
    })().finally(() => { creatingDocument = undefined; });
  }
  return creatingDocument;
}

function capture(tab) {
  const pending = screenshotTail.then(async () => {
    const wait = 530 - (Date.now() - lastCapture);
    if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));

    const [active] = await chrome.tabs.query({ windowId: tab.windowId, active: true });
    if (active?.id !== tab.id) throw new Error('Karta už není aktivní.');
    const before = activation;
    lastCapture = Date.now();
    const image = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
    if (before !== activation) throw new Error('Během snímání se změnila aktivní karta.');
    return image;
  });
  screenshotTail = pending.catch(() => {});
  return pending;
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message.type !== 'manga-hover-read' || !sender.tab || sender.frameId !== 0) return;
  (async () => {
    const image = await capture(sender.tab);
    await ensureOcrDocument();
    return chrome.runtime.sendMessage({ ...message, type: 'manga-hover-ocr', image });
  })().then(respond, error => respond({ error: error.message }));
  return true;
});
