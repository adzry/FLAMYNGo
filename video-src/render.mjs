// Renders film.html frame-by-frame into a silent H.264 video (or stills).
//   node render.mjs <timeline> <out.mp4> [fps]
//   PAGE=tiktok.html node render.mjs - <out.mp4>   (other page; stage size is read from #stage)
//   node render.mjs <timeline> --stills <dir> <t1,t2,...>
// Requires: playwright (Chromium) and an ffmpeg binary in $FFMPEG or PATH.
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const [tl = "teaser", out = `${tl}.mp4`, arg3, arg4] = process.argv.slice(2);
const ffmpeg = process.env.FFMPEG || "ffmpeg";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(pathToFileURL(path.join(here, process.env.PAGE || "film.html")).href + `?tl=${tl}`, { waitUntil: "networkidle" });
const size = await page.evaluate(() => { const r = document.getElementById("stage").getBoundingClientRect(); return { width: Math.round(r.width), height: Math.round(r.height) }; });
await page.setViewportSize(size);
// fonts only download when used, and most scenes start hidden: force-load them
await page.evaluate(() => Promise.all([
  "400 20px 'DM Sans'", "500 20px 'DM Sans'", "700 20px 'DM Sans'",
  "600 20px Manrope", "700 20px Manrope", "800 20px Manrope", "700 20px Caveat",
].map((f) => document.fonts.load(f))));
await page.evaluate(() => document.fonts.ready);
const stage = page.locator("#stage");
const duration = await page.evaluate(() => window.DURATION);

if (out === "--stills") {
  mkdirSync(arg3, { recursive: true });
  for (const t of arg4.split(",").map(Number)) {
    await page.evaluate((t) => window.renderAt(t), t);
    await stage.screenshot({ path: path.join(arg3, `${tl}-${t.toFixed(2)}.png`) });
  }
} else {
  const fps = Number(arg3 || 30);
  const frames = Math.round(duration * fps);
  const enc = spawn(ffmpeg, [
    "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-",
    "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", out,
  ], { stdio: ["pipe", "inherit", "inherit"] });
  for (let i = 0; i < frames; i++) {
    await page.evaluate((t) => window.renderAt(t), i / fps);
    const buf = await stage.screenshot({ type: "jpeg", quality: 95 });
    if (!enc.stdin.write(buf)) await new Promise((r) => enc.stdin.once("drain", r));
    if (i % 150 === 0) console.log(`${tl}: frame ${i}/${frames}`);
  }
  enc.stdin.end();
  await new Promise((r) => enc.on("close", r));
}
console.log(JSON.stringify({ tl, duration }));
await browser.close();
