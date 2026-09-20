import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';

export function getFfmpegPath() {
  if (ffmpegPath && fs.existsSync(ffmpegPath)) {
    return ffmpegPath;
  }
  
  // candidates as fallback
  const candidates = [
    'ffmpeg',
    'ffmpeg.exe',
    path.join(os.homedir(), 'AppData', 'Local', 'Python', 'pythoncore-3.14-64', 'Lib', 'site-packages', 'imageio_ffmpeg', 'binaries', 'ffmpeg-win-x86_64-v7.1.exe')
  ];

  try {
    const pythonLocalDir = path.join(os.homedir(), 'AppData', 'Local', 'Python');
    if (fs.existsSync(pythonLocalDir)) {
      for (const dir of fs.readdirSync(pythonLocalDir)) {
        const pkgDir = path.join(pythonLocalDir, dir, 'Lib', 'site-packages', 'imageio_ffmpeg', 'binaries');
        if (fs.existsSync(pkgDir)) {
          for (const file of fs.readdirSync(pkgDir)) {
            if (file.toLowerCase().startsWith('ffmpeg')) {
              candidates.unshift(path.join(pkgDir, file));
            }
          }
        }
      }
    }
  } catch (e) {}

  for (const bin of candidates) {
    if (bin === 'ffmpeg' || bin === 'ffmpeg.exe') {
      continue;
    }
    if (fs.existsSync(bin)) return bin;
  }

  // fallback to system command
  return os.platform() === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
}

// ffprobe no viene con la app, así que se lee la lista de pistas que imprime ffmpeg.
export function tieneAudio(videoPath) {
  return new Promise(resolve => {
    const proceso = spawn(getFfmpegPath(), ['-hide_banner', '-i', videoPath]);
    let salida = '';
    proceso.stderr.on('data', chunk => { salida += chunk.toString(); });
    proceso.on('close', () => resolve(/Stream #\d+:\d+.*: Audio:/.test(salida)));
    proceso.on('error', () => resolve(false));
  });
}
