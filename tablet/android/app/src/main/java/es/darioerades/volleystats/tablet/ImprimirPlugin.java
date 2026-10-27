package es.darioerades.volleystats.tablet;

import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Genera el PDF del informe: carga el HTML en un WebView fuera de pantalla y lo manda al diálogo
 * de impresión de Android, que ofrece "Guardar como PDF" (y compartir o imprimir de verdad).
 */
@CapacitorPlugin(name = "Imprimir")
public class ImprimirPlugin extends Plugin {

    // Hay que mantener la referencia mientras dura la impresión o el WebView se recolecta.
    private WebView webView;

    @PluginMethod
    public void pdf(PluginCall call) {
        String html = call.getString("html");
        String nombre = call.getString("nombre", "informe");
        if (html == null) {
            call.reject("Falta el HTML del informe");
            return;
        }
        getActivity().runOnUiThread(() -> {
            WebView wv = new WebView(getActivity());
            wv.getSettings().setJavaScriptEnabled(true);
            wv.setWebViewClient(new WebViewClient() {
                @Override
                public void onPageFinished(WebView view, String url) {
                    PrintManager pm = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
                    PrintDocumentAdapter adapter = view.createPrintDocumentAdapter(nombre);
                    PrintAttributes attrs = new PrintAttributes.Builder()
                            .setMediaSize(PrintAttributes.MediaSize.ISO_A4.asLandscape())
                            .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                            .build();
                    pm.print(nombre, adapter, attrs);
                    call.resolve();
                }
            });
            wv.loadDataWithBaseURL("https://localhost/", html, "text/html", "UTF-8", null);
            webView = wv;
        });
    }
}
