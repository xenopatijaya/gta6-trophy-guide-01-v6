// Leonida Atlas v6 — application logic.
// One dataset (data/trophies.json) drives every number on the page:
// the header audit strip, the ledger, the roadmap, the watch list,
// the planner and the source matrix are all computed at runtime.

let DATA = null;
let progress = loadProgress();
let ui = {
  view: "ledger",
  query: "",
  kind: "all",
  grade: "all",
  stage: "all",
  earnedOnly: false,
  selectedId: 28,
};

const appEl = document.getElementById("app");

function esc(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Turn "[5][23]" citation markers in dataset prose into styled spans.
function cited(text) {
  return esc(text).replace(/\[(\d+)\]/g, '<span class="cite">[$1]</span>');
}

function citationsIn(text) {
  const found = String(text).match(/\[\d+\]/g);
  return found ? found.length : 0;
}

function trophyClaims(trophy) {
  let n = citationsIn(trophy.guide);
  for (const step of trophy.steps) n += citationsIn(step);
  return n;
}

function gradeSplit(trophies) {
  const split = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const t of trophies) split[t.grade]++;
  return split;
}

function computeAudit(data) {
  const trophies = data.trophies;
  const split = gradeSplit(trophies);
  let stepsTotal = 0;
  let stepsCited = 0;
  let claims = 0;
  let guidesSourced = 0;
  let guidesMulti = 0;
  const citedBy = new Map();
  for (const t of trophies) {
    stepsTotal += t.steps.length;
    for (const step of t.steps) if (citationsIn(step) > 0) stepsCited++;
    claims += trophyClaims(t);
    if (t.sources.length >= 1) guidesSourced++;
    if (t.sources.length >= 2) guidesMulti++;
    for (const n of t.sources) citedBy.set(n, (citedBy.get(n) || 0) + 1);
  }
  const sites = new Set(data.sources.map((s) => new URL(s.url).hostname.replace(/^www\./, "")));
  return {
    split, stepsTotal, stepsCited, claims, guidesSourced, guidesMulti, citedBy,
    hidden: trophies.filter((t) => t.hidden).length,
    missable: trophies.filter((t) => t.flag === "missable").length,
    watch: trophies.filter((t) => t.flag === "watch").length,
    unconfirmed: trophies.filter((t) => t.flag === "unconfirmed").length,
    sites: sites.size,
    targets: targetUnits(trophies),
  };
}

function renderMasthead() {
  const trophies = DATA.trophies;
  const earned = earnedByGrade(progress, trophies);
  const earnedCount = trophies.filter((t) => isEarned(progress, t)).length;
  const pct = Math.round((earnedCount / trophies.length) * 1000) / 10;
  const ticked = totalStepsTicked(progress, trophies);
  const totalSteps = trophies.reduce((s, t) => s + t.steps.length, 0);
  document.getElementById("masthead-progress").innerHTML =
    '<div class="big-count">' + earnedCount + ' <small>/ ' + trophies.length + ' earned</small></div>' +
    '<div class="progress-track"><div class="progress-fill" style="width:' + pct + '%"></div></div>' +
    '<div class="tally-line">' + earned.platinum + '/1 platinum · ' + earned.gold + '/2 gold · ' +
    earned.silver + '/6 silver · ' + earned.bronze + '/46 bronze</div>' +
    '<div class="tally-line"><b>' + loggedUnits(progress, trophies) + ' collectibles logged</b> · ' +
    ticked + '/' + totalSteps + ' steps ticked</div>';
}

