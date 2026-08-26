/**
 * Converts raw photos in assets/photos-source/ into web-sized JPEGs in
 * public/photos/, and writes data/photos.json (src/width/height/year/caption)
 * for lib/data/photos.ts to read — the same generated-JSON pattern
 * scripts/snapshot.ts uses for Sleeper data.
 *
 * Run with `npm run photos` whenever a photo is added to/removed from
 * assets/photos-source/ (update SOURCE_PHOTOS below to match).
 */
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import sharp from "sharp";

const execFileAsync = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_DIR = join(ROOT, "assets/photos-source");
const OUT_DIR = join(ROOT, "public/photos");
const MANIFEST_PATH = join(ROOT, "data/photos.json");
const MAX_DIMENSION = 1920;

/**
 * Capture years, hand-verified per photo rather than trusted from the
 * filesystem: these files' mtimes reflect when they were downloaded/exported
 * to this machine, not when they were taken — two of them disagreed with
 * their own filename-encoded capture time by weeks, which is what gave that
 * away. Sourced from real EXIF DateTimeOriginal where present (checked via
 * `sips -g all` / exifr), or the camera app's own IMG_YYYYMMDD_HHMMSS
 * filename convention where EXIF had been stripped by a messaging app.
 * Two files had neither and are left undated (`year: null`) rather than
 * guessed from an unreliable timestamp.
 */
const SOURCE_PHOTOS = [
  { file: "IMG_9945.HEIC", year: 2025 },
  { file: "IMG_3420_Original.jpg", year: 2019 },
  { file: "4168f107-6b34-486f-821f-fa510400cc1e.JPG", year: 2024 },
  { file: "IMG20250830144834.jpg", year: 2025 },
  { file: "IMG_20191102_192433.jpg", year: 2019 },
  { file: "a08ba908-d627-47ae-be9b-2e15fc255e42.JPG", year: null },
  // A still frame from a vertical video, with solid black letterbox bars —
  // trim: true crops them so it fills its gallery tile like every other
  // photo instead of sitting in a large black box. Not applied to every
  // photo: a group shot with a plain wall behind it could get its edges
  // wrongly cropped by the same trim.
  { file: "683431e2-2457-4b05-a0c6-a7f5eff07f70.JPG", year: null, trim: true },
];

/**
 * sharp/libheif rejects some real iPhone HEICs outright — Portrait mode and
 * Live Photo captures embed extra reference images that trip a hard-coded
 * security limit in libheif itself (verified against this project's actual
 * source file, not a hypothetical). macOS's own `sips` decodes them fine via
 * Apple's frameworks, so HEIC input is shelled out to `sips` once as a
 * decode-to-JPEG step; everything else (resize, compress, strip metadata)
 * still goes through sharp like every other source file.
 */
async function toReadablePath(sourcePath) {
  if (extname(sourcePath).toLowerCase() !== ".heic") {
    return { path: sourcePath, cleanup: async () => {} };
  }
  // Written to a real temp directory, not next to the source file — this
  // used to drop a stray *.converted.jpg into assets/photos-source/ that
  // nothing ever cleaned up.
  const tmpDir = await mkdtemp(join(tmpdir(), "ddfl-photo-"));
  const tmpPath = join(tmpDir, `${basename(sourcePath)}.jpg`);
  await execFileAsync("sips", ["-s", "format", "jpeg", sourcePath, "--out", tmpPath]);
  return { path: tmpPath, cleanup: () => rm(tmpDir, { recursive: true, force: true }) };
}

/** Re-running the script (e.g. after adding an 8th photo) shouldn't erase
 *  captions hand-added to data/photos.json after a previous run. */
async function loadExistingCaptions() {
  try {
    const raw = await readFile(MANIFEST_PATH, "utf8");
    const existing = JSON.parse(raw);
    return new Map(existing.filter((p) => p.caption).map((p) => [p.src, p.caption]));
  } catch {
    return new Map();
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const existingCaptions = await loadExistingCaptions();
  const manifest = [];

  for (let i = 0; i < SOURCE_PHOTOS.length; i++) {
    const { file, year, trim } = SOURCE_PHOTOS[i];
    const { path: readablePath, cleanup } = await toReadablePath(join(SOURCE_DIR, file));

    const outName = `photo-${String(i + 1).padStart(2, "0")}.jpg`;
    const outSrc = `/photos/${outName}`;

    // .rotate() with no args applies the EXIF orientation flag before it's
    // discarded. No .withMetadata() call -> sharp strips EXIF by default,
    // which is deliberate: several of these are real iPhone photos with
    // embedded GPS coordinates that have no business on a public site.
    let pipeline = sharp(readablePath).rotate();
    if (trim) pipeline = pipeline.trim();
    const buffer = await pipeline
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    await cleanup();

    await writeFile(join(OUT_DIR, outName), buffer);
    const { width, height } = await sharp(buffer).metadata();

    const entry = { src: outSrc, width, height, year };
    const caption = existingCaptions.get(outSrc);
    if (caption) entry.caption = caption;
    manifest.push(entry);

    console.log(`${file} -> ${outName} (${width}x${height}${year ? `, ${year}` : ", undated"})`);
  }

  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`\nWrote ${manifest.length} photos to data/photos.json`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
