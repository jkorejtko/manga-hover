(() => {
  const shortPhrases = new Set([
    'AH', 'EH', 'GO', 'HA', 'HEY', 'HI', 'HM', 'HMM', 'HUH', 'NO', 'OH', 'OK', 'OKAY',
    'COME', 'HELP', 'LOOK', 'OUCH', 'PLEASE', 'RUN', 'SHH', 'SORRY', 'STOP', 'SURE',
    'THANKS', 'UGH', 'WAIT', 'WHAT', 'WHERE', 'WHO', 'WHY', 'WOW', 'YEAH', 'YES',
  ]);

  function readable(words) {
    const tokens = words.map(word => ({
      ...word,
      clean: word.text.toUpperCase().replace(/^[^A-Z0-9]+|[^A-Z0-9]+$/g, ''),
    })).filter(word => word.clean);
    if (!tokens.length) return false;

    const average = tokens.reduce((sum, word) => sum + word.confidence, 0) / tokens.length;
    if (tokens.length === 1) return average >= 60 && shortPhrases.has(tokens[0].clean);

    const plausible = tokens.filter(({ clean }) =>
      /^[A-Z]+(?:['’-][A-Z]+)*$/.test(clean) && (
        /^(I|A)$/.test(clean) || (clean.length > 1 && /[AEIOUY]/.test(clean))
      )
    );
    return plausible.length >= 2 && plausible.length / tokens.length >= .7 && average >= 52;
  }

  function textLines(tsv) {
    const lines = new Map();
    for (const row of tsv.trim().split('\n').slice(1)) {
      const [level, page, block, paragraph, line, , x, y, w, h, confidence, ...words] = row.split('\t');
      const id = [page, block, paragraph, line].join('/');
      if (level === '4') {
        lines.set(id, { x: +x, y: +y, w: +w, h: +h, words: [] });
      } else if (level === '5' && words.join('').trim() && lines.has(id)) {
        const entry = lines.get(id);
        entry.words.push({ text: words.join(' ').trim(), confidence: +confidence });
      }
    }
    return [...lines.values()].filter(line => line.words.some(word => word.confidence >= 42 && /[A-Z]/i.test(word.text)));
  }

  function groupLines(lines) {
    const center = line => line.x + line.w / 2;
    const groups = [];
    for (const line of lines.sort((a, b) => a.y - b.y)) {
      let match;
      let best = Infinity;
      for (const group of groups) {
        const last = group.at(-1);
        const height = Math.max(line.h, last.h);
        const gap = line.y - last.y - last.h;
        const distance = Math.abs(center(line) - center(last));
        const overlap = Math.min(line.x + line.w, last.x + last.w) - Math.max(line.x, last.x);
        if (gap < -height * .35 || gap > height * 1.65 || overlap <= 0 ||
            distance > Math.max(height * 1.25, Math.max(line.w, last.w) * .3) ||
            Math.min(line.h, last.h) < height * .42) continue;
        const score = distance + Math.abs(gap);
        if (score < best) {
          match = group;
          best = score;
        }
      }
      if (match) match.push(line);
      else groups.push([line]);
    }
    return groups.filter(group => readable(group.flatMap(line => line.words))).map(group => {
      const x = Math.min(...group.map(line => line.x));
      const y = group[0].y;
      const right = Math.max(...group.map(line => line.x + line.w));
      const bottom = Math.max(...group.map(line => line.y + line.h));
      return {
        x, y, right, bottom,
        padding: Math.max(...group.map(line => line.h)) * 1.5,
        text: group.flatMap(line => line.words.map(word => word.text)).join(' '),
      };
    });
  }

  function nearest(groups, x, y) {
    let match;
    let best = Infinity;
    for (const group of groups) {
      const dx = Math.max(group.x - x, x - group.right, 0);
      const dy = Math.max(group.y - y, y - group.bottom, 0);
      const distance = Math.hypot(dx, dy);
      if (distance <= group.padding && distance < best) {
        best = distance;
        match = group;
      }
    }
    return match;
  }

  globalThis.mangaHoverGeometry = { textLines, groupLines, nearest, readable };
})();
