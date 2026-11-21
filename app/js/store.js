// Leonida Atlas v6 — progress store.
// Everything the tracker remembers lives in one localStorage record:
// earned trophy ids, per-trophy counters, per-step checkboxes (keyed
// "trophyId-stepIndex") and the spoiler-safe switch. Export downloads
// that record as JSON; import reads it back, step progress included.

const STORAGE_KEY = 'leonida-atlas-v6-progress';

export function emptyState() {
  return { earned: [], counters: {}, steps: {}, spoilerSafe: true };
}

function clean(parsed) {
  return {
    earned: Array.isArray(parsed.earned) ? parsed.earned.filter((n) => Number.isInteger(n)) : [],
    counters: parsed.counters && typeof parsed.counters === 'object' ? parsed.counters : {},
    steps: parsed.steps && typeof parsed.steps === 'object' ? parsed.steps : {},
    spoilerSafe: parsed.spoilerSafe !== false,
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    return clean(JSON.parse(raw));
  } catch {
    return emptyState();
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function demoState() {
  // A seeded mid-run save, used by ?seed=demo for previews and screenshots:
  // 13 of 55 earned (Chapter 1 story beats among them, so spoiler-safe mode
  // has earned story names to reveal), counters part-way on the big grinds
  // (Positive Mental Attitude sits at 6 of 18), and the first steps of the
  // open trophy already ticked.
  return {
    earned: [2, 3, 8, 9, 10, 11, 12, 13, 20, 21, 29, 33, 41],
    counters: { 14: 12, 15: 47, 16: 3, 17: 9, 18: 2, 19: 4, 25: 2, 28: 6, 30: 1, 31: 22, 32: 11, 35: 38, 42: 9, 43: 2, 54: 3, 55: 4 },
    steps: { '28-0': true, '28-1': true, '28-2': true, '28-3': true },
    spoilerSafe: true,
  };
}

export function exportState(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'leonida-atlas-v6-progress.json';
  link.click();
  URL.revokeObjectURL(link.href);
}

export function parseImported(text) {
  const parsed = JSON.parse(text);
  if (!parsed || !Array.isArray(parsed.earned)) throw new Error('not an atlas progress file');
  return clean(parsed);
}
