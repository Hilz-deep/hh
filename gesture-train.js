// Gesture trainer: rotation/scale/translation-invariant features from the 21
// MediaPipe landmarks, a distance-weighted k-NN classifier, and localStorage
// persistence. No external ML dependency; training data never leaves the device.

const STORE_KEY = 'noel-gesture-train-v1';
export const LABELS = ['none', 'fist', 'palm', 'pinch', 'ok'];
export const LABEL_NAMES = { none: '其他', fist: '握拳', palm: '张开', pinch: '捏合', ok: 'OK' };

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));

// Build an invariant feature vector: translate so the wrist is at origin,
// rotate so the palm's knuckle line lies on the x axis, then scale by palm size.
export function extractFeatures(points) {
  if (!points || points.length < 21) return null;
  const wrist = points[0];
  const scale = (dist(points[0], points[9]) + dist(points[5], points[17])) * 0.5;
  if (!scale || scale < 1e-6) return null;
  // Palm frame: x axis from index MCP (5) to pinky MCP (17).
  const ax = points[17].x - points[5].x;
  const ay = points[17].y - points[5].y;
  const an = Math.hypot(ax, ay) || 1;
  const ux = ax / an, uy = ay / an;
  const vx = -uy, vy = ux;
  const out = [];
  for (const p of points) {
    const dx = p.x - wrist.x, dy = p.y - wrist.y;
    // Project onto palm frame and normalise by palm size. z is scaled only.
    out.push((dx * ux + dy * uy) / scale);
    out.push((dx * vx + dy * vy) / scale);
    out.push((p.z ?? 0) / scale * 0.5);
  }
  return out;
}

function loadSamples() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const data = raw ? JSON.parse(raw) : null;
    return Array.isArray(data?.samples) ? data.samples : [];
  } catch { return []; }
}

export function createTrainer() {
  let samples = loadSamples();
  let enabled = false;

  function persist() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ version: 1, samples })); } catch {}
  }
  function counts() {
    const c = {};
    for (const s of samples) c[s.label] = (c[s.label] || 0) + 1;
    return c;
  }
  function add(label, features) {
    if (!LABELS.includes(label) || !features) return false;
    samples.push({ label, f: features.map(v => Math.round(v * 1000) / 1000), t: Date.now() });
    persist();
    return true;
  }
  function undo() { if (!samples.length) return false; samples.pop(); persist(); return true; }
  function clear() { samples = []; persist(); }
  function size() { return samples.length; }

  // Distance-weighted k-NN: closer neighbours cast a stronger vote.
  function predict(features) {
    if (!features || !samples.length) return null;
    const scored = [];
    for (const s of samples) {
      if (s.f.length !== features.length) continue;
      let sum = 0;
      for (let i = 0; i < features.length; i++) { const d = features[i] - s.f[i]; sum += d * d; }
      scored.push({ label: s.label, d: Math.sqrt(sum) });
    }
    if (!scored.length) return null;
    scored.sort((a, b) => a.d - b.d);
    const k = Math.min(9, scored.length);
    const votes = {};
    for (let i = 0; i < k; i++) {
      const { label, d } = scored[i];
      const w = 1 / (d + 0.08);
      votes[label] = (votes[label] || 0) + w;
    }
    let best = null, bestScore = -1, total = 0;
    for (const label in votes) { total += votes[label]; if (votes[label] > bestScore) { bestScore = votes[label]; best = label; } }
    return { label: best, confidence: total ? bestScore / total : 0 };
  }

  function exportJSON() { return JSON.stringify({ version: 1, labels: LABELS, samples }, null, 2); }
  function importJSON(text) {
    try {
      const data = JSON.parse(text);
      const incoming = Array.isArray(data?.samples) ? data.samples : [];
      const valid = incoming.filter(s => LABELS.includes(s.label) && Array.isArray(s.f));
      if (!valid.length) return false;
      samples = samples.concat(valid);
      persist();
      return true;
    } catch { return false; }
  }

  return {
    add, undo, clear, size, counts, predict, exportJSON, importJSON,
    get enabled() { return enabled; },
    set enabled(v) { enabled = !!v; },
  };
}
