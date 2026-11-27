// The WASM runtime forwards Tesseract's stderr to console.warn.
// Chrome lists these routine progress messages as extension errors.
const warn = console.warn.bind(console);
console.warn = (...args) => {
  const [message] = args;
  if (args.length === 1 && typeof message === 'string' &&
      /^Estimating resolution as \d+$/.test(message.trim())) return;
  warn(...args);
};

importScripts('vendor/worker.min.js');
