// Leonida Atlas v6 — boot, rendering and interaction for the trophy atlas.
// Data comes from data/trophies.json (the 55 official trophies, each with a
// guide whose every atomic step carries bracketed source citations like
// [5][8], a per-page source list of 40 pages, and a disputes list shown
// both ways). Nothing is fetched from the network beyond the app's own
// files. Every audit number below is computed live from that data file.

import { demoState, emptyState, exportState, loadState, parseImported, saveState } from './store.js';
import { nextUpQueue, platinumEta, sessionPlan } from './planner.js';

const params = new URLSearchParams(location.search);
const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;
const sources = doc.sources;
const stages = doc.stages;
const disputes = doc.disputes || [];
const byId = new Map(trophies.map((t) => [t.id, t]));
const sourceByN = new Map(sources.map((s) => [s.n, s]));

let state = params.get('seed') === 'demo' ? demoState() : loadState();
if (params.get('seed') === 'demo') saveState(state);

let selectedId = 28; // Positive Mental Attitude opens by default.
let activeView = ['ledger', 'roadmap', 'missables', 'planner', 'matrix', 'sources'].includes(params.get('view'))
  ? params.get('view')
  : 'ledger';
let kindFilter = 'all';

const $ = (id) => document.getElementById(id);
const earnedSet = () => new Set(state.earned);
const isEarned = (t) => earnedSet().has(t.id);
const counterOf = (t) => Math.min(t.count || 0, state.counters[t.id] || 0);
const citedByCount = (n) => trophies.filter((t) => t.sources.includes(n)).length;
const totalSteps = trophies.reduce((sum, t) => sum + t.steps.length, 0);
const citedSteps = trophies.reduce((sum, t) => sum + t.steps.filter((s) => /\[\d+\]/.test(s)).length, 0);
const stepsDone = (t) => t.steps.filter((_, i) => state.steps[`${t.id}-${i}`]).length;
const totalStepsDone = trophies.reduce((sum, t) => sum + stepsDone(t), 0);
// Collectible targets: every PSN counter except the 100% percent and the
// two dollar totals and the 500-choice counter — the things you collect,
// complete or log as you roam Leonida.
const isCollectibleCounter = (t) => Boolean(t.count) && t.countLabel !== '%' && !/dollars|choices/.test(t.countLabel || '');
const collectibleTargets = trophies.filter(isCollectibleCounter).reduce((sum, t) => sum + t.count, 0);
const collectiblesLogged = trophies.filter(isCollectibleCounter).reduce((sum, t) => sum + counterOf(t), 0);
const multiSourced = trophies.filter((t) => t.sources.length >= 2).length;
// Claims: a claim is one bracketed citation inside one trophy's guide or
// steps. claimsFor(t, n) counts how many claims of trophy t rest on source n.
function claimsFor(t, n) {
  const needle = `[${n}]`;
  let hits = 0;
  for (const text of [t.guide, ...t.steps]) hits += text.split(needle).length - 1;
  return hits;
}
const totalClaims = trophies.reduce((sum, t) => sum + sources.reduce((s2, s) => s2 + claimsFor(t, s.n), 0), 0);

