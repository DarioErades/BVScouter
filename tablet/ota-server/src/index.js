import express from "express";
import crypto from "node:crypto";
import * as actualizacion from "./almacen.js";

const TOKEN = process.env.OTA_TOKEN;
const BASE = process.env.BASE_PATH ?? "/volleystats-tablet";
const PUERTO = Number(process.env.PORT ?? 3000);
if (!TOKEN) throw new Error("Falta OTA_TOKEN");

const iguales = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

function exigirToken(req, res, next) {
  const dado = (req.get("authorization") ?? "").replace(/^Bearer /, "");
  if (iguales(dado, TOKEN)) return next();
  res.status(401).json({ error: "No autorizado" });
}

const envolver = fn => (req, res) =>
  fn(req, res).catch(e => {
    console.error(e);
    if (!res.headersSent) res.status(e.status ?? 500).json({ error: e.message });
  });

const json = express.json({ limit: "1mb" });
const apk = express.raw({ type: "application/vnd.android.package-archive", limit: "200mb" });
const r = express.Router();

r.get("/api/app/version", exigirToken, envolver(async (req, res) => {
  res.json(await actualizacion.leerVersion());
}));

r.put("/api/app/version", exigirToken, json, envolver(async (req, res) => {
  await actualizacion.guardarVersion(req.body);
  res.json({ ok: true });
}));

r.get("/api/app/apk", exigirToken, envolver(async (req, res) => {
  const datos = await actualizacion.leerApk();
  if (!datos) return res.status(404).json({ error: "No hay ningún APK publicado" });
  res.type("application/vnd.android.package-archive")
    .set("Content-Disposition", 'attachment; filename="volleystats-tablet.apk"')
    .send(datos);
}));

r.put("/api/app/apk", exigirToken, apk, envolver(async (req, res) => {
  await actualizacion.guardarApk(req.body);
  res.json({ ok: true });
}));

const app = express();
app.disable("x-powered-by");
app.use(BASE, r);
app.listen(PUERTO, () => console.log(`OTA VolleyStats Tablet escuchando en :${PUERTO}${BASE}`));