function renderAuditStrip() {
  const a = computeAudit(DATA);
  const el = document.getElementById("audit-strip");
  el.innerHTML =
    '<div class="audit-inner">' +
    '<span class="audit-label">AUDIT · LIVE FROM DATA</span>&nbsp; ' +
    '<b>' + DATA.trophies.length + '/' + DATA.trophies.length + '</b> official · ' +
    '1P ' + a.split.gold + 'G ' + a.split.silver + 'S ' + a.split.bronze + 'B&nbsp; ' +
    '<b>' + a.hidden + '</b> PSN-hidden&nbsp; ' +
    '<b>' + a.stepsCited + '/' + a.stepsTotal + '</b> steps cited&nbsp; ' +
    '<b>' + a.guidesSourced + '/' + DATA.trophies.length + '</b> guides sourced&nbsp; ' +
    '<b>' + a.guidesMulti + '</b> guides on 2+ sources&nbsp; ' +
    '<b>' + a.claims + '</b> claims&nbsp; ' +
    '<b>' + DATA.sources.length + '</b> pages / ' + a.sites + ' sites read ' + esc(DATA.readDate) + '&nbsp; ' +
    '<span class="warn">' + a.missable + ' possibly missable</span><br>' +
    '<b>' + a.watch + '</b> at risk (watch)&nbsp; ' +
    '<b>' + a.unconfirmed + '</b> unconfirmed&nbsp; ' +
    '<b>' + DATA.disputes.length + '</b> disputes shown both ways&nbsp; ' +
    '<b>' + a.targets + '</b> collectible targets&nbsp; ' +
    '<b>' + loggedUnits(progress, DATA.trophies) + '</b> logged' +
    '</div>';
}

function persist() {
  saveProgress(progress);
  renderMasthead();
  renderAuditStrip();
}

function flagPill(trophy) {
  if (trophy.flag === "missable") return '<span class="pill flag">Possibly Missable</span>';
  if (trophy.flag === "watch") return '<span class="pill warn">Watch</span>';
  if (trophy.flag === "unconfirmed") return '<span class="pill dark">Unconfirmed</span>';
  return "";
}

function displayName(trophy) {
  if (progress.spoilerSafe && trophy.hidden) return "Story trophy — hidden until earned";
  return trophy.name;
}

function displayDesc(trophy) {
  if (progress.spoilerSafe && trophy.hidden) return "Description hidden by spoiler-safe mode.";
  return trophy.description;
}

/* ---------------- ledger view ---------------- */

function matchesFilters(t) {
  if (ui.kind !== "all" && t.kind !== ui.kind) return false;
  if (ui.grade !== "all" && t.grade !== ui.grade) return false;
  if (ui.stage !== "all" && t.stage !== Number(ui.stage)) return false;
  if (ui.earnedOnly && !isEarned(progress, t)) return false;
  if (ui.query) {
    const hay = (t.name + " " + t.description + " " + t.guide).toLowerCase();
    if (!hay.includes(ui.query.toLowerCase())) return false;
  }
  return true;
}

function toolbarHtml() {
  const kinds = [["all", "All kinds"], ["story", "Story"], ["activities", "Activities"], ["collectibles", "Collectibles"], ["meta", "Meta"]];
  const kindBtns = kinds.map(([k, label]) =>
    '<button class="chip-btn' + (ui.kind === k ? " is-on" : "") + '" data-kind="' + k + '">' + label + '</button>').join("");
  const gradeOpts = ["all", "platinum", "gold", "silver", "bronze"].map((g) =>
    '<option value="' + g + '"' + (ui.grade === g ? " selected" : "") + '>' + (g === "all" ? "All grades" : g[0].toUpperCase() + g.slice(1)) + '</option>').join("");
  const stageOpts = ['<option value="all"' + (ui.stage === "all" ? " selected" : "") + '>All stages</option>']
    .concat(DATA.stages.map((s) => '<option value="' + s.n + '"' + (Number(ui.stage) === s.n ? " selected" : "") + '>Stage ' + s.n + '</option>')).join("");
  return '<div class="toolbar">' +
    '<label class="field">SEARCH<input type="search" id="f-query" placeholder="Name, description, guide text..." value="' + esc(ui.query) + '"></label>' +
    '<div class="field">KIND<div class="kind-chips">' + kindBtns + '</div></div>' +
    '<label class="field">GRADE<select id="f-grade">' + gradeOpts + '</select></label>' +
    '<label class="field">STAGE<select id="f-stage">' + stageOpts + '</select></label>' +
    '<label class="toggle-line"><input type="checkbox" id="f-earned"' + (ui.earnedOnly ? " checked" : "") + '> Earned only</label>' +
    '<label class="toggle-line"><input type="checkbox" id="f-spoiler"' + (progress.spoilerSafe ? " checked" : "") + '> Spoiler-safe</label>' +
    '<button class="btn" id="btn-export">Export</button>' +
    '<button class="btn ghost" id="btn-import">Import</button>' +
    '<button class="btn danger" id="btn-reset">Reset</button>' +
    '</div>';
}

