// Detector local de silbatos: analiza la banda aguda del audio con Goertzel.
// No sube ni comparte el vídeo; el resultado se guarda en caché junto a la app.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { app } from 'electron';
import { getFfmpegPath } from './ffmpeg-helper.js';

const RATE = 22050;
const FRAME = 1024;
const HOP = 512;
const DETECTOR_VERSION = 3;

// Un silbato es un tono agudo casi puro (fundamental entre ~1,5 y ~4,5 kHz) que
// domina la energía del fotograma y se mantiene al menos MIN_DURATION segundos.
// La voz, los golpes y la música reparten su energía en muchas frecuencias, por
// lo que no superan el umbral de pureza.
const MIN_FREQ = 1500;
const MAX_FREQ = 4500;
const PEAK_HALF_WIDTH = 3;       // bins a cada lado del pico (~65 Hz)
const BAND_LOW = 1000;           // banda donde se mide la pureza: deja fuera el ruido grave del público
const BAND_HIGH = 6000;
const MIN_PURITY = 0.5;          // fracción de la energía de la banda concentrada en el pico
const MIN_MEAN_SQUARE = 100000;  // ~ -40 dBFS: descarta tonos residuales muy débiles
const MAX_FREQ_JUMP = 500;       // Hz entre fotogramas; los silbatos de bola oscilan
const MAX_GAP = 0.07;            // s de silencio tolerados dentro de un mismo pitido
const MIN_DURATION = 0.3;        // s
const MIN_SEPARATION = 0.8;      // s entre silbatos distintos

const HANN = Float64Array.from({ length: FRAME }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FRAME - 1)));
const COS = Float64Array.from({ length: FRAME / 2 }, (_, i) => Math.cos((2 * Math.PI * i) / FRAME));
const SIN = Float64Array.from({ length: FRAME / 2 }, (_, i) => -Math.sin((2 * Math.PI * i) / FRAME));
const BIT_REVERSE = (() => {
  const bits = Math.log2(FRAME);
  return Uint16Array.from({ length: FRAME }, (_, i) => {
    let r = 0;
    for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b);
    return r;
  });
})();

// FFT radix-2 in situ; devuelve la potencia de los FRAME/2 primeros bins.
const re = new Float64Array(FRAME);
const im = new Float64Array(FRAME);
const power = new Float64Array(FRAME / 2);
function spectrum(frame) {
  for (let i = 0; i < FRAME; i++) { re[BIT_REVERSE[i]] = frame[i] * HANN[i]; im[BIT_REVERSE[i]] = 0; }
  for (let size = 2; size <= FRAME; size <<= 1) {
    const half = size >> 1;
    const step = FRAME / size;
    for (let start = 0; start < FRAME; start += size) {
      for (let k = 0; k < half; k++) {
        const c = COS[k * step];
        const sn = SIN[k * step];
        const i = start + k;
        const j = i + half;
        const tr = re[j] * c - im[j] * sn;
        const ti = re[j] * sn + im[j] * c;
        re[j] = re[i] - tr; im[j] = im[i] - ti;
        re[i] += tr; im[i] += ti;
      }
    }
  }
  for (let k = 0; k < FRAME / 2; k++) power[k] = re[k] * re[k] + im[k] * im[k];
  return power;
}

// Devuelve la frecuencia del tono dominante o 0 si el fotograma no es un silbato.
function dominantTone(frame) {
  let meanSquare = 0;
  for (let i = 0; i < FRAME; i++) meanSquare += frame[i] * frame[i];
  meanSquare /= FRAME;
  if (meanSquare < MIN_MEAN_SQUARE) return 0;

  const bins = spectrum(frame);
  const binHz = RATE / FRAME;
  const lo = Math.floor(MIN_FREQ / binHz);
  const hi = Math.ceil(MAX_FREQ / binHz);
  let peak = lo;
  for (let k = lo; k <= hi; k++) if (bins[k] > bins[peak]) peak = k;

  let total = 0;
  for (let k = Math.floor(BAND_LOW / binHz); k <= Math.ceil(BAND_HIGH / binHz); k++) total += bins[k];
  let tone = 0;
  for (let k = Math.max(1, peak - PEAK_HALF_WIDTH); k <= Math.min(bins.length - 1, peak + PEAK_HALF_WIDTH); k++) tone += bins[k];
  return total > 0 && tone / total >= MIN_PURITY ? peak * binHz : 0;
}

