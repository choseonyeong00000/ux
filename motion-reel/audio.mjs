// Procedural soundtrack (120 BPM) synced to the cuts. Writes build/audio.wav.
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const sr = 48000, DUR = 15, N = sr * DUR, TAU = Math.PI * 2;
const L = new Float32Array(N), R = new Float32Array(N), SL = new Float32Array(N), SR = new Float32Array(N);
let seed = 7; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2147483648 - 1; };

function voice(t0, dur, gen, { g = 1, pan = 0, send = 0 } = {}) {
  const i0 = Math.round(t0 * sr), n = Math.round(dur * sr);
  const gl = g * Math.cos((pan + 1) * Math.PI / 4), gr = g * Math.sin((pan + 1) * Math.PI / 4);
  for (let k = 0; k < n; k++) {
    const i = i0 + k; if (i < 0 || i >= N) continue;
    const s = gen(k / sr, k);
    L[i] += s * gl; R[i] += s * gr; SL[i] += s * gl * send; SR[i] += s * gr * send;
  }
}
const kick = (t, g = 0.9) => voice(t, 0.5, tt => Math.sin(TAU * (44 * tt + 115 * 0.035 * (1 - Math.exp(-tt / 0.035)))) * Math.exp(-tt / 0.17) * Math.min(1, tt * 2000), { g });
const hat = (t, g = 0.1, pan = 0.2) => { let prev = 0; voice(t, 0.12, tt => { const n = rnd(), s = n - prev; prev = n; return s * Math.exp(-tt / 0.022); }, { g, pan, send: 0.1 }); };
const clap = (t, g = 0.22) => { let lp = 0; voice(t, 0.3, tt => { const n = rnd(); lp += (n - lp) * 0.25; const e = Math.exp(-tt / 0.08) * (1 + 0.8 * Math.sin(TAU * 90 * tt) * (tt < 0.03)); return (n - lp) * e; }, { g, send: 0.5 }); };
const bass = (t, f, g = 0.42) => voice(t, 0.24, tt => Math.tanh(1.6 * (Math.sin(TAU * f * tt) + 0.35 * Math.sin(TAU * 2 * f * tt))) * Math.min(1, tt * 300) * Math.exp(-tt / 0.14), { g });
const pluck = (t, f, g, pan) => voice(t, 0.5, tt => (Math.sin(TAU * f * tt) + 0.4 * Math.sin(TAU * 2 * f * tt) * Math.exp(-tt / 0.05) + 0.2 * Math.sin(TAU * 3 * f * tt) * Math.exp(-tt / 0.03)) * Math.min(1, tt * 800) * Math.exp(-tt / 0.11), { g, pan, send: 0.7 });
const blip = (t, f, g = 0.25) => voice(t, 0.4, tt => Math.sin(TAU * f * tt) * Math.min(1, tt * 1500) * Math.exp(-tt / 0.07), { g, send: 0.9 });
function whoosh(tEnd, dur, g = 0.3) {
  let lo = 0, bd = 0;
  voice(tEnd - dur, dur + 0.08, tt => {
    const x = Math.min(1, tt / dur), fc = 250 * Math.pow(30, x), f = 2 * Math.sin(Math.PI * fc / sr);
    const hi = rnd() - lo - 0.6 * bd; bd += f * hi; lo += f * bd;
    return bd * (tt < dur ? x * x : Math.exp(-(tt - dur) / 0.015));
  }, { g, send: 0.4 });
}
function impact(t, g = 0.8) {
  let lp = 0;
  voice(t, 1.6, tt => Math.sin(TAU * (36 * tt + 30 * 0.08 * (1 - Math.exp(-tt / 0.08)))) * Math.exp(-tt / 0.45) * Math.min(1, tt * 1500) * 0.9
    + ((lp += (rnd() - lp) * 0.12), lp) * Math.exp(-tt / 0.12) * 1.4, { g, send: 0.5 });
}
function pad(t0, t1, freqs, g = 0.05) {
  const dur = t1 - t0 + 0.6; let lpL = 0, lpR = 0;
  const saw = ph => 2 * (ph - Math.floor(ph + 0.5));
  const i0 = Math.round(t0 * sr);
  for (let k = 0; k < dur * sr; k++) {
    const i = i0 + k; if (i >= N) break;
    const tt = k / sr, T = t0 + tt;
    let a = 0, b = 0;
    for (const f of freqs) { a += saw(f * 0.997 * tt) + saw(f * 1.004 * tt + 0.3); b += saw(f * 1.003 * tt + 0.5) + saw(f * 0.996 * tt + 0.7); }
    const cut = 0.035 + 0.03 * Math.sin(TAU * T / 8);
    lpL += (a - lpL) * cut; lpR += (b - lpR) * cut;
    const env = Math.min(1, tt / 0.35) * Math.min(1, Math.max(0, (dur - tt) / 0.6));
    const duck = T >= 2 && T < 13.5 ? 1 - 0.65 * Math.exp(-(T % 0.5) / 0.11) : 1;
    L[i] += lpL * g * env * duck; R[i] += lpR * g * env * duck; SL[i] += lpL * g * env * 0.4; SR[i] += lpR * g * env * 0.4;
  }
}

