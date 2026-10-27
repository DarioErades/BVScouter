import fs from "node:fs/promises";
import path from "node:path";

const RAIZ = path.join(process.env.DATOS ?? "./datos", "app");
const RUTA_VERSION = path.join(RAIZ, "version.json");
const RUTA_APK = path.join(RAIZ, "volleystats-tablet.apk");

export async function leerVersion() {
  try {
    return JSON.parse(await fs.readFile(RUTA_VERSION, "utf8"));
  } catch {
    return { versionCode: 0, versionName: "", notas: "" };
  }
}

export async function guardarVersion(version) {
  await fs.mkdir(RAIZ, { recursive: true });
  await fs.writeFile(RUTA_VERSION, JSON.stringify(version, null, 2));
}

export async function leerApk() {
  try {
    return await fs.readFile(RUTA_APK);
  } catch {
    return null;
  }
}

export async function guardarApk(bytes) {
  await fs.mkdir(RAIZ, { recursive: true });
  await fs.writeFile(RUTA_APK, bytes);
}
