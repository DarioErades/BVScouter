import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { getFfmpegPath } from './ffmpeg-helper.js';

const activeDownloads = new Map();

function parseProgressLine(line) {
  const match = line.match(/\[download\]\s+([\d.]+)%\s+of\s+~?\s*([\d.]+\s*[a-zA-Z]+)(?:\s+at\s+([\d.]+\s*[a-zA-Z\/]+))?(?:\s+ETA\s+([\d:]+))?/i);
  if (match) {
    const percent = parseFloat(match[1]);
    const total = match[2].trim();
    const speed = match[3] ? match[3].trim() : '';
    const eta = match[4] ? match[4].trim() : '';

    let text = `${percent.toFixed(1)}% de ${total}`;
    if (speed) text += ` | ${speed}`;
    if (eta) text += ` | Restante: ${eta}`;

    return {
      percent,
      total,
      speed,
      eta,
      text
    };
  }
  return null;
}

function getFfmpegBin() {
  return getFfmpegPath();
}


export async function descargarYtDlp(outputPath, videoUrl, onProgress) {
  if (activeDownloads.has(videoUrl)) {
    const active = activeDownloads.get(videoUrl);
    if (onProgress) active.listeners.add(onProgress);
    return active.promise;
  }

  const listeners = new Set();
  if (onProgress) listeners.add(onProgress);

  const emitProgress = (data) => {
    for (const listener of listeners) {
      try { listener(data); } catch (e) {}
    }
  };

  const promise = (async () => {
    const ytdlpBins = [
      '/home/dario/.local/bin/yt-dlp',
      path.join(os.homedir(), '.local', 'bin', 'yt-dlp'),
      path.join(os.homedir(), 'AppData', 'Local', 'Python', 'pythoncore-3.14-64', 'Scripts', 'yt-dlp.exe'),
      path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Python', 'Python311', 'Scripts', 'yt-dlp.exe'),
      path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Python', 'Python312', 'Scripts', 'yt-dlp.exe'),
      path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Python', 'Python310', 'Scripts', 'yt-dlp.exe')
    ];

    try {
      const pythonLocalDir = path.join(os.homedir(), 'AppData', 'Local', 'Python');
      if (fs.existsSync(pythonLocalDir)) {
        for (const dir of fs.readdirSync(pythonLocalDir)) {
          const scriptPath = path.join(pythonLocalDir, dir, 'Scripts', 'yt-dlp.exe');
          if (fs.existsSync(scriptPath)) ytdlpBins.unshift(scriptPath);
        }
      }
      const pythonProgDir = path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Python');
      if (fs.existsSync(pythonProgDir)) {
        for (const dir of fs.readdirSync(pythonProgDir)) {
          const scriptPath = path.join(pythonProgDir, dir, 'Scripts', 'yt-dlp.exe');
          if (fs.existsSync(scriptPath)) ytdlpBins.unshift(scriptPath);
        }
      }
    } catch (e) { /* ignore */ }

    let ytdlpBin = 'yt-dlp';
    for (const bin of ytdlpBins) {
      if (fs.existsSync(bin)) {
        ytdlpBin = bin;
        break;
      }
    }

    const nodeBins = [
      '/usr/bin/node',
      'C:\\Program Files\\nodejs\\node.exe',
      path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'node', 'node.exe')
    ];
    let nodePath = 'node';
    for (const bin of nodeBins) {
      if (fs.existsSync(bin)) {
        nodePath = bin;
        break;
      }
    }

    const ffmpegBin = getFfmpegBin();
    const ffmpegArgs = ffmpegBin ? ['--ffmpeg-location', ffmpegBin] : [];

    const runtimeArgs = ['--js-runtimes', `node:${nodePath}`, '--remote-components', 'ejs:github'];
    const intentos = [
      [...runtimeArgs, ...ffmpegArgs, '-f', 'bv*[vcodec^=avc1][ext=mp4]+ba[ext=m4a]/b[vcodec^=avc1][ext=mp4]/b[ext=mp4]/best', '--merge-output-format', 'mp4', '--no-playlist', '--newline'],
      [...runtimeArgs, ...ffmpegArgs, '-f', 'best[vcodec^=avc1][ext=mp4]/best[ext=mp4]/best', '--no-playlist', '--extractor-args', 'youtube:player_client=android', '--newline'],
      [...ffmpegArgs, '-f', 'best[vcodec^=avc1][ext=mp4]/best[ext=mp4]/best', '--no-playlist', '--newline']
    ];

    let ultimoError = '';
    for (const args of intentos) {
      const fullArgs = [...args, '-o', outputPath, videoUrl];
      const res = await runProcess(ytdlpBin, fullArgs, emitProgress);
      if (res.success && fs.existsSync(outputPath)) return;
      if (res.error) ultimoError = res.error;

      // Fallback con python -m yt_dlp
      const pythonBins = [
        'C:\\Users\\Administrator\\AppData\\Local\\Microsoft\\WindowsApps\\python.exe',
        path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Python', 'Python311', 'python.exe'),
        'python'
      ];
      for (const py of pythonBins) {
        const pyRes = await runProcess(py, ['-m', 'yt_dlp', ...fullArgs], emitProgress);
        if (pyRes.success && fs.existsSync(outputPath)) return;
        if (pyRes.error) ultimoError = pyRes.error;
      }
    }

    if (!fs.existsSync(outputPath)) {
      const detalle = ultimoError ? ` Detalle: ${ultimoError.split('\n').filter(Boolean).slice(-2).join(' ')}` : '';
      throw new Error(`No se pudo descargar el vídeo de YouTube.${detalle}`);
    }
  })();

  activeDownloads.set(videoUrl, { promise, listeners });

  try {
    await promise;
  } finally {
    activeDownloads.delete(videoUrl);
  }
}

function runProcess(cmd, args, emitProgress) {
  return new Promise((resolve) => {
    try {
      const child = spawn(cmd, args);
      let errorLog = '';

      const handleData = (data) => {
        const str = data.toString();
        errorLog += str;
        const lines = str.split(/\r|\n/);
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          const prog = parseProgressLine(trimmed);
          if (prog) {
            emitProgress(prog);
          }
        }
      };

      if (child.stdout) child.stdout.on('data', handleData);
      if (child.stderr) child.stderr.on('data', handleData);

      child.on('close', (code) => {
        resolve({ success: code === 0 && !errorLog.includes('ERROR:'), error: errorLog });
      });
      child.on('error', (err) => {
        resolve({ success: false, error: String(err) });
      });
    } catch (e) {
      resolve({ success: false, error: String(e) });
    }
  });
}
