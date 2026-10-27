package es.darioerades.volleystats.tablet;

import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;

import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

import java.io.File;
import java.io.IOException;

/** Expone a la web de la app la comprobación e instalación de actualizaciones OTA. */
@CapacitorPlugin(name = "Actualizador")
public class ActualizadorPlugin extends Plugin {

    private File apkPendiente;

    @PluginMethod
    public void comprobar(PluginCall call) {
        execute(() -> {
            try {
                JSONObject version = Actualizador.consultarVersion();
                int servidor = version.optInt("versionCode", 0);
                JSObject ret = new JSObject();
                ret.put("versionInstalada", BuildConfig.VERSION_CODE);
                ret.put("versionServidor", servidor);
                ret.put("versionName", version.optString("versionName", ""));
                ret.put("notas", version.optString("notas", ""));
                ret.put("hayActualizacion", servidor > BuildConfig.VERSION_CODE);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("No se pudo comprobar la versión: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void descargarEInstalar(PluginCall call) {
        execute(() -> {
            try {
                apkPendiente = Actualizador.descargarApk(getContext(), porcentaje -> {
                    JSObject datos = new JSObject();
                    datos.put("porcentaje", porcentaje);
                    notifyListeners("progresoDescarga", datos);
                });
            } catch (IOException e) {
                call.reject("No se pudo descargar la actualización: " + e.getMessage());
                return;
            }
            getActivity().runOnUiThread(() -> pedirPermisoEInstalar(call));
        });
    }

    private void pedirPermisoEInstalar(PluginCall call) {
        if (getContext().getPackageManager().canRequestPackageInstalls()) {
            lanzarInstalador();
            call.resolve();
            return;
        }
        Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
        startActivityForResult(call, intent, "onPermisoResuelto");
    }

    @ActivityCallback
    private void onPermisoResuelto(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (getContext().getPackageManager().canRequestPackageInstalls()) {
            lanzarInstalador();
            call.resolve();
        } else {
            call.reject("Hace falta permitir la instalación de orígenes desconocidos para actualizar");
        }
    }

    private void lanzarInstalador() {
        Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", apkPendiente);
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(uri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
    }
}