function cachePath(videoPath) {
  const key = crypto.createHash('sha256').update(videoPath).digest('hex');
  const dir = path.join(app.getPath('userData'), 'whistle-cache');
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${key}.json`);
}

function getDuration(videoPath) {
  return new Promise(resolve => {
    const process = spawn(getFfmpegPath(), ['-i', videoPath]);
    let output = '';
    process.stderr.on('data', chunk => { output += chunk.toString(); });
    process.on('close', () => {
      const match = output.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
      resolve(match ? Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) : 0);
    });
    process.on('error', () => resolve(0));
  });
}

export async function detectWhistles(videoPath, onProgress = () => {}) {
  const cache = cachePath(videoPath);
  const stat = fs.statSync(videoPath);
  if (fs.existsSync(cache)) {
    const saved = JSON.parse(fs.readFileSync(cache, 'utf8'));
    if (saved.version === DETECTOR_VERSION && saved.size === stat.size && saved.mtimeMs === stat.mtimeMs) { onProgress(100); return saved.timestamps; }
  }
  const duration = await getDuration(videoPath);
  onProgress(0);

  const timestamps = await new Promise((resolve, reject) => {
    const process = spawn(getFfmpegPath(), ['-v', 'error', '-i', videoPath, '-vn', '-ac', '1', '-ar', String(RATE), '-f', 's16le', 'pipe:1']);
    let pending = Buffer.alloc(0); let sampleIndex = 0;
    const found = [];
    let lastProgress = -1;
    let run = null; // { start, last, freq }
    const closeRun = () => {
      if (run && run.last - run.start + FRAME / RATE >= MIN_DURATION && run.start - (found.at(-1) ?? -10) >= MIN_SEPARATION) {
        found.push(Math.round(run.start * 100) / 100);
      }
      run = null;
    };
    process.stdout.on('data', chunk => {
      pending = Buffer.concat([pending, chunk]);
      while (pending.length >= FRAME * 2) {
        const frame = new Int16Array(pending.buffer.slice(pending.byteOffset, pending.byteOffset + FRAME * 2));
        const time = sampleIndex / RATE;
        const freq = dominantTone(frame);
        if (freq) {
          if (run && Math.abs(freq - run.freq) > MAX_FREQ_JUMP) closeRun();
          if (!run) run = { start: time, last: time, freq };
          run.last = time; run.freq = freq;
        } else if (run && time - run.last > MAX_GAP) {
          closeRun();
        }
        pending = pending.subarray(HOP * 2); sampleIndex += HOP;
        if (duration) {
          const percent = Math.min(99, Math.floor((sampleIndex / RATE / duration) * 100));
          if (percent > lastProgress) { lastProgress = percent; onProgress(percent); }
        }
      }
    });
    process.on('error', reject);
    process.on('close', code => {
      closeRun();
      if (code === 0) resolve(found); else reject(new Error('No se pudo analizar el audio del vídeo'));
    });
  });
  onProgress(100);
  fs.writeFileSync(cache, JSON.stringify({ version: DETECTOR_VERSION, size: stat.size, mtimeMs: stat.mtimeMs, timestamps }));
  return timestamps;
}

export function getCachedWhistles(videoPath) {
  try {
    const saved = JSON.parse(fs.readFileSync(cachePath(videoPath), 'utf8'));
    const stat = fs.statSync(videoPath);
    return saved.version === DETECTOR_VERSION && saved.size === stat.size && saved.mtimeMs === stat.mtimeMs ? saved.timestamps : [];
  } catch { return []; }
}