function ledgerListHtml(list) {
  let html = "";
  for (const stage of DATA.stages) {
    const inStage = list.filter((t) => t.stage === stage.n);
    if (!inStage.length) continue;
    const allInStage = DATA.trophies.filter((t) => t.stage === stage.n);
    const earnedInStage = allInStage.filter((t) => isEarned(progress, t)).length;
    const pctStage = Math.round((earnedInStage / allInStage.length) * 100);
    html += '<div class="group-heading"><span><b>' + esc(stage.title.split("—")[0].trim()) + '</b> — ' +
      esc(stage.title.split("—")[1] ? stage.title.split("—")[1].trim() : "") + '</span>' +
      '<span>' + earnedInStage + '/' + allInStage.length + ' earned · ≈' + stage.hours + ' h</span>' +
      '<span class="group-bar"><i style="width:' + pctStage + '%"></i></span></div>';
    for (const t of inStage) {
      html += '<button class="trophy-row' + (t.id === ui.selectedId ? " is-selected" : "") + '" data-select="' + t.id + '">' +
        '<input type="checkbox" data-earned="' + t.id + '"' + (isEarned(progress, t) ? " checked" : "") + '>' +
        '<span><span class="row-name">' + esc(displayName(t)) + '</span>' +
        '<span class="row-desc" style="display:block">' + esc(displayDesc(t)) + '</span>' +
        '<span class="pill grade-' + t.grade + '">' + t.grade[0].toUpperCase() + t.grade.slice(1) + ' · ' + t.points + ' Pts</span>' +
        '<span class="pill">Stage ' + t.stage + '</span>' +
        '<span class="pill">' + t.kind[0].toUpperCase() + t.kind.slice(1) + '</span>' +
        (t.hidden ? '<span class="pill dark">Hidden</span>' : '') +
        '<span class="pill steps">steps ' + stepsTicked(progress, t) + '/' + t.steps.length + '</span></span></button>';
    }
  }
  return html || '<p class="empty-note">No trophies match the current filters.</p>';
}

