import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
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
