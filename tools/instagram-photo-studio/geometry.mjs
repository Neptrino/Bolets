export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function photoCrop(sourceWidth, sourceHeight, width, height, zoom = 1, panX = 0, panY = 0) {
  if (![sourceWidth, sourceHeight, width, height, zoom].every(value => Number.isFinite(value) && value > 0)) throw new Error("Invalid photo dimensions");
  const scale = Math.max(width / sourceWidth, height / sourceHeight) * clamp(zoom, 1, 3);
  const cropWidth = width / scale;
  const cropHeight = height / scale;
  return {
    x: (sourceWidth - cropWidth) * (clamp(panX, -1, 1) + 1) / 2,
    y: (sourceHeight - cropHeight) * (clamp(panY, -1, 1) + 1) / 2,
    width: cropWidth, height: cropHeight,
  };
}

export function wrapText(text, width, measure, maxLines = 4) {
  const words = text.trim().split(/\s+/u).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (measure(candidate) <= width) { line = candidate; continue; }
    if (line) { lines.push(line); line = ""; }
    for (const character of word) {
      if (line && measure(line + character) > width) { lines.push(line); line = ""; }
      line += character;
    }
  }
  if (line) lines.push(line);
  return { lines: lines.slice(0, maxLines), overflow: lines.length > maxLines };
}
