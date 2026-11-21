[![Rank](https://make.fun/badges/xenopatijaya/gta6-trophy-guide-01-v6/rank.svg)](https://make.fun/xenopatijaya/gta6-trophy-guide-01-v6)
[![Reward](https://make.fun/badges/xenopatijaya/gta6-trophy-guide-01-v6/reward.svg)](https://make.fun/xenopatijaya/gta6-trophy-guide-01-v6)
[![Competition](https://make.fun/badges/xenopatijaya/gta6-trophy-guide-01-v6/competition.svg)](https://make.fun/xenopatijaya/gta6-trophy-guide-01-v6)

# Leonida Atlas — GTA VI Trophy Guide & Tracker

A single-page trophy guide and progress tracker for Grand Theft Auto VI on
PlayStation 5. It covers the full official set of 55 trophies — 1 platinum,
2 gold, 6 silver and 46 bronze, 28 of them hidden — and treats citations as
a first-class feature: every one of the 231 guide steps names the source it
rests on, and an audit strip at the top of the page recomputes all of its
numbers from the dataset every time the page loads.

## What is inside

- **Ledger / Checklist** — the 55 trophies grouped by roadmap stage, with
  search and kind / grade / stage filters. Selecting a trophy opens its
  guide: prose, numbered steps with inline citation markers, per-step
  checkboxes, and — where launch sources disagree — a dispute box that
  shows both positions plus the call this atlas makes.
- **Counters** — trophies with a PSN counter (meditations, stunts, WAiNK
  locations, vehicles and more) get a YOUR COUNT widget with − / + controls.
- **Roadmap** — six stages with cited action steps, hour estimates that
  add up to roughly 200 hours, and cumulative progress.
- **Missables & watch** — the one possibly-missable trophy first, then the
  watch and unconfirmed entries ordered by last chance.
- **Source matrix** — a trophy × source grid; each cell counts the claims
  that source supports for that trophy (434 claims in total).
- **Planner** — the next ungated trophies in roadmap order, plus a personal
  plan whose remaining hours update as you play.
- **Persistence** — earned marks, ticked steps, counters and the plan live
  in localStorage and can be exported to and imported from a JSON file.
  Spoiler-safe mode hides hidden trophies' descriptions and guides while
  keeping their names visible in the roadmap rails.

## Running it

- Preview locally: `node serve.ts` and open http://localhost:4173/
- Assemble the deliverable: `node main.ts` (honours `MAKEFUN_OUTPUT_DIR`,
  default `/output`). The entrypoint copies `app/` and `screenshots/` into
  the output directory, writes a deterministic `dossier.json`, and then
  verifies the written tree before reporting success.

The dataset lives in `app/data/trophies.json`: 55 trophies, 40 source pages
across 9 sites, 6 roadmap stages and 9 recorded disputes.