function detailHtml(t) {
  const disputes = DATA.disputes.filter((d) => d.trophy === t.name);
  let html = '<div class="detail-card">';
  html += '<h2>' + esc(t.name) + '</h2>';
  html += '<div class="official-line"><span class="official-label">OFFICIAL DESCRIPTION</span><i>“' +
    esc(t.description) + '”</i> <span class="cite">[1]</span></div>';
  html += '<div>' +
    '<span class="pill grade-' + t.grade + '">' + t.grade[0].toUpperCase() + t.grade.slice(1) + ' · ' + t.points + ' PSN Pts</span>' +
    flagPill(t) +
    (disputes.length ? '<span class="pill warn">Sources Differ</span>' : '') +
    '<span class="pill">Stage ' + t.stage + ' · ' + t.kind[0].toUpperCase() + t.kind.slice(1) +
    ' · Difficulty ' + t.difficulty + '/10 · ≈' + t.hours + ' h</span></div>';

  if (typeof t.count === "number") {
    const cur = Math.min(progress.counters[t.id] || 0, t.count);
    const pctC = Math.round((cur / t.count) * 100);
    html += '<div class="counter-box"><span class="counter-label">YOUR COUNT</span>' +
      '<button class="step-btn" data-count="' + t.id + ':-1">−</button>' +
      '<span class="counter-value">' + cur.toLocaleString("en-US") + ' / ' + t.count.toLocaleString("en-US") + ' ' + esc(t.countLabel) + '</span>' +
      '<span class="counter-bar"><i style="width:' + pctC + '%"></i></span>' +
      '<button class="step-btn" data-count="' + t.id + ':1">+</button></div>';
  }

  if (t.flag === "missable") {
    html += '<div class="callout missable"><b>MISSABLE WINDOW.</b> The first meditation, at Jason\'s house in Chapter 1, ' +
      'is gone once Chapter 1 ends — do it after Down to Earth and keep a chapter-start save <span class="cite">[5]</span><span class="cite">[8]</span><span class="cite">[22]</span>.</div>';
  } else if (t.flag === "watch") {
    html += '<div class="callout watch"><b>WATCH.</b> This one has a specific setup that is easy to fumble — read the steps before attempting it.</div>';
  } else if (t.flag === "unconfirmed") {
    html += '<div class="callout unconfirmed"><b>UNCONFIRMED.</b> Launch sources have not yet verified the exact trigger for this trophy.</div>';
  }

  disputes.slice(0, 1).forEach((d) => {
    html += '<div class="dispute-box"><h4>DISPUTE — ' + esc(d.topic) + '</h4>' +
      '<div class="dispute-cols"><div><span class="side-label">VERSION A</span><p>' + cited(d.a) + '</p></div>' +
      '<div><span class="side-label">VERSION B</span><p>' + cited(d.b) + '</p></div></div>' +
      '<p class="dispute-call">' + cited(d.call) + '</p></div>';
  });
  if (disputes.length > 1) {
    html += '<p class="spoiler-note">+' + (disputes.length - 1) + ' more dispute' +
      (disputes.length > 2 ? 's' : '') + ' on this trophy — all ' + DATA.disputes.length +
      ' disputes are laid out in Sources &amp; disputes.</p>';
  }

  if (progress.spoilerSafe && t.hidden) {
    html += '<p class="spoiler-note">Guide hidden by spoiler-safe mode — turn it off above to read the route for this trophy.</p>';
  } else {
    html += '<h3 style="margin:9px 0 2px;font-size:16px">How to earn it — every step cited</h3>';
    html += '<ol class="step-list">';
    t.steps.forEach((step, i) => {
      const key = t.id + ":" + i;
      const done = progress.stepsDone[key] === true;
      html += '<li class="' + (done ? "is-done" : "") + '"><span class="step-num">' + (i + 1) + '.</span>' +
        '<input type="checkbox" data-step="' + key + '"' + (done ? " checked" : "") + '>' +
        '<span class="step-text">' + cited(step) + '</span></li>';
    });
    html += '</ol>';
    html += '<h3 style="margin:16px 0 4px;font-size:16px">Guide notes</h3>';
    html += '<p class="guide-prose">' + cited(t.guide) + '</p>';
  }

  const inPlan = progress.plan.includes(t.id);
  html += '<div class="detail-actions">' +
    '<button class="btn" data-toggle-earned="' + t.id + '">' + (isEarned(progress, t) ? "Mark not earned" : "Mark earned") + '</button>' +
    '<button class="btn ghost" data-plan="' + t.id + '">' + (inPlan ? "Remove from plan" : "Add to plan") + '</button></div>';
  html += '</div>';
  return html;
}

function railsHtml() {
  const audit = computeAudit(DATA);
  const upcoming = nextUp(progress, DATA.trophies, 5);
  let html = '<div>';
  html += '<div class="rail-card"><h3>NEXT UP · EARLIEST UNGATED</h3><ol>';
  upcoming.forEach((t, i) => {
    html += '<li><span class="linkish" data-select="' + t.id + '"><b>' + esc(t.name) + '</b></span>' +
      '<span class="sub">Stage ' + t.stage + ' · ≈' + t.hours + ' h · ' + (isEarned(progress, t) ? "earned" : "ungated") + '</span></li>';
  });
  html += '</ol></div>';

  html += '<div class="rail-card"><h3>ROADMAP ORDER</h3><ol>';
  for (const stage of DATA.stages) {
    const inStage = DATA.trophies.filter((t) => t.stage === stage.n);
    const earnedInStage = inStage.filter((t) => isEarned(progress, t)).length;
    const names = inStage.slice(0, 4).map((t) => t.name).join(" · ");
    const more = inStage.length > 4 ? ' · +' + (inStage.length - 4) + ' more' : '';
    html += '<li><b>Stage ' + stage.n + ' — ' + esc(stage.title.split("—")[1] ? stage.title.split("—")[1].trim() : stage.title) + '</b>' +
      '<span class="sub">' + earnedInStage + '/' + inStage.length + ' earned</span>' +
      '<span class="sub">' + esc(names + more) + '</span></li>';
  }
  html += '</ol></div>';

  const plat = platinumSummary(progress, DATA.trophies, DATA.stages);
  html += '<div class="rail-card"><h3>TIME TO PLATINUM</h3>' +
    '<p style="margin:0;font-size:14px;line-height:1.55">About <b>' + Math.round(plat.remaining) + ' h</b> of the ≈' +
    plat.totalHours + ' h route is still ahead (' + plat.earnedCount + ' of ' + plat.total + ' trophies earned). ' +
    'One playthrough, no online trophies.</p></div>';

  html += '<div class="rail-card"><h3>SOURCES</h3><ol class="src-list">';
  for (const s of DATA.sources) {
    html += '<li>' + esc(s.name) + ' — cited by ' + (audit.citedBy.get(s.n) || 0) + ' of 55</li>';
  }
  html += '</ol></div></div>';
  return html;
}

