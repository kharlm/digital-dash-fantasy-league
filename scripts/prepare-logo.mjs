/**
 * Turns the raw logo art (assets/logo-source.png) into every derived asset the
 * site needs. Run with `npm run logo`. Re-runnable and deterministic, so if the
 * source art is ever redrawn we regenerate everything in one shot.
 *
 * The source is a 1024x1024 RGB PNG on a solid white background with a
 * "2026 CHAMPION" ribbon at the bottom. We produce:
 *   public/logo.png            full crest, transparent (hero, trophy room)
 *   public/logo-mark.png       crest minus the ribbon  (header)
 *   app/icon.png               256x256 favicon
 *   app/apple-icon.png         180x180 touch icon
 *   app/opengraph-image.png    1200x630 social card
 *   app/twitter-image.png      same, for the large summary card
 *
 * The three files under app/ are Next.js metadata file conventions — dropping
 * them in that folder is what makes Next emit the <link rel="icon"> and
 * og:image tags, so they intentionally do NOT live in public/.
 */
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "assets/logo-source.png");

const NAVY = "#0a1a3a";
const NAVY_DEEP = "#050d20";

/**
 * Strip the white background.
 *
 * A plain "make every near-white pixel transparent" pass would also eat the
 * white *inside* the artwork — the football laces and the highlights in the
 * DDFL lettering. So instead we flood fill inward from the border and only
 * clear white that is actually connected to the outside edge. Pixels between
 * the two thresholds get partial alpha, which preserves the anti-aliased edge
 * around the flames instead of leaving a hard white fringe.
 */
async function knockOutBackground() {
  const img = sharp(SRC).ensureAlpha();
  const { width, height } = await img.metadata();
  const raw = await img.raw().toBuffer();

  const HARD = 244; // all channels >= this -> definitely background
  const SOFT = 208; // all channels >= this -> edge falloff
  const SAT = 26; // max channel spread still considered grey/white

  const whiteness = (i) => {
    const mn = Math.min(raw[i], raw[i + 1], raw[i + 2]);
    const mx = Math.max(raw[i], raw[i + 1], raw[i + 2]);
    if (mx - mn > SAT) return 0; // saturated colour -> part of the crest
    if (mn >= HARD) return 1;
    if (mn >= SOFT) return (mn - SOFT) / (HARD - SOFT);
    return 0;
  };

  const visited = new Uint8Array(width * height);
  const stack = [];
  for (let x = 0; x < width; x++) stack.push([x, 0], [x, height - 1]);
  for (let y = 0; y < height; y++) stack.push([0, y], [width - 1, y]);

  while (stack.length) {
    const [x, y] = stack.pop();
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    const p = y * width + x;
    if (visited[p]) continue;
    const w = whiteness(p * 4);
    if (w <= 0) continue; // reached the crest — stop travelling this way
    visited[p] = 1;
    raw[p * 4 + 3] = Math.round(raw[p * 4 + 3] * (1 - w));
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  return sharp(raw, { raw: { width, height, channels: 4 } })
    .png()
    .trim({ threshold: 1 }) // drop the transparent margin
    .toBuffer();
}

/**
 * Pad a buffer out to a transparent square so icons never render squashed.
 * `fit: contain` scales to fit and pads the short axis, which is what we want —
 * note that sharp resizes *before* it composites, so building this by hand with
 * a create+composite canvas would shrink the canvas out from under the input.
 */
function toSquare(buf, size) {
  return sharp(buf)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png(SQUEEZE)
    .toBuffer();
}

/** Palette quantisation — the art is flat-shaded, so this is visually free. */
const SQUEEZE = { palette: true, quality: 90, effort: 9, compressionLevel: 9 };

const full = await knockOutBackground();
const { width: fw, height: fh } = await sharp(full).metadata();
await sharp(full).png(SQUEEZE).toFile(join(ROOT, "public/logo.png"));

// The ribbon occupies the bottom of the crest. Cutting it at 68% of the height
// lands just under "FANTASY FOOTBALL LEAGUE" and above the "2026" — a header
// mark stamped with a year would read as stale the moment the season turns.
const mark = await sharp(full)
  .extract({ left: 0, top: 0, width: fw, height: Math.round(fh * 0.68) })
  .trim({ threshold: 1 })
  .png()
  .toBuffer();
await sharp(mark).png(SQUEEZE).toFile(join(ROOT, "public/logo-mark.png"));

await sharp(await toSquare(mark, 256)).toFile(join(ROOT, "app/icon.png"));
await sharp(await toSquare(mark, 180)).toFile(join(ROOT, "app/apple-icon.png"));

// Social card: the crest on the same navy the site uses, with the 10-year line.
const OG_W = 1200;
const OG_H = 630;
const ogLogo = await sharp(full).resize({ height: 460 }).toBuffer();
const { width: olw } = await sharp(ogLogo).metadata();

const ogBackdrop = Buffer.from(`
<svg width="${OG_W}" height="${OG_H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="glow" cx="28%" cy="50%" r="60%">
      <stop offset="0%" stop-color="#12336b"/>
      <stop offset="100%" stop-color="${NAVY_DEEP}"/>
    </radialGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffe9a8"/>
      <stop offset="55%" stop-color="#f5b418"/>
      <stop offset="100%" stop-color="#c8860a"/>
    </linearGradient>
  </defs>
  <rect width="${OG_W}" height="${OG_H}" fill="url(#glow)"/>
  <rect y="${OG_H - 8}" width="${OG_W}" height="8" fill="url(#gold)"/>
  <text x="640" y="258" font-family="Helvetica,Arial,sans-serif" font-size="82" font-weight="800" fill="url(#gold)" letter-spacing="2">DDFL</text>
  <text x="642" y="312" font-family="Helvetica,Arial,sans-serif" font-size="24" font-weight="600" fill="#8fb6f0" letter-spacing="3.5">FANTASY FOOTBALL LEAGUE</text>
  <text x="642" y="404" font-family="Helvetica,Arial,sans-serif" font-size="44" font-weight="700" fill="#ffffff">10 Years Running</text>
</svg>`);

const ogCard = await sharp(ogBackdrop)
  .composite([{ input: ogLogo, left: Math.round(300 - olw / 2), top: Math.round((OG_H - 460) / 2) }])
  .png(SQUEEZE)
  .toBuffer();
await sharp(ogCard).toFile(join(ROOT, "app/opengraph-image.png"));
await sharp(ogCard).toFile(join(ROOT, "app/twitter-image.png"));

const mm = await sharp(mark).metadata();
console.log(`logo.png       ${fw}x${fh}`);
console.log(`logo-mark.png  ${mm.width}x${mm.height}`);
console.log("icon.png 256 · apple-icon.png 180 · opengraph-image.png + twitter-image.png 1200x630");
