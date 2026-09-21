// Ajustes de Android que Capacitor no expone en su config: pantalla siempre en horizontal.
import fs from 'node:fs';
import path from 'node:path';

const manifest = path.join('android', 'app', 'src', 'main', 'AndroidManifest.xml');
if (!fs.existsSync(manifest)) {
  console.error('No encuentro', manifest, '- ejecuta antes "npx cap add android".');
  process.exit(1);
}

let xml = fs.readFileSync(manifest, 'utf8');
if (xml.includes('android:screenOrientation')) {
  console.log('La orientación ya estaba configurada.');
} else {
  xml = xml.replace('<activity', '<activity\n            android:screenOrientation="sensorLandscape"');
  fs.writeFileSync(manifest, xml);
  console.log('Orientación horizontal configurada en AndroidManifest.xml');
}
