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
const DETECTOR_VERSION = 2;
// Los silbatos de pista/playa suelen variar mucho según el árbitro y la cámara.
// Usamos una banda amplia y pasos pequeños para no depender de un tono exacto.
const FREQUENCIES = Array.from({ length: 19 }, (_, index) => 1100 + index * 250);

function energy(samples, frequency) {
  const coefficient = 2 * Math.cos((2 * Math.PI * frequency) / RATE);
  let q0 = 0; let q1 = 0; let q2 = 0;
  for (const sample of samples) { q0 = coefficient * q1 - q2 + sample; q2 = q1; q1 = q0; }
  return q1 * q1 + q2 * q2 - coefficient * q1 * q2;
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
    let pending = Buffer.alloc(0); let sampleIndex = 0; let candidateStart = null; let lastWhistle = -10;
    const found = [];
    let lastProgress = -1;
    process.stdout.on('data', chunk => {
      pending = Buffer.concat([pending, chunk]);
      while (pending.length >= FRAME * 2) {
        const frame = new Int16Array(pending.subarray(0, FRAME * 2).buffer, pending.byteOffset, FRAME);
        let total = 0; for (const value of frame) total += value * value;
        const band = Math.max(...FREQUENCIES.map(f => energy(frame, f)));
        const ratio = band / Math.max(total, 1);
        const time = sampleIndex / RATE;
        // Perfil sensible: tonos agudos breves, incluso cuando quedan tapados por público.
        // El ratio espectral filtra la mayor parte de golpes/voz no tonales.
        if (ratio > 7 && total / FRAME > 35000) {
          candidateStart ??= time;
        } else if (candidateStart !== null) {
          if (time - candidateStart >= 0.025 && candidateStart - lastWhistle >= 0.35) {
            const point = Math.round((candidateStart + (time - candidateStart) / 2) * 100) / 100;
            found.push(point); lastWhistle = point;
          }
          candidateStart = null;
        }
        pending = pending.subarray(HOP * 2); sampleIndex += HOP;
        if (duration) {
          const percent = Math.min(99, Math.floor((sampleIndex / RATE / duration) * 100));
          if (percent > lastProgress) { lastProgress = percent; onProgress(percent); }
        }
      }
    });
    process.on('error', reject);
    process.on('close', code => code === 0 ? resolve(found) : reject(new Error('No se pudo analizar el audio del vídeo')));
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
