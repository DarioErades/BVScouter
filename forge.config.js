const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const path = require('path');
const fs = require('fs');

// copiamos recursivamente un directorio
function copiarDirectorio(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copiarDirectorio(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

module.exports = {
  packagerConfig: {
    asar: false,
    afterCopy: [
      // copiamos better-sqlite3 y sus deps al node_modules del paquete
      (buildPath, electronVersion, platform, arch, callback) => {
        const modulosACopiar = ['better-sqlite3', 'bindings', 'file-uri-to-path', 'prebuild-install', 'node-addon-api'];
        const nodeModulesSrc = path.resolve(__dirname, 'node_modules');
        const nodeModulesDest = path.join(buildPath, 'node_modules');

        for (const mod of modulosACopiar) {
          const src = path.join(nodeModulesSrc, mod);
          const dest = path.join(nodeModulesDest, mod);
          if (fs.existsSync(src)) {
            copiarDirectorio(src, dest);
          }
        }
        callback();
      }
    ],
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'win32'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-vite',
      config: {
        build: [
          {
            entry: 'src/main.js',
            config: 'vite.main.config.mjs',
            target: 'main',
          },
          {
            entry: 'src/preload.js',
            config: 'vite.preload.config.mjs',
            target: 'preload',
          },
        ],
        renderer: [
          {
            name: 'main_window',
            config: 'vite.renderer.config.mjs',
          },
        ],
      },
    },
  ],
};
