import { photoCrop, wrapText } from "./geometry.mjs";

export function drawPost(canvas, state, design, brand, photo, overlayOnly = false) {
  const { palette: p, formats, type: t, font } = design;
  const box = formats[state.format];
  canvas.width = box.width; canvas.height = box.height;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.clearRect(0, 0, box.width, box.height);
  if (!overlayOnly && photo) {
    const crop = photoCrop(photo.width, photo.height, box.width, box.height, state.zoom, state.panX, state.panY);
    ctx.drawImage(photo, crop.x, crop.y, crop.width, crop.height, 0, 0, box.width, box.height);
  }
  const light = state.tone === "cream";
  const background = light ? p.cream : p.forest;
  const foreground = light ? p.forest : p.cream;
  ctx.textBaseline = "top";
  const setFont = (size, weight = 400) => { ctx.font = `${weight} ${size}px "${font}"`; };
  if (state.branding === "wordmark" || state.branding === "signature") {
    const withLogo = state.branding === "signature";
    if (withLogo) ctx.drawImage(brand, box.left, box.top, 32, 32);
    setFont(t.small, 800);
    ctx.fillStyle = light ? p.cream : p.forest;
    ctx.fillText("bolets.app", box.left + (withLogo ? 42 : 0), box.top + (withLogo ? 3 : 0));
  } else if (state.branding === "badge") {
    setFont(t.label, 900);
    const width = ctx.measureText("bolets.app").width + 86;
    ctx.fillStyle = background; ctx.fillRect(box.left, box.top, width, 62);
    ctx.drawImage(brand, box.left + 12, box.top + 10, 42, 42);
    ctx.fillStyle = foreground; ctx.fillText("bolets.app", box.left + 66, box.top + 18);
  }
  const panelWidth = box.width - box.left - box.right;
  const textWidth = panelWidth - 64;
  const blocks = [];
  let overflow = false;
  const add = (text, size, weight, color, spacing, maxLines) => {
    if (!text.trim()) return;
    setFont(size, weight);
    const wrapped = wrapText(text, textWidth, value => ctx.measureText(value).width, maxLines);
    overflow ||= wrapped.overflow;
    blocks.push({ ...wrapped, size, weight, color, spacing, lineHeight: size * 1.2 });
  };
  if (state.preset === "field") {
    add(state.eyebrow.toLocaleUpperCase("ca"), t.label, 800, light ? p.clay : p.orangeLight, 0, 2);
    add(state.title, t.heading, 900, foreground, blocks.length ? 16 : 0, 3);
    add(state.caption, t.body, 400, foreground, 18, 5);
  } else if (state.preset === "headline") {
    add(state.title, t.coverLong, 900, foreground, 0, 3);
  }
  add(state.credit, t.credit, 400, light ? p.muted : "#bfcbb8", blocks.length ? 20 : 0, 3);
  if (blocks.length) {
    const height = 56 + blocks.reduce((sum, block) => sum + block.spacing + block.lines.length * block.lineHeight, 0);
    overflow ||= height > (box.height - box.top - box.bottom - 100);
    const top = box.top + (state.branding === "none" ? 0 : 100);
    let y = state.preset !== "photo" && state.placement === "top" ? top : box.height - box.bottom - height;
    // A photo-only credit gets a compact label, not a full-width footer.
    let width = panelWidth;
    if (state.preset === "photo") {
      setFont(t.credit);
      width = Math.min(panelWidth, Math.max(...blocks.flatMap(block => block.lines.map(line => ctx.measureText(line).width))) + 64);
    }
    ctx.fillStyle = background; ctx.fillRect(box.left, y, width, height);
    y += 28;
    for (const block of blocks) {
      y += block.spacing; setFont(block.size, block.weight); ctx.fillStyle = block.color;
      for (const line of block.lines) { ctx.fillText(line, box.left + 32, y); y += block.lineHeight; }
    }
  }
  return { overflow, width: box.width, height: box.height };
}
