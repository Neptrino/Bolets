export const defaults = {
  format: "feed", tone: "cream", preset: "photo", branding: "wordmark", placement: "bottom",
  eyebrow: "NOTA DE CAMP", title: "", caption: "", credit: "", zoom: 1, panX: 0, panY: 0,
};

// Old captions survive the upgrade, but the old compulsory panel does not.
export function restoreSettings(saved = {}, legacy = {}) {
  const state = { ...defaults };
  for (const [key, limit] of Object.entries({ eyebrow: 32, title: 70, caption: 180, credit: 140 })) {
    const value = saved[key] ?? legacy[key];
    if (typeof value === "string") state[key] = value.slice(0, limit);
  }
  for (const [key, choices] of Object.entries({
    format: ["feed", "story"], tone: ["forest", "cream"], preset: ["photo", "headline", "field"],
    branding: ["none", "wordmark", "signature", "badge"], placement: ["top", "bottom"],
  })) if (choices.includes(saved[key])) state[key] = saved[key];
  return state;
}

export function hasOverlay(state) {
  return state.branding !== "none" || !!state.credit.trim() ||
    (state.preset !== "photo" && !!state.title.trim()) ||
    (state.preset === "field" && !!(state.eyebrow.trim() || state.caption.trim()));
}
