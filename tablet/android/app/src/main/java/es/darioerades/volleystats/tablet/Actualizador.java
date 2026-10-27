package es.darioerades.volleystats.tablet;

import android.content.Context;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/** Consulta y descarga actualizaciones publicadas en el servidor propio (fuera de Google Play). */
final class Actualizador {

    interface Progreso {
        void avance(int porcentaje);
    }

    private Actualizador() {}

    static File apkDescargado(Context ctx) {
        return new File(ctx.getCacheDir(), "actualizacion.apk");
    }

    static JSONObject consultarVersion() throws IOException, JSONException {
        HttpURLConnection con = abrirConexion("/api/app/version", "GET");
        try {
            comprobarCodigo(con);
            return new JSONObject(leerTexto(con.getInputStream()));
        } finally {
            con.disconnect();
        }
    }

    static File descargarApk(Context ctx, Progreso progreso) throws IOException {
        HttpURLConnection con = abrirConexion("/api/app/apk", "GET");
        try {
            comprobarCodigo(con);
            int total = con.getContentLength();
            File destino = apkDescargado(ctx);
            try (InputStream in = con.getInputStream(); FileOutputStream out = new FileOutputStream(destino)) {
                byte[] buffer = new byte[8192];
                long leidos = 0;
                int n;
                while ((n = in.read(buffer)) != -1) {
                    out.write(buffer, 0, n);
                    leidos += n;
                    if (progreso != null && total > 0) progreso.avance((int) Math.min(100, leidos * 100 / total));
                }
            }
            return destino;
        } finally {
            con.disconnect();
        }
    }

    private static HttpURLConnection abrirConexion(String ruta, String metodo) throws IOException {
        URL url = new URL(BuildConfig.OTA_URL + ruta);
        HttpURLConnection con = (HttpURLConnection) url.openConnection();
        con.setRequestMethod(metodo);
        con.setRequestProperty("Authorization", "Bearer " + BuildConfig.OTA_TOKEN);
        con.setConnectTimeout(15000);
        con.setReadTimeout(30000);
        return con;
    }

    private static void comprobarCodigo(HttpURLConnection con) throws IOException {
        int codigo = con.getResponseCode();
        if (codigo != 200) throw new IOException("El servidor respondió " + codigo);
    }

    private static String leerTexto(InputStream in) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buffer = new byte[4096];
        int n;
        while ((n = in.read(buffer)) != -1) out.write(buffer, 0, n);
        return out.toString(StandardCharsets.UTF_8.name());
    }
}
