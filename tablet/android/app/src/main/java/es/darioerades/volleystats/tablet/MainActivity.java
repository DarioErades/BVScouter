package es.darioerades.volleystats.tablet;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ActualizadorPlugin.class);
        registerPlugin(ImprimirPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
