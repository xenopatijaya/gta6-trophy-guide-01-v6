// Leonida Atlas — progress store.
// Everything the player ticks, counts or plans lives in one plain object
// that is mirrored to localStorage after every change and can be exported
// to / imported from a JSON file. No framework, no build step.

const STORAGE_KEY = "leonida-atlas-progress-v6";
const EXPORT_FORMAT = "leonida-atlas-export/1";

function blankProgress() {
  return {
    earned: {},      // trophy id -> true once the trophy is marked earned
    stepsDone: {},   // "trophyId:stepIndex" -> true
    counters: {},    // trophy id -> current counter value
    plan: [],        // trophy ids, in the order they were added
    spoilerSafe: true,
  };
}

// A lived-in sample used only when the page is opened with ?seed=demo,
// so screenshots and first impressions show the tracker mid-run.
function demoProgress() {
  const p = blankProgress();
  const earnedIds = [2, 3, 8, 10, 11, 16, 20, 21, 22, 25, 26, 33, 34];
  for (const id of earnedIds) p.earned[id] = true;
  const ticked = ["28:0", "28:1", "28:2", "2:0"];
  for (const key of ticked) p.stepsDone[key] = true;
  p.counters = {
    15: 21, 16: 2, 17: 9, 18: 5, 19: 7, 25: 3, 28: 6, 30: 1,
    31: 31, 32: 18, 35: 34, 40: 2, 42: 16, 43: 2, 54: 2, 55: 4,
  };
  p.plan = [28, 17, 31];
  return p;
}

function loadProgress() {
  const params = new URLSearchParams(location.search);
  if (params.get("seed") === "demo") return demoProgress();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return blankProgress();
    const parsed = JSON.parse(raw);
    return Object.assign(blankProgress(), parsed);
  } catch {
    return blankProgress();
  }
}

function saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Storage can be unavailable (private mode, quota); the in-memory
    // state still drives the page for this session.
  }
}

function exportProgress(progress) {
  const payload = {
    format: EXPORT_FORMAT,
    progress: {
      earned: progress.earned,
      stepsDone: progress.stepsDone,
      counters: progress.counters,
      plan: progress.plan,
      spoilerSafe: progress.spoilerSafe,
    },
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "leonida-atlas-progress.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 5000);
}

function importProgress(file, onDone, onError) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const incoming = parsed && parsed.progress ? parsed.progress : parsed;
      if (!incoming || typeof incoming !== "object") throw new Error("not a progress file");
      const merged = Object.assign(blankProgress(), incoming);
      onDone(merged);
    } catch (err) {
      onError(err);
    }
  };
  reader.onerror = () => onError(reader.error);
  reader.readAsText(file);
}

// Sum of the "collectible-style" counters currently logged: plain unit
// counters only (no percentages, no dollar totals, no choice tallies).
function loggedUnits(progress, trophies) {
  let total = 0;
  for (const t of trophies) {
    if (typeof t.count !== "number") continue;
    if (t.countLabel === "%" || t.countLabel === "choices") continue;
    if (t.countLabel.includes("dollars")) continue;
    total += Math.min(progress.counters[t.id] || 0, t.count);
  }
  return total;
}

function targetUnits(trophies) {
  let total = 0;
  for (const t of trophies) {
    if (typeof t.count !== "number") continue;
    if (t.countLabel === "%" || t.countLabel === "choices") continue;
    if (t.countLabel.includes("dollars")) continue;
    total += t.count;
  }
  return total;
}
