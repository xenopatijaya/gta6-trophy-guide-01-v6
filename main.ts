// Leonida Atlas v6 — hand-in program for the make.fun bounty gta6-trophy-guide-01.
// Node 22, standard library only, no network access, deterministic output.
//
// The atlas is a static site living under app/ (index.html, style.css, the
// js/ modules and data/trophies.json). This program does exactly one job:
// the hand-in. It copies app/ and screenshots/ into the output directory
// and writes dossier.json there, built by buildDossier from
// vendor/makefun-frontend.ts. That vendored file is the kit's own copy and
// stays untouched, because the scorer rebuilds the dossier with its copy
// and requires byte-identical output. Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// MAKEFUN_OUTPUT_DIR stands in for the grader's /output.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoDir = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Copy one tree from this repository into the output directory. Only the
// app/ and screenshots/ subfolders inside the output are cleared first —
// never the output directory itself — so re-running into the same output
// overwrites with identical bytes and still exits 0 when the repository
// is read-only and the output directory belongs to another user.
function copyTree(from: string, to: string): void {
  try {
    rmSync(to, { recursive: true, force: true });
  } catch {
    // Clearing is best-effort: overwriting in place reaches the same bytes.
  }
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

mkdirSync(outDir, { recursive: true });
copyTree(join(repoDir, 'app'), join(outDir, 'app'));
const shotsFrom = join(repoDir, 'screenshots');
if (existsSync(shotsFrom)) copyTree(shotsFrom, join(outDir, 'screenshots'));

// The dossier limits mirror the competition gate: the text cap shapes the
// dossier bytes themselves, while the screenshot and app caps refuse
// anything the scorer would refuse anyway (more than 4 screenshots, one
// screenshot over 256 KiB, over 993 app entries, or 48 MiB of app files).
const limits = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
};
const dossier = buildDossier(outDir, limits);
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`Leonida Atlas v6 handed in: app/ + screenshots/ copied to ${outDir}, dossier.json written (${dossier.length} bytes).`);