function renderLedger() {
  const list = DATA.trophies.filter(matchesFilters);
  const selected = DATA.trophies.find((t) => t.id === ui.selectedId) || DATA.trophies[0];
  const ticked = totalStepsTicked(progress, DATA.trophies);
  const totalSteps = DATA.trophies.reduce((s, t) => s + t.steps.length, 0);
  const earnedCount = DATA.trophies.filter((t) => isEarned(progress, t)).length;
  appEl.innerHTML = toolbarHtml() +
    '<p class="result-line">Showing ' + list.length + ' of ' + DATA.trophies.length + ' trophies · ' +
    earnedCount + ' earned · ' + ticked + '/' + totalSteps + ' steps ticked · click a row for its cited guide</p>' +
    '<div class="ledger-grid"><div>' + ledgerListHtml(list) + '</div>' +
    '<div>' + detailHtml(selected) + '</div>' + railsHtml() + '</div>';
  bindToolbar();
}

/* ---------------- roadmap view ---------------- */

function renderRoadmap() {
  const totalHours = DATA.stages.reduce((s, x) => s + x.hours, 0);
  let cumulative = 0;
  let html = '<h2 class="view-heading">Roadmap to the platinum</h2>' +
    '<p class="view-intro">Six stages, ≈' + totalHours + ' hours in total, one playthrough. The launch roadmap rates the set 4/10 difficulty ' +
    'with a single possibly missable trophy <span class="cite">[5]</span>. Per-stage hours below sum to the platinum estimate; ' +
    'each stage card carries its own numbered, cited action steps.</p>';
  html += '<div class="summary-chips">' +
    '<span class="chip">≈' + totalHours + ' hours total <span class="cite">[5]</span></span>' +
    '<span class="chip">Difficulty 4/10 <span class="cite">[5]</span></span>' +
    '<span class="chip">1 playthrough <span class="cite">[5]</span></span>' +
    '<span class="chip">1 possibly missable <span class="cite">[5]</span><span class="cite">[22]</span></span>' +
    '<span class="chip">8 watch <span class="cite">[4]</span></span>' +
    '<span class="chip">0 online trophies <span class="cite">[1]</span><span class="cite">[2]</span></span>' +
    '<span class="chip">0 glitched reported <span class="cite">[5]</span></span>' +
    '<span class="chip">Manual save at every chapter start <span class="cite">[5]</span></span>' +
    '<span class="chip">100% checklist uses thresholds, not totals <span class="cite">[19]</span><span class="cite">[21]</span></span></div>';

  html += '<div class="two-col"><div>';
  for (const stage of DATA.stages) {
    cumulative += stage.hours;
    const inStage = DATA.trophies.filter((t) => t.stage === stage.n);
    const earnedInStage = inStage.filter((t) => isEarned(progress, t)).length;
    const pctStage = inStage.length ? Math.round((earnedInStage / inStage.length) * 100) : 0;
    html += '<div class="stage-card"><h3>Stage ' + stage.n + ' — ' + esc(stage.title) + '</h3>' +
      '<div class="stage-meta"><b>' + earnedInStage + '/' + inStage.length + ' earned</b> · ≈' + stage.hours +
      ' h · cumulative ≈' + cumulative + ' h · ' + cited(stage.note) + '</div>' +
      '<div class="stage-bar"><i style="width:' + pctStage + '%"></i></div><ol>' +
      stage.actions.map((a) => '<li>' + cited(a) + '</li>').join("") +
      '</ol><div class="stage-names">' + inStage.map((t) => esc(t.name)).join(" · ") + '</div></div>';
  }
  html += '</div>';

  const watch = watchOrder(DATA.trophies);
  html += '<div class="rail-card"><h3>MISSABLE WATCH — LAST-CHANCE CHAPTERS</h3><ol>';
  watch.forEach((t, i) => {
    const label = t.flag === "missable" ? '<span class="pill flag">Possibly Missable</span>' : '<span class="pill warn">Watch</span>';
    const chance = t.flag === "missable" ? "Chapter 1, before the chapter ends" : "free roam — set it up before you attempt it";
    html += '<li><span class="linkish" data-select="' + t.id + '"><b>' + esc(t.name) + '</b></span> ' + label +
      '<span class="sub">Last chance: ' + chance + ' · first step: ' + cited(t.steps[0] || "") + '</span></li>';
  });
  html += '</ol></div></div>';
  appEl.innerHTML = html;
}

