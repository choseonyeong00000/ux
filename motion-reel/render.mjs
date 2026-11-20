// Renders index.html frame-by-frame in headless Chromium and encodes an MP4.
//   node render.mjs            -> build/motion-reel.mp4 (muxes build/audio.wav if present)
//   node render.mjs stills 1.5 2.5 ...  -> build/still_<t>.jpg
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
const { chromium } = createRequire(execSync('npm root -g').toString().trim() + '/')('playwright');
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const build = path.join(dir, 'build');
mkdirSync(build, { recursive: true });
const FPS = 60, DUR = 15;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', e => { console.error('PAGE ERROR', e); process.exit(1); });
await page.goto(pathToFileURL(path.join(dir, 'index.html')).href);
await page.evaluate(() => window.ready);

const grab = async (n, q = 0.96) => Buffer.from(
  (await page.evaluate(([n, q]) => { renderFrame(n); return document.getElementById('out').toDataURL('image/jpeg', q); }, [n, q])).split(',')[1], 'base64');

if (process.argv[2] === 'stills') {
  for (const t of process.argv.slice(3)) writeFileSync(path.join(build, `still_${t}.jpg`), await grab(Math.round(parseFloat(t) * FPS), 0.85));
} else {
  const audio = path.join(build, 'audio.wav');
  const hasAudio = existsSync(audio);
  const args = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    ...(hasAudio ? ['-i', audio] : []),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p',
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-vf', 'scale=in_range=full:out_range=tv:out_color_matrix=bt709',
    ...(hasAudio ? ['-c:a', 'aac', '-b:a', '256k', '-shortest'] : []),
    '-movflags', '+faststart', path.join(build, 'motion-reel.mp4')];
  const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] });
  const total = FPS * DUR;
  for (let n = 0; n < total; n++) {
    if (!ff.stdin.write(await grab(n))) await new Promise(r => ff.stdin.once('drain', r));
    if (n % 120 === 0) console.log(`frame ${n}/${total}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  console.log('done');
}
await browser.close();