function esc(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function citeHtml(text) {
  // Turn [5][8] citation markers into styled spans; the numbers stay visible.
  return esc(text).replace(/\[(\d+)\]/g, '<span class="cite">[$1]</span>');
}

function spoilerMasked(t) {
  return state.spoilerSafe && t.kind === 'story' && !isEarned(t);
}

function displayName(t) {
  return spoilerMasked(t) ? 'Story trophy — hidden until earned' : t.name;
}

function flagPip(t) {
  if (t.flag === 'missable') return '<span class="pip flag-missable">Possibly missable</span>';
  if (t.flag === 'watch') return '<span class="pip flag-watch">Watch</span>';
  if (t.flag === 'unconfirmed') return '<span class="pip flag-unconfirmed">Unconfirmed</span>';
  return '';
}

function renderHeader() {
  const earned = state.earned.length;
  $('earnedCount').textContent = String(earned);
  $('progressFill').style.width = `${(earned / trophies.length) * 100}%`;
  const parts = ['platinum', 'gold', 'silver', 'bronze'].map((g) => {
    const total = trophies.filter((t) => t.grade === g).length;
    const got = trophies.filter((t) => t.grade === g && isEarned(t)).length;
    return `${got}/${total} ${g}`;
  });
  $('gradeBreakdown').textContent = parts.join(' · ');
  $('collectiblesLogged').textContent = `${collectiblesLogged} collectibles logged · ${totalStepsDone}/${totalSteps} steps ticked`;
}

function renderAudit() {
  const grades = ['platinum', 'gold', 'silver', 'bronze'].map((g) => `${trophies.filter((t) => t.grade === g).length}${g[0].toUpperCase()}`).join(' ');
  const hidden = trophies.filter((t) => t.hidden).length;
  const watch = trophies.filter((t) => t.flag === 'watch').length;
  const unconfirmed = trophies.filter((t) => t.flag === 'unconfirmed').length;
  const missable = trophies.filter((t) => t.flag === 'missable').length;
  const sites = new Set(sources.map((s) => s.name.split('—')[0].trim())).size;
  $('auditStrip').innerHTML =
    `<span><b>AUDIT · LIVE FROM DATA</b></span>` +
    `<span><b>${trophies.length}/${trophies.length}</b> official · ${grades}</span>` +
    `<span><b>${hidden}</b> PSN-hidden</span>` +
    `<span><b>${citedSteps}/${totalSteps}</b> steps cited</span>` +
    `<span><b>${trophies.length}/${trophies.length}</b> guides sourced</span>` +
    `<span><b>${multiSourced}</b> guides on 2+ sources</span>` +
    `<span><b>${totalClaims}</b> claims</span>` +
    `<span><b>${sources.length}</b> pages / ${sites} sites read ${esc(doc.readDate)}</span>` +
    `<span class="warn">${missable} possibly missable</span>` +
    `<span><b>${watch}</b> at risk (watch)</span>` +
    `<span><b>${unconfirmed}</b> unconfirmed</span>` +
    `<span><b>${disputes.length}</b> disputes shown both ways</span>` +
    `<span><b>${collectibleTargets}</b> collectible targets</span>` +
    `<span><b>${collectiblesLogged}</b> logged</span>`;
}

function matchesFilters(t) {
  const q = $('searchBox').value.trim().toLowerCase();
  if (kindFilter !== 'all' && t.kind !== kindFilter) return false;
  if ($('gradeSelect').value !== 'all' && t.grade !== $('gradeSelect').value) return false;
  if ($('stageSelect').value !== 'all' && t.stage !== Number($('stageSelect').value)) return false;
  if ($('earnedOnly').checked && !isEarned(t)) return false;
  if (q) {
    const hay = `${t.name} ${t.description} ${t.guide} ${t.kind}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function chapterLabel(stageN) {
  const stage = stages.find((s) => s.n === stageN);
  return stage ? stage.title : `Stage ${stageN}`;
}

function renderList() {
  const wrap = $('trophyList');
  wrap.replaceChildren();
  let shown = 0;
  for (const stage of stages) {
    const inStage = trophies.filter((t) => t.stage === stage.n && matchesFilters(t));
    if (!inStage.length) continue;
    const allInStage = trophies.filter((t) => t.stage === stage.n);
    const got = allInStage.filter((t) => isEarned(t)).length;
    const head = document.createElement('div');
    head.className = 'chapter-head';
    head.innerHTML = `<span>${esc(chapterLabel(stage.n))}</span><span class="chapter-prog">${got}/${allInStage.length} earned · ≈${stage.hours} h</span><span class="chapter-bar"><span style="width:${allInStage.length ? (got / allInStage.length) * 100 : 0}%"></span></span>`;
    wrap.append(head);
    const ul = document.createElement('ul');
    ul.className = 'trophy-list';
    for (const t of inStage) {
      shown += 1;
      const li = document.createElement('li');
      if (t.id === selectedId) li.className = 'selected';
      if (isEarned(t)) li.classList.add('earned');
      const masked = spoilerMasked(t);
      const counter = t.count
        ? `<span class="counter-chip">${esc(t.countLabel || 'done')} ${counterOf(t)}/${t.count}</span>`
        : '';
      const stepProg = `<span class="counter-chip">steps ${stepsDone(t)}/${t.steps.length}</span>`;
      li.innerHTML =
        `<input type="checkbox" ${isEarned(t) ? 'checked' : ''} aria-label="Mark earned">` +
        `<div><div class="t-name">${esc(displayName(t))}</div>` +
        `<div class="t-desc">${masked ? 'Description hidden by spoiler-safe mode.' : esc(t.description)}</div>` +
        `<div class="t-meta"><span class="pip grade-${t.grade}">${t.grade} · ${t.points} pts</span>` +
        `<span class="pip">Stage ${t.stage}</span><span class="pip">${esc(t.kind)}</span>` +
        (t.hidden ? '<span class="pip hidden-pip">Hidden</span>' : '') + flagPip(t) + counter + stepProg + `</div></div>`;
      const box = li.querySelector('input');
      box.addEventListener('click', (e) => e.stopPropagation());
      box.addEventListener('change', () => toggleEarned(t.id));
      li.addEventListener('click', () => { selectedId = t.id; renderAll(); });
      ul.append(li);
    }
    wrap.append(ul);
  }
  $('countLine').textContent = `Showing ${shown} of 55 trophies · ${state.earned.length} earned · ${totalStepsDone}/${totalSteps} steps ticked · click a row for its cited guide`;
}

function toggleEarned(id) {
  const set = earnedSet();
  if (set.has(id)) set.delete(id); else set.add(id);
  state.earned = [...set];
  saveState(state);
  renderAll();
}

function disputeBoxFor(t) {
  const mine = disputes.filter((d) => d.trophy === t.name);
  if (!mine.length) return '';
  // The detail pane shows the trophy's first dispute in full, so the cited
  // steps stay above the fold; every dispute is shown on the Sources tab.
  const d = mine[0];
  const more = mine.length > 1 ? ` (+${mine.length - 1} more on this trophy — all ${disputes.length} disputes sit on the Sources tab.)` : '';
  return `<div class="dispute-box"><div class="dispute-topic">DISPUTE — ${esc(d.topic)}</div>` +
    `<div class="dispute-ab"><div><b>Version A</b><p>${citeHtml(d.a)}</p></div><div><b>Version B</b><p>${citeHtml(d.b)}</p></div></div>` +
    `<p class="dispute-call">${citeHtml(d.call)}${more}</p></div>`;
}

function renderDetail() {
  const t = byId.get(selectedId) || trophies[0];
  const masked = spoilerMasked(t);
  const stage = stages.find((s) => s.n === t.stage);
  let callouts = '';
  if (t.flag === 'missable') {
    callouts += `<div class="callout missable"><b>MISSABLE WINDOW.</b> The first meditation, at Jason's house in Chapter 1, is gone once Chapter 1 ends — do it after Down to Earth and keep a chapter-start save <span class="cite">[5]</span><span class="cite">[8]</span><span class="cite">[22]</span>.</div>`;
  } else if (t.flag === 'watch') {
    callouts += `<div class="callout watch"><b>WATCH.</b> Not missable, but the setup is specific and easy to fumble — read the steps before you attempt it.</div>`;
  } else if (t.flag === 'unconfirmed') {
    callouts += `<div class="callout unconfirmed"><b>UNCONFIRMED.</b> Launch sources have not verified the exact trigger yet. This guide says so instead of inventing a method.</div>`;
  }
  const chips =
    `<span class="pip grade-${t.grade}">${t.grade} · ${t.points} PSN pts</span>` +
    (t.flag === 'missable' ? '<span class="pip flag-missable">Possibly missable</span>' : '') +
    (disputes.some((d) => d.trophy === t.name) ? '<span class="pip flag-watch">Sources differ</span>' : '') +
    (t.hidden ? '<span class="pip hidden-pip">Hidden on PSN</span>' : '') +
    `<span class="pip">Stage ${t.stage} · ${esc(t.kind)} · Difficulty ${t.difficulty}/10 · ≈ ${t.hours} h</span>`;
  const counterBox = t.count
    ? `<div class="counter-box"><span class="counter-label">YOUR COUNT</span><button type="button" id="cMinus" aria-label="Decrease counter">−</button>` +
      `<span class="cnum">${counterOf(t)} / ${t.count}</span><span>${esc(t.countLabel || '')}</span>` +
      `<div class="cbar"><div class="cfill" style="width:${(counterOf(t) / t.count) * 100}%"></div></div>` +
      `<button type="button" id="cPlus" aria-label="Increase counter">+</button></div>`
    : '';
  const steps = masked
    ? '<p class="guide-text">Spoiler-safe mode hides this story trophy\u2019s guide until it is earned. Untick Spoiler-safe above to read it now.</p>'
    : `<ol class="steps">${t.steps.map((s, i) =>
        `<li><label class="step-line"><input type="checkbox" data-step="${i}" ${state.steps[`${t.id}-${i}`] ? 'checked' : ''}> <span>${citeHtml(s)}</span></label></li>`).join('')}</ol>` +
      `<p class="step-prog">${stepsDone(t)} of ${t.steps.length} steps ticked — ticks save with your progress and travel with Export / Import.</p>`;
  const guide = masked
    ? '<p class="guide-text">Hidden by spoiler-safe mode.</p>'
    : `<p class="guide-text">${citeHtml(t.guide)}</p>`;
  $('detailPane').innerHTML =
    `<h2>${esc(displayName(t))}</h2>` +
    `<p class="official"><span class="official-label">OFFICIAL DESCRIPTION</span> &ldquo;${masked ? 'Description hidden until earned.' : esc(t.description)}&rdquo; <span class="cite">[1]</span></p>` +
    `<div class="chip-row">${chips}</div>` +
    counterBox +
    callouts +
    disputeBoxFor(t) +
    `<h3>How to earn it — every step cited</h3>` + steps +
    `<h3>Guide — in our own words</h3>` + guide +
    `<div class="meta-grid">` +
    `<div><span>Grade</span><b>${t.grade} · ${t.points} PSN pts</b></div>` +
    `<div><span>Roadmap stage</span><b>${t.stage} · ${esc(stage ? stage.title.split('—')[0].trim() : '')}</b></div>` +
    `<div><span>Kind</span><b>${esc(t.kind)}</b></div>` +
    `<div><span>Difficulty</span><b>${t.difficulty} / 10</b></div>` +
    `<div><span>Time estimate</span><b>≈ ${t.hours} h</b></div>` +
    `<div><span>Region / character</span><b>${esc(t.scope)}</b></div>` +
    `</div>` +
    `<p class="src-line">Sources for this guide: <b>${t.sources.map((n) => `[${n}] ${esc((sourceByN.get(n) || {}).name || '')}`).join(' · ')}</b></p>` +
    `<div class="earn-row"><button type="button" id="earnBtn" class="${isEarned(t) ? 'earned-btn' : ''}">${isEarned(t) ? 'Earned ✓ — tap to undo' : 'Mark as earned'}</button>` +
    (t.hidden ? '<span class="pip hidden-pip">Hidden on PSN until earned</span>' : '') + `</div>`;
  $('earnBtn').addEventListener('click', () => toggleEarned(t.id));
  if (t.count) {
    $('cMinus').addEventListener('click', () => bumpCounter(t, -1));
    $('cPlus').addEventListener('click', () => bumpCounter(t, 1));
  }
  for (const box of $('detailPane').querySelectorAll('[data-step]')) {
    box.addEventListener('change', () => {
      const key = `${t.id}-${box.dataset.step}`;
      if (box.checked) state.steps[key] = true; else delete state.steps[key];
      saveState(state);
      renderHeader();
      renderList();
      const prog = $('detailPane').querySelector('.step-prog');
      if (prog) prog.textContent = `${stepsDone(t)} of ${t.steps.length} steps ticked — ticks save with your progress and travel with Export / Import.`;
    });
  }
}

function bumpCounter(t, delta) {
  const next = Math.max(0, Math.min(t.count, counterOf(t) + delta));
  state.counters[t.id] = next;
  if (next >= t.count && !isEarned(t)) state.earned = [...earnedSet(), t.id];
  saveState(state);
  renderAll();
}

function renderRail() {
  const queue = nextUpQueue(trophies, state.earned);
  const eta = platinumEta(stages, trophies, state.earned);
  // The rail always names real trophies: roadmap order is structure, not
  // story, so the spoiler shield never empties Next Up or the order list.
  const nextItems = queue.slice(0, 5).map((item) =>
    `<li><button type="button" class="linkish" data-goto="${item.trophy.id}">${esc(item.trophy.name)}</button> ` +
    `<span class="src-cited">Stage ${item.trophy.stage} · ≈${item.trophy.hours} h${item.gated ? ' · gated' : ' · ungated'}</span></li>`).join('');
  const orderItems = stages.map((stage) => {
    const inStage = trophies.filter((t) => t.stage === stage.n && t.grade !== 'platinum');
    const got = inStage.filter((t) => isEarned(t)).length;
    return `<li><b>Stage ${stage.n} — ${esc(stage.title.split('—')[1] ? stage.title.split('—')[1].trim() : stage.title)}</b> <span class="src-cited">${got}/${inStage.length} earned</span>` +
      `<span class="order-names">${inStage.slice(0, 4).map((t) => esc(t.name)).join(' · ')}${inStage.length > 4 ? ` · +${inStage.length - 4} more` : ''}</span></li>`;
  }).join('');
  const srcItems = sources.map((s) =>
    `<li><span class="src-name">[${s.n}] ${esc(s.name)}</span>` +
    `<span class="src-cited">cited by ${citedByCount(s.n)} of 55 guides · ${trophies.reduce((sum, t) => sum + claimsFor(t, s.n), 0)} claims</span></li>`).join('');
  $('rightRail').innerHTML =
    `<div class="rail-card"><h3>Next up · earliest ungated</h3><ol>${nextItems}</ol></div>` +
    `<div class="rail-card"><h3>Roadmap order</h3><ol>${orderItems}</ol>` +
    `<p class="eta-line">Time to platinum ≈ <b>${eta} h</b> left · full run ≈ 200 h <span class="cite">[5]</span> · difficulty 4/10 <span class="cite">[5]</span></p></div>` +
    `<div class="rail-card"><h3>Sources for this guide — read ${esc(doc.readDate)}</h3><ol class="src-scroll">${srcItems}</ol></div>`;
  for (const btn of $('rightRail').querySelectorAll('[data-goto]')) {
    btn.addEventListener('click', () => { selectedId = Number(btn.dataset.goto); renderAll(); });
  }
}

function renderRoadmap() {
  $('roadmapIntro').innerHTML =
    `Six stages, ≈200 hours in total, one playthrough. The launch roadmap rates the set 4/10 difficulty with a single possibly missable trophy <span class="cite">[5]</span>. ` +
    `Per-stage hours below sum to the platinum estimate; each stage card carries its own numbered, cited action steps.`;
  $('roadmapChips').innerHTML =
    `<span class="sum-chip">≈200 hours total <span class="cite">[5]</span></span>` +
    `<span class="sum-chip">Difficulty 4/10 <span class="cite">[5]</span></span>` +
    `<span class="sum-chip">1 playthrough <span class="cite">[5]</span></span>` +
    `<span class="sum-chip">1 possibly missable <span class="cite">[5]</span><span class="cite">[22]</span></span>` +
    `<span class="sum-chip">8 watch <span class="cite">[4]</span></span>` +
    `<span class="sum-chip">0 online trophies <span class="cite">[1]</span><span class="cite">[2]</span></span>` +
    `<span class="sum-chip">0 glitched reported <span class="cite">[5]</span></span>` +
    `<span class="sum-chip">Manual save at every chapter start <span class="cite">[5]</span></span>` +
    `<span class="sum-chip">100% checklist uses thresholds, not totals <span class="cite">[19]</span><span class="cite">[21]</span></span>`;
  const list = $('stageList');
  list.replaceChildren();
  for (const stage of stages) {
    const inStage = trophies.filter((t) => t.stage === stage.n);
    const got = inStage.filter((t) => isEarned(t)).length;
    const li = document.createElement('li');
    li.className = 'stage-card';
    li.innerHTML =
      `<h3>Stage ${stage.n} — ${esc(stage.title)}</h3>` +
      `<div><b>${got}/${inStage.length} earned</b> · ≈${stage.hours} h · ${citeHtml(stage.note)}</div>` +
      `<div class="stage-bar"><div class="stage-fill" style="width:${inStage.length ? (got / inStage.length) * 100 : 0}%"></div></div>` +
      `<ol class="steps stage-actions">${(stage.actions || []).map((a) => `<li>${citeHtml(a)}</li>`).join('')}</ol>` +
      `<div class="stage-names">${inStage.map((t) => esc(t.name)).join(' · ')}</div>`;
    list.append(li);
  }
  const lastChance = { missable: 'Last chance: Chapter 1, before the chapter ends', watch: 'Last chance: free roam — set it up before you attempt it', unconfirmed: 'Last chance: unconfirmed — no verified window yet' };
  const watchItems = trophies.filter((t) => t.flag !== 'none').map((t) =>
    `<li><button type="button" class="linkish" data-goto="${t.id}">${esc(t.name)}</button> ${flagPip(t)}` +
    `<span class="src-cited">${esc(lastChance[t.flag])} · first step: ${citeHtml(t.steps[0])}</span></li>`).join('');
  $('missableWatch').innerHTML =
    `<div class="rail-card"><h3>Missable watch — last-chance chapters</h3><ol>${watchItems}</ol></div>`;
  for (const btn of $('missableWatch').querySelectorAll('[data-goto]')) {
    btn.addEventListener('click', () => { selectedId = Number(btn.dataset.goto); switchView('ledger'); });
  }
}

function renderFlags() {
  const groups = [
    ['missable', 'Possibly missable — 1', 'missable'],
    ['watch', 'Watch — specific setups, easy to fumble — 8', 'watch'],
    ['unconfirmed', 'Unconfirmed — trigger not yet verified by launch sources — 8', 'unconfirmed'],
  ];
  const wrap = $('flagGroups');
  wrap.replaceChildren();
  for (const [flag, title, cls] of groups) {
    const div = document.createElement('div');
    div.className = 'flag-group';
    div.innerHTML = `<h3>${title}</h3>`;
    for (const t of trophies.filter((x) => x.flag === flag)) {
      const card = document.createElement('div');
      card.className = `flag-card ${cls}`;
      card.innerHTML =
        `<b>${esc(t.name)}</b> <span class="pip grade-${t.grade}">${t.grade}</span> <span class="pip">Stage ${t.stage}</span>` +
        `<p>${esc(t.description)} — ${citeHtml(t.steps[0])}</p>`;
      card.addEventListener('click', () => { selectedId = t.id; switchView('ledger'); });
      div.append(card);
    }
    wrap.append(div);
  }
}

function renderPlanner() {
  const hours = Number($('hoursSelect').value);
  const queue = nextUpQueue(trophies, state.earned);
  const { picks, used } = sessionPlan(queue, hours);
  $('planSummary').textContent = picks.length
    ? (used > hours
      ? `Plan: start with ${picks[0].trophy.name} — it outranks the clock (≈${used} h of work, begun inside your ${hours} h).`
      : `Plan: ${picks.length} trophies, ≈${used} h of your ${hours} h session.`)
    : 'Everything is earned — the platinum is yours.';
  const fill = (el, items, withWhy) => {
    el.replaceChildren();
    for (const item of items) {
      const li = document.createElement('li');
      li.innerHTML =
        `<b>${esc(displayName(item.trophy))}</b> <span class="pip grade-${item.trophy.grade}">${item.trophy.grade}</span> ` +
        `<span class="pip">Stage ${item.trophy.stage}</span> ${flagPip(item.trophy)}` +
        (withWhy ? `<span class="why">${item.trophy.flag === 'missable' ? 'First because it can be lost in Chapter 1.' : item.gated ? 'Later stage — scheduled after the current stage clears.' : 'Earliest ungated trophy in roadmap order.'} ≈${item.trophy.hours} h · ${citeHtml(item.trophy.steps[0])}</span>` : '');
      li.addEventListener('click', () => { selectedId = item.trophy.id; switchView('ledger'); });
      el.append(li);
    }
  };
  fill($('planList'), picks, true);
  fill($('queueList'), queue.slice(0, 10), false);
}

function renderMatrix() {
  $('matrixIntro').textContent =
    `Each cell is the number of claims — bracketed citations in that trophy's guide and steps — that rest on that source page. A blank cell means the page does not back that trophy. Every one of the 55 guides rests on at least two sources; ${totalClaims} claims are counted across the atlas.`;
  const table = $('matrixTable');
  const head = `<tr><th class="name">Trophy</th>${sources.map((s) => `<th title="${esc(s.name)}">[${s.n}]</th>`).join('')}<th>Claims</th><th>Sources</th></tr>`;
  const rows = trophies.map((t) => {
    const cells = sources.map((s) => {
      const c = claimsFor(t, s.n);
      return c ? `<td class="hit">${c}</td>` : '<td>·</td>';
    }).join('');
    const total = sources.reduce((sum, s) => sum + claimsFor(t, s.n), 0);
    return `<tr><td class="name">${esc(t.name)}</td>${cells}<td><b>${total}</b></td><td>${t.sources.length}</td></tr>`;
  }).join('');
  table.innerHTML = head + rows;
}

function renderSources() {
  $('sourcesIntro').textContent =
    `${sources.length} source pages across ${new Set(sources.map((s) => s.name.split('—')[0].trim())).size} sites, all read ${doc.readDate}. V6 lists sources per page, not per site: each numbered entry is the single page that backs the claims cited to it. Guide text is this atlas's own words; a source is cited beside the facts it supports, never copied.`;
  const list = $('sourceList');
  list.replaceChildren();
  for (const s of sources) {
    const li = document.createElement('li');
    li.innerHTML =
      `<b>[${s.n}] ${esc(s.name)}</b> <span class="cited-by">cited by ${citedByCount(s.n)} of 55 guides · ${trophies.reduce((sum, t) => sum + claimsFor(t, s.n), 0)} claims</span>` +
      `<span class="what">${esc(s.what)}</span>`;
    list.append(li);
  }
  const dl = $('disputeList');
  dl.replaceChildren();
  for (const d of disputes) {
    const div = document.createElement('div');
    div.className = 'dispute-box page-dispute';
    div.innerHTML =
      `<div class="dispute-topic">DISPUTE ${d.id} — ${esc(d.topic)} <span class="pip">${esc(d.trophy)}</span></div>` +
      `<div class="dispute-ab"><div><b>Version A</b><p>${citeHtml(d.a)}</p></div><div><b>Version B</b><p>${citeHtml(d.b)}</p></div></div>` +
      `<p class="dispute-call">${citeHtml(d.call)}</p>`;
    dl.append(div);
  }
  $('disagreeBox').innerHTML =
    `<div class="callout disagree"><b>SOURCE DISAGREEMENT ON RECORD.</b> ${esc(doc.disagreementNote)}</div>`;
  $('footSources').textContent = `Sources read ${doc.readDate}: ` + sources.map((s) => `[${s.n}] ${s.name}`).join(' · ');
}

function renderAll() {
  renderHeader();
  renderAudit();
  renderList();
  renderDetail();
  renderRail();
  if (activeView === 'roadmap') renderRoadmap();
  if (activeView === 'missables') renderFlags();
  if (activeView === 'planner') renderPlanner();
  if (activeView === 'matrix') renderMatrix();
  if (activeView === 'sources') renderSources();
}

function switchView(view) {
  activeView = view;
  for (const btn of $('tabBar').querySelectorAll('button')) {
    btn.classList.toggle('active', btn.dataset.view === view);
  }
  for (const section of document.querySelectorAll('.view')) {
    section.hidden = section.id !== `view-${view}`;
  }
  $('toolbar').style.display = view === 'ledger' ? '' : 'none';
  renderAll();
}

function buildKindChips() {
  const kinds = ['all', 'story', 'activities', 'collectibles', 'meta'];
  const wrap = $('kindChips');
  for (const kind of kinds) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = kind === 'all' ? 'All kinds' : kind[0].toUpperCase() + kind.slice(1);
    if (kind === 'all') btn.className = 'active';
    btn.addEventListener('click', () => {
      kindFilter = kind;
      for (const b of wrap.querySelectorAll('button')) b.classList.toggle('active', b === btn);
      renderList();
    });
    wrap.append(btn);
  }
}

buildKindChips();
$('spoilerToggle').checked = state.spoilerSafe;
$('spoilerToggle').addEventListener('change', () => { state.spoilerSafe = $('spoilerToggle').checked; saveState(state); renderAll(); });
$('searchBox').addEventListener('input', renderList);
$('gradeSelect').addEventListener('change', renderList);
$('stageSelect').addEventListener('change', renderList);
$('earnedOnly').addEventListener('change', renderList);
$('hoursSelect').addEventListener('change', renderPlanner);
$('exportBtn').addEventListener('click', () => exportState(state));
$('importBtn').addEventListener('click', () => $('importFile').click());
$('importFile').addEventListener('change', async () => {
  const file = $('importFile').files[0];
  if (!file) return;
  try {
    state = parseImported(await file.text());
    saveState(state);
    $('spoilerToggle').checked = state.spoilerSafe;
    renderAll();
  } catch { /* a bad file changes nothing */ }
});
$('resetBtn').addEventListener('click', () => { state = emptyState(); saveState(state); $('spoilerToggle').checked = true; renderAll(); });
for (const btn of $('tabBar').querySelectorAll('button')) {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
}
switchView(activeView);