/* ---------------- missables view ---------------- */

function renderMissables() {
  const groups = [
    ["missable", "Possibly missable"],
    ["watch", "Watch — specific setups, easy to fumble"],
    ["unconfirmed", "Unconfirmed — trigger not yet verified"],
  ];
  let html = '<h2 class="view-heading">Missables &amp; watch list</h2>' +
    '<p class="view-intro">One trophy can be lost for a whole playthrough. Eight more are flagged WATCH — specific setups that are easy to fumble — ' +
    'and eight are UNCONFIRMED, where launch sources have not yet verified the trigger. Everything else can be cleaned up in free roam after the story.</p>';
  for (const [flag, label] of groups) {
    const items = DATA.trophies.filter((t) => t.flag === flag)
      .sort((a, b) => (a.stage - b.stage) || (a.id - b.id));
    html += '<h3 class="section-label">' + label + ' — ' + items.length + '</h3>';
    for (const t of items) {
      html += '<div class="watch-item' + (flag === "missable" ? " is-missable" : "") + '">' +
        '<h4><span class="linkish" data-select="' + t.id + '">' + esc(t.name) + '</span></h4> ' +
        '<span class="pill grade-' + t.grade + '">' + t.grade[0].toUpperCase() + t.grade.slice(1) + '</span>' +
        '<span class="pill">Stage ' + t.stage + '</span>' +
        '<p>' + esc(t.description) + ' — ' + cited(t.steps[0] || "") + '</p></div>';
    }
  }
  appEl.innerHTML = html;
}

/* ---------------- planner view ---------------- */

function renderPlanner() {
  const upcoming = nextUp(progress, DATA.trophies, 10);
  const summary = planSummary(progress, DATA.trophies);
  let html = '<h2 class="view-heading">Next up / Planner</h2>' +
    '<p class="view-intro">The earliest ungated trophies in roadmap order come first. Add any trophy to your plan from its detail panel ' +
    'or the table below — plan totals update as counters and earned marks change.</p>';
  html += '<div class="two-col"><div><h3 class="section-label">Next up — earliest ungated</h3>';
  for (const t of upcoming) {
    html += '<div class="watch-item"><h4><span class="linkish" data-select="' + t.id + '">' + esc(t.name) + '</span></h4> ' +
      '<span class="pill grade-' + t.grade + '">' + t.grade[0].toUpperCase() + t.grade.slice(1) + '</span>' +
      '<span class="pill">Stage ' + t.stage + '</span>' +
      '<p>≈' + Math.round(hoursRemaining(progress, t) * 10) / 10 + ' h left · steps ' +
      stepsTicked(progress, t) + '/' + t.steps.length + ' ticked</p></div>';
  }
  html += '</div><div><div class="rail-card"><h3>YOUR PLAN</h3>';
  if (!summary.chosen.length) {
    html += '<p class="empty-note">Nothing planned yet — add trophies from the ledger.</p>';
  } else {
    html += '<table class="plan-table"><tr><th>Trophy</th><th>Hours left</th><th></th></tr>';
    for (const t of summary.chosen) {
      html += '<tr><td>' + esc(t.name) + (isEarned(progress, t) ? ' ✓' : '') + '</td><td>' +
        Math.round(hoursRemaining(progress, t) * 10) / 10 + '</td>' +
        '<td><button class="chip-btn" data-plan="' + t.id + '">Remove</button></td></tr>';
    }
    html += '</table><p style="font-size:14px"><b>' + summary.open + ' open</b> · about <b>' +
      Math.round(summary.hours) + ' h</b> of planned play remaining.</p>';
  }
  html += '</div>';
  html += '<div class="rail-card"><h3>ADD TO PLAN</h3><ul style="list-style:none;padding-left:0">';
  for (const t of roadmapSequence(DATA.trophies)) {
    if (progress.plan.includes(t.id)) continue;
    html += '<li><button class="chip-btn" data-plan="' + t.id + '">+ ' + esc(t.name) + '</button></li>';
  }
  html += '</ul></div></div></div>';
  appEl.innerHTML = html;
}

