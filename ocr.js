let workerPromise;
let queue = Promise.resolve();

function getWorker() {
  if (!workerPromise) {
    workerPromise = Tesseract.createWorker('eng', 1, {
      workerPath: chrome.runtime.getURL('ocr-worker.js'),
      corePath: chrome.runtime.getURL('vendor/tesseract-core-lstm.wasm.js'),
      langPath: chrome.runtime.getURL('vendor'),
      workerBlobURL: false,
    }).catch(error => {
      workerPromise = undefined;
      throw error;
    });
  }
  return workerPromise;
}

async function read({ image, viewport, selection }) {
  const bitmap = await createImageBitmap(await (await fetch(image)).blob());
  const scaleX = bitmap.width / viewport.width;
  const scaleY = bitmap.height / viewport.height;
  const area = selection ?? { x: 0, y: 0, width: viewport.width, height: viewport.height };
  const x = Math.max(0, Math.floor(area.x * scaleX));
  const y = Math.max(0, Math.floor(area.y * scaleY));
  const width = Math.min(bitmap.width - x, Math.ceil(area.width * scaleX));
  const height = Math.min(bitmap.height - y, Math.ceil(area.height * scaleY));
  if (width < 1 || height < 1) {
    bitmap.close();
    return { text: '' };
  }
  const desiredScale = selection ? 2.5 : 1.65;
  const factor = Math.min(2.5, Math.max(1, desiredScale / scaleY), 4000 / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width * factor);
  canvas.height = Math.ceil(height * factor);
  canvas.getContext('2d').drawImage(bitmap, x, y, width, height, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const worker = await getWorker();
  if (selection) {
    await worker.setParameters({ tessedit_pageseg_mode: '6' });
    const { data } = await worker.recognize(canvas, {}, { tsv: true });
    const words = mangaHoverGeometry.textLines(data.tsv).flatMap(line => line.words);
    if (mangaHoverGeometry.readable(words)) return { text: words.map(word => word.text).join(' ') };
  }

  await worker.setParameters({ tessedit_pageseg_mode: '11' });
  const { data } = await worker.recognize(canvas, {}, { tsv: true });
  const groups = mangaHoverGeometry.groupLines(mangaHoverGeometry.textLines(data.tsv));
  if (selection) {
    const center = mangaHoverGeometry.nearest(groups, canvas.width / 2, canvas.height / 2);
    return { text: center?.text ?? '' };
  }
  return { groups, scaleX: canvas.width / viewport.width, scaleY: canvas.height / viewport.height };
}

chrome.runtime.onMessage.addListener((message, _sender, respond) => {
  if (message.type !== 'manga-hover-ocr') return;
  const operation = queue.then(() => read(message));
  queue = operation.catch(() => {});
  operation.then(respond, error => respond({ error: error.message }));
  return true;
});
