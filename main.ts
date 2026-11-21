// Leonida Atlas v6 — entrypoint.
// Running this file with Node assembles the deliverable: the app/ tree
// and the screenshots/ tree are copied into the output directory and a
// deterministic dossier.json describing the entry is written alongside
// them. The output directory itself is never deleted; only the app/ and
// screenshots/ subdirectories and dossier.json inside it are replaced.

import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";

interface DossierEntry {
  slug: string;
  title: string;
  game: string;
  platform: string;
  trophies: number;
  sources: number;
  files: string[];
  totalBytes: number;
}

// Post-write verification: re-read the dossier from disk and check that
// every file it lists is actually present in the output tree, and that
// the dataset copy is byte-identical to the source dataset. A mismatch
// fails the run instead of shipping a quietly broken bundle.
async function verifyOutput(dossierPath: string, sourceDataPath: string): Promise<void> {
  const parsed = JSON.parse(await readFile(dossierPath, "utf8")) as DossierEntry;
  for (const rel of parsed.files) {
    const info = await stat(join(outputDir, rel));
    if (!info.isFile()) throw new Error("dossier lists a non-file: " + rel);
  }
  const copied = await readFile(join(outputDir, "app", "data", "trophies.json"));
  const original = await readFile(sourceDataPath);
  if (!copied.equals(original)) throw new Error("copied trophies.json differs from the source dataset");
}

async function listFiles(dir: string, base: string): Promise<string[]> {
  const names = (await readdir(dir)).sort();
  const out: string[] = [];
  for (const name of names) {
    const full = join(dir, name);
    const info = await stat(full);
    if (info.isDirectory()) out.push(...(await listFiles(full, base)));
    else out.push(relative(base, full).split("\\").join("/"));
  }
  return out;
}

async function replaceTree(sourceDir: string, targetDir: string): Promise<void> {
  await rm(targetDir, { recursive: true, force: true });
  await mkdir(targetDir, { recursive: true });
  await cp(sourceDir, targetDir, { recursive: true });
}

async function main(): Promise<void> {
  const raw = await readFile(join(here, "app", "data", "trophies.json"), "utf8");
  const data = JSON.parse(raw) as {
    game: string;
    platform: string;
    trophies: unknown[];
    sources: unknown[];
  };

  await mkdir(outputDir, { recursive: true });
  await replaceTree(join(here, "app"), join(outputDir, "app"));
  await replaceTree(join(here, "screenshots"), join(outputDir, "screenshots"));

  const files = [
    ...(await listFiles(join(outputDir, "app"), outputDir)),
    ...(await listFiles(join(outputDir, "screenshots"), outputDir)),
  ].sort();

  let totalBytes = 0;
  for (const rel of files) totalBytes += (await stat(join(outputDir, rel))).size;

  const dossier: DossierEntry = {
    slug: "gta6-trophy-guide-01-v6",
    title: "Leonida Atlas — GTA VI Trophy Guide & Tracker",
    game: data.game,
    platform: data.platform,
    trophies: data.trophies.length,
    sources: data.sources.length,
    files,
    totalBytes,
  };
  const dossierPath = join(outputDir, "dossier.json");
  await writeFile(dossierPath, JSON.stringify(dossier, null, 2) + "\n", "utf8");
  await verifyOutput(dossierPath, join(here, "app", "data", "trophies.json"));
  console.log("Leonida Atlas assembled and verified in " + outputDir + " (" + files.length + " files, " + totalBytes + " bytes)");
}

await main();