/* ---------------- matrix view ---------------- */

function renderMatrix() {
  let html = '<h2 class="view-heading">Source matrix — claims per trophy × source</h2>' +
    '<p class="view-intro">Each cell is the number of claims — bracketed citations in that trophy\'s guide and steps — that rest on that source page. ' +
    'A blank cell means the page does not back that trophy. Every one of the 55 guides rests on at least two sources; ' +
    computeAudit(DATA).claims + ' claims are counted across the atlas.</p>';
  html += '<div class="matrix-wrap"><table class="matrix-table"><tr><th class="trophy-name">Trophy</th>';
  for (const s of DATA.sources) html += '<th>[' + s.n + ']</th>';
  html += '<th>Claims</th><th>Sources</th></tr>';
  for (const t of DATA.trophies) {
    const perSource = new Map();
    const texts = [t.guide, ...t.steps];
    for (const text of texts) {
      for (const m of String(text).matchAll(/\[(\d+)\]/g)) {
        const n = Number(m[1]);
        perSource.set(n, (perSource.get(n) || 0) + 1);
      }
    }
    html += '<tr><td class="trophy-name">' + esc(t.name) + '</td>';
    for (const s of DATA.sources) {
      const v = perSource.get(s.n);
      html += v ? '<td class="hit">' + v + '</td>' : '<td class="miss">·</td>';
    }
    html += '<td><b>' + trophyClaims(t) + '</b></td><td>' + t.sources.length + '</td></tr>';
  }
  html += '</table></div>';
  appEl.innerHTML = html;
}

/* ---------------- sources view ---------------- */

function renderSources() {
  const audit = computeAudit(DATA);
  let html = '<h2 class="view-heading">Sources &amp; disputes</h2>' +
    '<p class="view-intro">' + esc(DATA.auditNote) + '</p>' +
    '<p class="view-intro">' + esc(DATA.disagreementNote) + '</p>';
  html += '<h3 class="section-label">Numbered sources</h3>';
  for (const s of DATA.sources) {
    html += '<div class="source-entry"><span class="src-num">[' + s.n + ']</span> <a href="' + esc(s.url) +
      '" target="_blank" rel="noopener">' + esc(s.name) + '</a> — ' + esc(s.what) +
      ' · cited by ' + (audit.citedBy.get(s.n) || 0) + ' of 55</div>';
  }
  html += '<h3 class="section-label">Disputes — both positions, and our call</h3>';
  for (const d of DATA.disputes) {
    html += '<div class="dispute-box"><h4>' + esc(d.topic) + ' (' + esc(d.trophy) + ')</h4>' +
      '<div class="dispute-cols"><div><span class="side-label">VERSION A</span><p>' + cited(d.a) + '</p></div>' +
      '<div><span class="side-label">VERSION B</span><p>' + cited(d.b) + '</p></div></div>' +
      '<p class="dispute-call">' + cited(d.call) + '</p></div>';
  }
  appEl.innerHTML = html;
}

/* ---------------- wiring ---------------- */

function bindToolbar() {
  const query = document.getElementById("f-query");
  if (query) query.addEventListener("input", () => { ui.query = query.value; refreshListOnly(); });
  const grade = document.getElementById("f-grade");
  if (grade) grade.addEventListener("change", () => { ui.grade = grade.value; render(); });
  const stage = document.getElementById("f-stage");
  if (stage) stage.addEventListener("change", () => { ui.stage = stage.value; render(); });
  const earnedOnly = document.getElementById("f-earned");
  if (earnedOnly) earnedOnly.addEventListener("change", () => { ui.earnedOnly = earnedOnly.checked; render(); });
  const spoiler = document.getElementById("f-spoiler");
  if (spoiler) spoiler.addEventListener("change", () => { progress.spoilerSafe = spoiler.checked; persist(); render(); });
  document.querySelectorAll("[data-kind]").forEach((btn) =>
    btn.addEventListener("click", () => { ui.kind = btn.getAttribute("data-kind"); render(); }));
  const exp = document.getElementById("btn-export");
  if (exp) exp.addEventListener("click", () => exportProgress(progress));
  const imp = document.getElementById("btn-import");
  const fileInput = document.getElementById("import-file");
  if (imp && fileInput) imp.addEventListener("click", () => fileInput.click());
  const reset = document.getElementById("btn-reset");
  if (reset) reset.addEventListener("click", () => {
    progress = blankProgress();
    progress.spoilerSafe = true;
    persist(); render();
  });
}

