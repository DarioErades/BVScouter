# VolleyStats Tablet

App para tablets Android pensada para usarla **durante el partido**: alineación y rotaciones,
una fila por jugador con sus acciones (Ataque · Rece · Defensa · Saque · Bloqueo), marcador que
se actualiza solo, errores generales y un informe en tiempo real.

HTML/CSS/JS sin paso de compilación (carpeta `www/`), empaquetado como APK con [Capacitor](https://capacitorjs.com).

## Probarla en el navegador (sin Android)

```bash
cd tablet
npm run serve        # http://localhost:5180
```

Ábrela con el navegador en modo tablet (1280×800). Los datos se guardan en el `localStorage`.

## Generar la app de Android

Requisitos: Node 20+, [Android Studio](https://developer.android.com/studio) (trae el SDK y el JDK).

```bash
cd tablet
npm install
npm run android:add     # crea la carpeta android/, fija la orientación horizontal y sincroniza
npm run android:open    # abre el proyecto en Android Studio
```

En Android Studio: conecta la tablet con depuración USB (o crea un emulador de tablet) y pulsa **Run ▶**.
Para un APK que puedas instalar: *Build → Build Bundle(s) / APK(s) → Build APK(s)*.

Después de cambiar algo en `www/`:

```bash
npm run android:sync
```

## Cómo se usa

1. **Nuevo partido**: equipo, rival, formato (mejor de 3 o 5) y plantilla. La plantilla se recuerda para el siguiente.
2. **Alineación**: toca cada posición (P1 es la del saque) y elige quién saca primero.
3. **En vivo**
   - Una fila por jugador en pista y por líbero. Toca el fundamento y luego el resultado
     (Punto / Continúa / Bloqueado / Error, Acierto / Regular / Error…).
   - El marcador, el saque y la rotación se actualizan solos: al ganar un punto recibiendo se rota.
   - **Marcador**: toca un número para sumar un punto; mantén pulsado para restar uno (corrección).
   - **Punto rival**, **Error rival** y **Error general del equipo** (Red, Invasión, Posición…) en el panel derecho.
   - **Cambio** de jugador, **rotar** a mano y **deshacer** ilimitado.
   - Al llegar a 25 (15 en el set decisivo) con 2 de diferencia te propone cerrar el set.
4. **Informe** (icono de gráfica): resumen, tabla por jugador ordenable, side-out / break-point por rotación e historial. Se puede filtrar por set.

## Exportar / importar

- Desde el inicio o el informe, **Exportar** genera un `.json`. Contiene las acciones en el mismo formato que usa
  la app de escritorio (`acciones[]` con `tipo_accion`, `resultado`, `marcador_*`, `rotacion`…) y la plantilla, para
  poder importarlo allí y añadirle el vídeo.
- **Importar** (pantalla de inicio) recupera un partido exportado desde otra tablet.

## Estructura

```
www/
  index.html
  css/app.css          diseño (variables, componentes)
  js/engine.js         alineación, rotaciones, marcador, sets y deshacer
  js/stats.js          estadísticas a partir de los eventos + exportación
  js/store.js          guardado local
  js/ui.js             iconos, hojas modales, toasts
  js/views/            home · setup · lineup · live · report
```
