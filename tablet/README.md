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
   - **Tiempo de juego**: puntos jugados, ganados y perdidos por jugador (pestaña Jugadores).
   - **PDF**: elige alcance (partido o set) y qué secciones incluir. En la tablet abre el diálogo de impresión de Android ("Guardar como PDF") mediante el plugin nativo `ImprimirPlugin.java`.
   - En **modo simple** la recepción y la defensa solo apuntan fallos, y la tabla no muestra aciertos ni porcentajes de esos fundamentos.
5. **Vista de campo** (icono de cuadrícula en la barra superior): los jugadores en su posición en la pista con sus acciones; el saque solo aparece en P1 cuando sacamos, y los líberos van en una columna al lado.

## Exportar / importar

- Desde el inicio o el informe, **Exportar** genera un `.json`. Contiene las acciones en el mismo formato que usa
  la app de escritorio (`acciones[]` con `tipo_accion`, `resultado`, `marcador_*`, `rotacion`…) y la plantilla, para
  poder importarlo allí y añadirle el vídeo.
- **Exportar todos los partidos** (Ajustes → Datos) genera un único `.json` (`volleystats-tablet-bulk`) con todos los partidos y equipos. En la app de escritorio: Ajustes → Importar todos los partidos. El equipo se reconoce por su id, nombre o plantilla, y los partidos ya importados se omiten.
- **Importar** (pantalla de inicio) recupera un partido exportado desde otra tablet.

## Actualizaciones OTA (sin Google Play)

La app comprueba y se instala sola las actualizaciones contra un servidor propio (`ota-server/`), ya desplegado en `https://vps.darioerades.es/volleystats-tablet`. La pantalla **Ajustes** (icono de engranaje en la portada) tiene un botón "Buscar actualización" y, si hay una versión nueva, "Descargar e instalar".

Piezas:
- `ota-server/`: servidor Express con `GET/PUT /api/app/version` y `GET/PUT /api/app/apk`, protegido con un token Bearer (`OTA_TOKEN`). Guarda el APK y la ficha de versión en `./datos` (volumen persistente, no en la imagen).
- `android/app/.../Actualizador.java` + `ActualizadorPlugin.java`: comparan `versionCode`, descargan el APK a `cacheDir`, piden el permiso "instalar orígenes desconocidos" si falta y lanzan el instalador del sistema.
- `www/js/actualizador.js` + `www/js/views/settings.js`: la UI web que consume ese plugin.

### Firma del release

`android/app/build.gradle` firma el `release` automáticamente si encuentra `RELEASE_STORE_FILE`, `RELEASE_STORE_PASSWORD`, `RELEASE_KEY_ALIAS` y `RELEASE_KEY_PASSWORD` como propiedades de Gradle. **Nunca van en el repo**: se definen en `~/.gradle/gradle.properties` (fuera de git) de quien compile. Si no están, el release sale sin firmar, como antes.

El keystore (`volleystats-tablet-release.jks`, alias `volleystats-tablet`) vive fuera del repo. Guárdalo con la contraseña en un sitio seguro (gestor de contraseñas / copia de seguridad): si se pierde, ninguna actualización futura podrá instalarse sobre las tablets que ya tengan la app — habría que desinstalar y volver a instalar desde cero con una firma nueva.

### Publicar una versión nueva

1. Sube `versionCode` (entero, +1 cada vez) y `versionName` en [`android/app/build.gradle`](android/app/build.gradle).
2. Compila el APK release (se firma solo si `~/.gradle/gradle.properties` tiene las claves de arriba):
   ```bash
   cd android
   ./gradlew assembleRelease
   ```
   El APK queda en `android/app/build/outputs/apk/release/app-release.apk`.
3. Sube el binario:
   ```bash
   curl -X PUT https://vps.darioerades.es/volleystats-tablet/api/app/apk \
     -H "Authorization: Bearer $OTA_TOKEN" \
     -H "Content-Type: application/vnd.android.package-archive" \
     --data-binary @android/app/build/outputs/apk/release/app-release.apk
   ```
4. Publica la ficha de versión (el `versionCode` debe coincidir con el del paso 1):
   ```bash
   curl -X PUT https://vps.darioerades.es/volleystats-tablet/api/app/version \
     -H "Authorization: Bearer $OTA_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"versionCode": 3, "versionName": "3", "notas": "Qué ha cambiado en esta versión"}'
   ```

Desde ese momento, cualquier tablet con la app abierta verá la actualización disponible en Ajustes.

### Desplegar o mover el servidor OTA

En el VPS (mismo patrón que el resto de apps desplegadas a mano junto a Coolify, compartiendo su red `coolify` de Traefik):

```bash
cd ~/volleystats-ota-server   # o donde se copie tablet/ota-server/
cp .env.example .env          # y rellena OTA_TOKEN con un token largo y aleatorio
docker compose up -d --build
```

El `OTA_URL` que usa la app (por defecto `https://vps.darioerades.es/volleystats-tablet`) y el `OTA_TOKEN` que se compila en el APK se pueden sobrescribir al compilar con `-POTA_URL=... -POTA_TOKEN=...` (o las variables de entorno equivalentes), por si el servidor cambia de sitio o hay que rotar el token.

## Estructura

```
www/
  index.html
  css/app.css          diseño (variables, componentes)
  js/engine.js         alineación, rotaciones, marcador, sets y deshacer
  js/stats.js          estadísticas a partir de los eventos + exportación
  js/store.js          guardado local
  js/ui.js             iconos, hojas modales, toasts
  js/actualizador.js   puente con el plugin nativo de actualizaciones OTA
  js/views/            home · setup · lineup · live · report · settings
ota-server/            servidor OTA (versión + APK), ver más arriba
```
