// Leonida Atlas v6 — Next Up queue and session planner.
// The queue is deterministic: the possibly missable trophy first, then
// unearned trophies in roadmap-stage order, then by list order. A trophy
// is "gated" when an earlier stage still has unearned trophies, so the
// queue is also the earliest-ungated list the right rail shows.

export function nextUpQueue(trophies, earnedIds) {
  const earned = new Set(earnedIds);
  const remaining = trophies.filter((t) => !earned.has(t.id) && t.grade !== 'platinum');
  const missable = remaining.filter((t) => t.flag === 'missable');
  const rest = remaining.filter((t) => t.flag !== 'missable');
  rest.sort((a, b) => a.stage - b.stage || a.id - b.id);
  const lowestStage = rest.length ? rest[0].stage : null;
  return [...missable, ...rest].map((t) => ({
    trophy: t,
    gated: t.flag !== 'missable' && lowestStage !== null && t.stage > lowestStage,
  }));
}

export function sessionPlan(queue, hoursAvailable) {
  // Fill the session greedily in queue order. The first pick is always
  // included even if it alone overruns the budget (starting the missable
  // or the current stage beats an empty plan); later picks must fit the
  // time left, and smaller trophies may fill the tail.
  const picks = [];
  let used = 0;
  for (const item of queue) {
    if (item.gated && picks.length > 0) continue;
    const cost = Math.max(0.5, item.trophy.hours || 1);
    if (picks.length === 0 || used + cost <= hoursAvailable) {
      picks.push(item);
      used += cost;
    }
    if (used >= hoursAvailable) break;
  }
  return { picks, used };
}

export function platinumEta(stages, trophies, earnedIds) {
  // Remaining hours: each stage's estimate scaled by the share of its
  // trophies still unearned, summed across stages.
  const earned = new Set(earnedIds);
  let total = 0;
  for (const stage of stages) {
    const inStage = trophies.filter((t) => t.stage === stage.n);
    if (!inStage.length) continue;
    const left = inStage.filter((t) => !earned.has(t.id)).length;
    total += stage.hours * (left / inStage.length);
  }
  return Math.round(total);
}