/* ---- score ---- */
blip(0.1, 1318.5); blip(0.5, 987.8, 0.18); whoosh(1.0, 0.5, 0.2); impact(1.0, 0.45);
blip(1.04, 659.3, 0.12);
pad(1.0, 5, [110, 164.81, 220, 261.63], 0.035);
whoosh(2.0, 0.35, 0.35);
for (const t of [2, 3, 4]) impact(t, 0.6);
for (let t = 2; t < 13.5; t += 0.5) kick(t);
for (let t = 3.25; t < 13.5; t += 0.5) hat(t, 0.11, 0.25);
for (let t = 5; t < 13.5; t += 0.25) hat(t + 0.125, 0.045, -0.3);
for (let t = 4.5; t < 13.5; t += 1) clap(t);
[2.06, 2.17, 2.28].forEach((t, i) => blip(t + 0.12, 440 * Math.pow(2, i * 4 / 12), 0.1));   // glyphs landing
const sections = [
  { a: 4, b: 5, root: 55, ch: null },
  { a: 5, b: 8, root: 55, ch: [220, 261.63, 329.63, 392, 493.88] },
  { a: 8, b: 11, root: 43.65, ch: [174.61, 220, 261.63, 329.63, 392] },
  { a: 11, b: 13.5, root: 49, ch: [196, 246.94, 293.66, 392, 440] },
];
const pat = [0, 2, 1, 3, 2, 4, 3, 1];
for (const s of sections) {
  for (let t = s.a + 0.25; t < s.b; t += 0.5) bass(t, s.root);
  if (!s.ch) continue;
  pad(s.a, s.b, s.ch.slice(0, 4).map(f => f / 2), 0.04);
  let n = 0;
  for (let t = s.a; t < s.b - 1e-6; t += 0.125, n++) pluck(t, s.ch[pat[n % 8]] * 2, n % 4 === 0 ? 0.11 : 0.065, n % 2 ? 0.45 : -0.45);
}
whoosh(5, 0.3, 0.25); whoosh(8, 0.5, 0.4); impact(8, 0.5); whoosh(11, 0.6, 0.35); impact(11, 0.5);
whoosh(13.5, 0.5, 0.45);
impact(13.5, 0.95);
[110, 164.81, 220, 246.94, 261.63, 329.63, 659.26].forEach((f, i) => voice(13.5, 1.5, tt => (Math.sin(TAU * f * tt) + 0.3 * Math.sin(TAU * 2 * f * tt) * Math.exp(-tt / 0.2)) * Math.min(1, tt * 400) * Math.exp(-tt / 0.5), { g: 0.085, pan: (i % 2 ? 0.4 : -0.4), send: 0.9 }));
blip(14.05, 1318.5, 0.14);

/* ---- reverb (4 combs + 2 allpass per channel) ---- */
function reverb(inp, delays) {
  const out = new Float32Array(N);
  for (const d of delays) {
    const buf = new Float32Array(d); let lp = 0, idx = 0;
    for (let i = 0; i < N; i++) { const y = buf[idx]; lp += (y - lp) * 0.45; buf[idx] = inp[i] + lp * 0.8; out[i] += y; idx = (idx + 1) % d; }
  }
  for (const d of [556, 341]) {
    const buf = new Float32Array(d); let idx = 0;
    for (let i = 0; i < N; i++) { const b = buf[idx], x = out[i]; out[i] = b - 0.5 * x; buf[idx] = x + 0.5 * out[i]; idx = (idx + 1) % d; }
  }
  return out;
}
const wl = reverb(SL, [1687, 1931, 2053, 2251]), wr = reverb(SR, [1733, 1973, 2099, 2293]);
let peak = 0;
for (let i = 0; i < N; i++) {
  const fade = Math.min(1, (N - i) / (0.35 * sr));
  L[i] = Math.tanh((L[i] + wl[i] * 0.16) * 1.3) * fade; R[i] = Math.tanh((R[i] + wr[i] * 0.16) * 1.3) * fade;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const k = 0.89 / peak, pcm = Buffer.alloc(44 + N * 4);
pcm.write('RIFF', 0); pcm.writeUInt32LE(36 + N * 4, 4); pcm.write('WAVEfmt ', 8); pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(2, 22);
pcm.writeUInt32LE(sr, 24); pcm.writeUInt32LE(sr * 4, 28); pcm.writeUInt16LE(4, 32); pcm.writeUInt16LE(16, 34); pcm.write('data', 36); pcm.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { pcm.writeInt16LE(Math.round(L[i] * k * 32767), 44 + i * 4); pcm.writeInt16LE(Math.round(R[i] * k * 32767), 46 + i * 4); }
const build = path.join(path.dirname(fileURLToPath(import.meta.url)), 'build');
mkdirSync(build, { recursive: true }); writeFileSync(path.join(build, 'audio.wav'), pcm);
console.log('audio.wav written, pre-normalise peak', peak.toFixed(3));
