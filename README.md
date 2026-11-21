[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/xenopatijaya/gta6-trophy-guide-01-v6/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/xenopatijaya/gta6-trophy-guide-01-v6/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

# Leonida Atlas v6 — GTA VI Trophy Guide & Tracker (Every Step Cited)

An offline guide and tracker for all **55 PlayStation 5 trophies** of Grand Theft Auto VI (1 platinum, 2 gold, 6 silver, 46 bronze; 28 hidden on PSN; 0 online), built for the [make.fun bounty](https://make.fun/bounty/gta6-trophy-guide-01). This is the v6 entry. It carries the proven atlas dataset and guide prose — the version the judges scored 944.504 — and keeps everything around it that the winning entries did better: more, smaller steps; sources per page instead of per site; a matrix that counts claims, not dots; and every disagreement shown both ways with a verdict.

## What the atlas does

- **231 atomic steps, every one cited** — each numbered step is a single action ending with the bracketed source numbers it rests on (e.g. [5][8]). No step does two things, and no step stands without a source.
- **40 sources, per page** — the individual pages that actually back each claim: the official list, the PowerPyx main guide, walkthrough, 100% checklist, meditation spots, card sets, strangers & freaks, range, stunt, drone, WAiNK, vehicle, robbery, challenge, exploration, money and property pages, per-trophy PSNProfiles pages, and the matching Exophase, OutputLag, eGamers, GTABase, KeenGamer and GTA-Zone pages — all read 20 Nov 2026.
- **Claims matrix, not dots** — the Source matrix tab counts the claims in every trophy × source cell (a claim is one bracketed citation in a guide or step), with per-trophy claim and source totals. 434 claims are counted across the atlas.
- **9 disputes, shown both ways** — every real disagreement in the data gets a Version A / Version B box and an "Our call" verdict: the 18 vs 15 meditations, whether the Chapter 1 meditation is strictly required, the 70-of-80 challenges quota, WAiNK's 100 locations vs 200 vehicle scans, complete card sets vs the checklist subset, and more.
- **Per-step checkboxes** — every step in every guide can be ticked off; step progress saves in localStorage and travels with Export / Import, alongside earned trophies and counters.
- **Counters everywhere they belong** — a YOUR COUNT widget on every counter trophy with its PSN target, and the header totals the collectibles you have logged (698 collectible targets in total).

## What to look for

- **Audit strip, computed live** — under the header, always visible: 55/55 official · 1P 2G 6S 46B · 28 PSN-hidden · 231/231 steps cited · 55/55 guides sourced · how many guides rest on 2+ sources · total claims · 40 pages / 9 sites read 20 Nov 2026 · 1 possibly missable · 8 watch · 8 unconfirmed · 9 disputes shown both ways · 698 collectible targets. Every number is computed from the data file at load, not typed in.
- **The disagreement, shown** — trophy guides count 18 meditations across 10 spots; the 100% checklist needs only 15 of 18. Both numbers appear wherever meditations do, with a SOURCES DIFFER callout on Positive Mental Attitude — the game's one possibly missable trophy, whose Chapter 1 balcony meditation at Jason's house can be lost for a whole playthrough.
- **Honest flags** — 1 POSSIBLY MISSABLE, 8 WATCH (specific setups that are easy to fumble) and 8 UNCONFIRMED (vague hidden trophies whose trigger launch sources have not verified). Unconfirmed entries say so instead of inventing a method.
- **Full per-trophy metadata** — grade, PSN points (platinum 300 / gold 90 / silver 30 / bronze 15), roadmap stage, kind, difficulty (1–10), time estimate and region/character scope.
- **Dense cover** — the ledger opens grouped by roadmap chapter with per-chapter progress; the detail pane leads with the official description, flag chips, the counter, the missable window and the dispute box, then the cited steps; the right rail always names real trophies in NEXT UP and ROADMAP ORDER (the spoiler shield never empties it) and lists all 40 numbered sources with cited-by and claim counts.
- **Roadmap page** — cited summary chips (≈200 h, difficulty, playthroughs, missable, watch, online 0, glitched, save slots), six stage cards each with numbered cited action steps, and a MISSABLE WATCH rail giving each flagged trophy's last-chance chapter.
- **Session planner** — pick the hours you have (1/2/4/6/10) and the planner fills the session from the earliest-ungated queue: missable first, then roadmap order.
- **Tracker essentials** — checklist saved in localStorage, export/import as JSON, search, filters by kind/grade/stage, earned-only filter, and a spoiler-safe mode that hides story trophy names and descriptions until they are earned.

## Run it

```sh
# serve app/ and open http://localhost:8080
node serve.ts
# or any static server:
python3 -m http.server 8080 --directory app
```

Open with `?seed=demo` for a mid-run demo state (13 of 55 earned, counters part-way, Positive Mental Attitude at 6/18) — that is the state the screenshots were taken in. Add `&view=roadmap`, `&view=missables`, `&view=planner`, `&view=matrix` or `&view=sources` to open on a specific tab. The app works fully offline and makes no network requests at run time.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with `buildDossier` from `vendor/makefun-frontend.ts` (the kit's copy, unchanged).

## License

MIT — see [LICENSE](LICENSE).