// Search typing re-renders only the list column so the input keeps focus.
function refreshListOnly() {
  render();
  const query = document.getElementById("f-query");
  if (query) { query.focus(); query.setSelectionRange(query.value.length, query.value.length); }
}

function bindAppEvents() {
  appEl.addEventListener("click", (ev) => {
    const selectBtn = ev.target.closest("[data-select]");
    const earnedBox = ev.target.closest("[data-earned]");
    const countBtn = ev.target.closest("[data-count]");
    const planBtn = ev.target.closest("[data-plan]");
    const toggleEarned = ev.target.closest("[data-toggle-earned]");
    if (earnedBox) {
      ev.stopPropagation();
      const id = Number(earnedBox.getAttribute("data-earned"));
      if (earnedBox.checked) progress.earned[id] = true; else delete progress.earned[id];
      persist(); render();
      return;
    }
    if (countBtn) {
      const [idRaw, deltaRaw] = countBtn.getAttribute("data-count").split(":");
      const id = Number(idRaw);
      const trophy = DATA.trophies.find((t) => t.id === id);
      const next = (progress.counters[id] || 0) + Number(deltaRaw);
      progress.counters[id] = Math.max(0, Math.min(next, trophy.count));
      persist(); render();
      return;
    }
    if (planBtn) {
      const id = Number(planBtn.getAttribute("data-plan"));
      if (progress.plan.includes(id)) progress.plan = progress.plan.filter((x) => x !== id);
      else progress.plan.push(id);
      persist(); render();
      return;
    }
    if (toggleEarned) {
      const id = Number(toggleEarned.getAttribute("data-toggle-earned"));
      if (progress.earned[id]) delete progress.earned[id]; else progress.earned[id] = true;
      persist(); render();
      return;
    }
    if (selectBtn) {
      ui.selectedId = Number(selectBtn.getAttribute("data-select"));
      ui.view = "ledger";
      syncTabs();
      render();
      window.scrollTo({ top: 0 });
    }
  });
  appEl.addEventListener("change", (ev) => {
    const stepBox = ev.target.closest("[data-step]");
    if (stepBox) {
      const key = stepBox.getAttribute("data-step");
      if (stepBox.checked) progress.stepsDone[key] = true; else delete progress.stepsDone[key];
      persist(); render();
    }
  });
}

function syncTabs() {
  document.querySelectorAll("#view-tabs .tab").forEach((tab) => {
    tab.classList.toggle("is-active", tab.getAttribute("data-view") === ui.view);
  });
}

function render() {
  renderMasthead();
  renderAuditStrip();
  if (ui.view === "ledger") renderLedger();
  else if (ui.view === "roadmap") renderRoadmap();
  else if (ui.view === "missables") renderMissables();
  else if (ui.view === "planner") renderPlanner();
  else if (ui.view === "matrix") renderMatrix();
  else if (ui.view === "sources") renderSources();
}

async function boot() {
  const params = new URLSearchParams(location.search);
  const wanted = params.get("view");
  if (["ledger", "roadmap", "missables", "planner", "matrix", "sources"].includes(wanted)) ui.view = wanted;
  const response = await fetch("data/trophies.json");
  DATA = await response.json();
  document.querySelectorAll("#view-tabs .tab").forEach((tab) => {
    tab.addEventListener("click", () => { ui.view = tab.getAttribute("data-view"); syncTabs(); render(); });
  });
  const fileInput = document.getElementById("import-file");
  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;
    importProgress(file, (merged) => { progress = merged; persist(); render(); },
      () => alert("That file could not be read as a Leonida Atlas progress export."));
    fileInput.value = "";
  });
  bindAppEvents();
  syncTabs();
  render();
}

boot();
