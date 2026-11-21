// Leonida Atlas — planner maths.
// Pure helpers shared by the planner view and the header summary:
// what is left, how long it should take, and which trophies come next
// when the roadmap order is respected.

function isEarned(progress, trophy) {
  return progress.earned[trophy.id] === true;
}

function stepsTicked(progress, trophy) {
  let n = 0;
  for (let i = 0; i < trophy.steps.length; i++) {
    if (progress.stepsDone[trophy.id + ":" + i]) n++;
  }
  return n;
}

function totalStepsTicked(progress, trophies) {
  let n = 0;
  for (const t of trophies) n += stepsTicked(progress, t);
  return n;
}

function earnedByGrade(progress, trophies) {
  const tally = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const t of trophies) if (isEarned(progress, t)) tally[t.grade]++;
  return tally;
}

// Roadmap order = stage first, then position inside the stage as the
// data lists it (ids already follow the intended play order).
function roadmapSequence(trophies) {
  return [...trophies].sort((a, b) => (a.stage - b.stage) || (a.id - b.id));
}

function nextUp(progress, trophies, limit) {
  // The possibly-missable trophy always leads — it is the one entry
  // that cannot wait — then plain roadmap order (stage, then listing
  // position) for everything else.
  return [...trophies]
    .filter((t) => !isEarned(progress, t))
    .sort((a, b) =>
      ((a.flag === "missable" ? 0 : 1) - (b.flag === "missable" ? 0 : 1)) ||
      (a.stage - b.stage) || (a.id - b.id))
    .slice(0, limit);
}

// Hours still on the table: a trophy's listed hours count in full until
// it is earned; counters shave off the share already logged.
function hoursRemaining(progress, trophy) {
  if (isEarned(progress, trophy)) return 0;
  if (typeof trophy.count === "number" && trophy.count > 0) {
    const done = Math.min(progress.counters[trophy.id] || 0, trophy.count);
    return trophy.hours * (1 - done / trophy.count);
  }
  return trophy.hours;
}

function planSummary(progress, trophies) {
  const chosen = progress.plan
    .map((id) => trophies.find((t) => t.id === id))
    .filter(Boolean);
  let hours = 0;
  let open = 0;
  for (const t of chosen) {
    hours += hoursRemaining(progress, t);
    if (!isEarned(progress, t)) open++;
  }
  return { chosen, hours, open };
}

function platinumSummary(progress, trophies, stages) {
  const totalHours = stages.reduce((sum, s) => sum + s.hours, 0);
  let remaining = 0;
  for (const t of trophies) remaining += hoursRemaining(progress, t);
  const earnedCount = trophies.filter((t) => isEarned(progress, t)).length;
  return { totalHours, remaining, earnedCount, total: trophies.length };
}

// Missable ordering: the possibly-missable trophy first, then watch and
// unconfirmed entries by earliest roadmap stage (their last chance).
function watchOrder(trophies) {
  const rank = { missable: 0, watch: 1, unconfirmed: 2 };
  return trophies
    .filter((t) => t.flag !== "none")
    .sort((a, b) => (rank[a.flag] - rank[b.flag]) || (a.stage - b.stage) || (a.id - b.id));
}
