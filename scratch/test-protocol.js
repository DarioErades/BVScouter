import fs from 'node:fs';

const filePath = 'C:\\Users\\Administrator\\AppData\\Local\\Temp\\bvscouter_yt\\https___youtu_be_V_PC4mjsz1Q.mp4';
const stat = fs.statSync(filePath);
const fileSize = stat.size;

console.log('File size:', fileSize);

function handleRange(rangeHeader) {
  const CHUNK_SIZE = 2 * 1024 * 1024;
  const parts = rangeHeader.replace(/bytes=/, '').split('-');
  const start = parseInt(parts[0], 10);
  let end = parts[1] && parts[1].trim() !== '' ? parseInt(parts[1], 10) : start + CHUNK_SIZE - 1;

  if (isNaN(start)) {
    return { status: 416, msg: 'Invalid Range' };
  }

  if (end >= fileSize) end = fileSize - 1;
  if (start > end) {
    return { status: 416, msg: 'Range Not Satisfiable' };
  }

  const chunkSize = (end - start) + 1;
  return {
    status: 206,
    contentRange: `bytes ${start}-${end}/${fileSize}`,
    contentLength: chunkSize
  };
}

console.log('Test bytes=0-:', handleRange('bytes=0-'));
console.log('Test bytes=1048576-:', handleRange('bytes=1048576-'));
console.log('Test bytes=1000-5000:', handleRange('bytes=1000-5000'));
