// comprueba la sintaxis de todo el JS del escritorio, la tablet y el servidor OTA
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const carpetas = ['src', 'test', 'scripts', 'tablet/www/js', 'tablet/ota-server/src'];

function ficheros(dir) {
    return readdirSync(dir).flatMap(nombre => {
        const ruta = join(dir, nombre);
        if (statSync(ruta).isDirectory()) return ficheros(ruta);
        return /\.(m?js|cjs)$/.test(nombre) ? [ruta] : [];
    });
}

const fallos = carpetas.flatMap(ficheros).filter(f => {
    const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
    if (r.status !== 0) process.stderr.write(r.stderr);
    return r.status !== 0;
});

if (fallos.length) {
    console.error(`\n${fallos.length} fichero(s) con errores de sintaxis`);
    process.exit(1);
}
