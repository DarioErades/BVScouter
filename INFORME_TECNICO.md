# 🏐 Informe Técnico — BVScouter v1.0.0

> **Fecha**: 11 de julio de 2026
> **Contexto**: App de uso personal para scouting de voley playa
> **Stack**: Electron 43 + Vite + better-sqlite3 + Chart.js

---

## Índice

1. [Bugs que SÍ te afectan](#bugs-que-sí-te-afectan)
2. [Cosas que cambiaría aunque sea para ti solo](#cosas-que-cambiaría-aunque-sea-para-ti-solo)
3. [Funcionalidades nuevas que podrías añadir](#funcionalidades-nuevas-que-podrías-añadir)
4. [Ideas grandes a largo plazo](#ideas-grandes-a-largo-plazo)

---

## Bugs que SÍ te afectan

Estos no son temas de seguridad — son bugs que **te van a joder datos o hacerte perder tiempo** mientras scouteas.

### 🔴 1. El complejo K1/K2 se muestra al revés en la UI

**Archivo**: `src/pages/scouting.js` — Línea 1653 vs 1344

En la UI que te muestra "qué acción estás registrando", el complejo sale **invertido** respecto a lo que realmente se guarda:

```js
// Lo que ves en pantalla (INCORRECTO)
const complejo = scoutingState.equipoAlSaque === 'local' ? 'K1' : 'K2';

// Lo que realmente se guarda (CORRECTO)
const complejo = scoutingState.equipoAlSaque === 'rival' ? 'K1' : 'K2';
```

**Impacto**: Tú lees "K1" en pantalla pero se está registrando como "K2". Si te fías de lo que ves para decidir qué registrar, puedes estar metiendo datos al revés sin darte cuenta.

**Fix**: Cambiar la línea 1653 para que coincida con la lógica de la línea 1344. Son 5 minutos.

---

### 🔴 2. Deshacer una acción NO revierte el marcador

**Archivo**: `src/pages/scouting.js` — Líneas 1498-1509

Cuando deshaces la última acción, se borra de la base de datos y de la lista... pero el marcador se queda como estaba. Si la acción daba un punto, ese punto **nunca se resta**.

**Impacto**: El marcador se desfasa del partido real. Y como el marcador se usa para calcular quién saca, quién cambia de campo, etc., todo se descuadra a partir de ahí.

**Fix**: Antes de borrar la acción, comprobar si daba punto y restarlo del marcador correspondiente.

---

### 🔴 3. Se crean jugadores duplicados cada vez que creas un partido

**Archivo**: `src/pages/nuevo-partido.js` — Líneas 145-146

Cada vez que creas un partido, se crean 2 jugadores nuevos **siempre**, sin comprobar si ya existen. Si juegas 10 partidos con "Pablo" y "Carlos", tendrás 20 "Pablos" y 20 "Carloses" en la base de datos, todos con apellidos vacíos, nacionalidad vacía, etc.

**Impacto**: La lista de jugadores se llena de basura y las estadísticas históricas por jugador se fragmentan (cada "Pablo" tiene solo los datos de un partido).

**Fix**: Buscar si el jugador ya existe por nombre antes de crearlo. Si existe, usar el ID existente.

---

### 🔴 4. `markLastAction` puede sumar puntos dobles

**Archivo**: `src/pages/scouting.js` — Líneas 1425-1444

Si una acción ya tenía resultado con punto y la vuelves a marcar con otro resultado que también da punto, se suma otra vez sin restar el anterior. Doble conteo.

**Impacto**: Marcador incorrecto → todo lo que depende del marcador se descuadra.

---

### 🟠 5. Los cálculos de Side-Out usan el denominador equivocado

**Archivo**: `src/utils/stats-calculator.js` — Línea 59

```js
const sideOutFirstPct = totalK1 > 0 ? Math.round((fbsoPuntos / totalK1) * 100) : 0;
```

Divide FBSO puntos entre **totalK1** (que incluye también transiciones), cuando debería dividir solo entre oportunidades FBSO. El porcentaje sale más bajo de lo que realmente es.

---

### 🟠 6. El calculador de stats MUTA los objetos originales de acciones

**Archivo**: `src/utils/stats-calculator.js` — Líneas 75-79

```js
a._fase = 'K1';  // modifica el objeto original, no una copia
```

Si calculas stats del jugador 1 y luego del jugador 2 usando el mismo array de acciones, el segundo ve los objetos ya modificados por el primero. Puede dar resultados incorrectos en las estadísticas.

**Fix rápido**: Cambiar a `const accionesCopia = acciones.map(a => ({...a}));` al principio de la función.

---

### 🟠 7. Eliminar un partido NO borra sus acciones

**Archivo**: `src/ipc-handlers.js`

Cuando borras un partido, las acciones asociadas se quedan huérfanas en la base de datos. No se ven en la UI, pero ocupan espacio y pueden confundir a funciones que consulten acciones globalmente.

**Fix**: Añadir un `DELETE FROM acciones WHERE partido_id = ?` antes de borrar el partido.

---

### 🟠 8. Los event listeners de teclado se acumulan

**Archivo**: `src/pages/scouting.js`

Cada vez que entras a la página de scouting, se añaden listeners de `keydown` a `document`. Pero si sales por el sidebar (en vez de con el botón "Volver"), **nunca se eliminan**. Después de ir y venir 5 veces, tienes 5 listeners respondiendo a la misma tecla.

**Impacto**: Acciones duplicadas, comportamiento raro con el teclado, y la app se va poniendo más lenta.

---

### 🟠 9. Los Charts de Chart.js nunca se destruyen al salir del informe

**Archivo**: `src/pages/informe.js`

Se crean hasta 18 gráficos de golpe, y cuando sales de la página nunca se llama a `chart.destroy()`. Cada visita al informe deja 18 charts zombis en memoria.

**Impacto**: Con el tiempo, la app come más y más RAM. Si abres el informe muchas veces en una sesión, notarás que se ralentiza.

---

### 🟡 10. El `|| 1` en stats-calculator enmascara datos vacíos

```js
let totalRecepciones = recepciones.length || 1;
```

Si un jugador no tiene recepciones, en vez de mostrar "Sin datos", sale `0.0` como si fuera un dato real. Te puede confundir al analizar.

---

## Cosas que cambiaría aunque sea para ti solo

Estas no son bugs sino cosas que mejorarían tu experiencia de uso y harían la app más robusta. Las ordeno por impacto real en tu día a día.

### ⚡ 1. Partir `scouting.js` en trozos

Con 1.847 líneas es un infierno encontrar algo cuando quieres cambiar o debuggear. No tiene por qué ser una refactorización enorme — con separar en 3-4 archivos (video, acciones, timeline, estado) ya ganas mucho.

---

### ⚡ 2. Que el router limpie al cambiar de página

El router simplemente hace `content.innerHTML = ''` y carga la nueva página. Nunca llama a ninguna función de limpieza. Esto es la causa raíz de los memory leaks de listeners, charts y timers.

**Solución**: Que cada página pueda registrar una función `destroy()` que el router llame antes de navegar:

```js
// en el router
if (this.currentDestroy) this.currentDestroy();
content.innerHTML = '';
await this.routes[pageName](content, params);
```

---

### ⚡ 3. Poner índices en la base de datos

Es una línea por índice y las consultas por `partido_id` (que son las más frecuentes) van mucho más rápido:

```sql
CREATE INDEX IF NOT EXISTS idx_acciones_partido ON acciones(partido_id);
CREATE INDEX IF NOT EXISTS idx_acciones_jugador ON acciones(jugador_id);
```

---

### ⚡ 4. Un handler de errores global

Ahora mismo, si algo peta, la app se queda en blanco sin decirte nada. Con 5 líneas tienes al menos un aviso:

```js
window.addEventListener('unhandledrejection', e => {
    showToast(`Error: ${e.reason?.message || e.reason}`, 'error');
});
```

---

### ⚡ 5. Embeber la fuente Inter localmente

Ahora se carga de Google Fonts con `@import` en CSS. Si no tienes internet, la fuente no carga y todo se ve con la fuente por defecto del sistema. Descárgala y métela en `src/assets/fonts/`.

---

### ⚡ 6. `formatDate` que no explote con datos raros

```js
function formatDate(dateStr) {
    const date = new Date(dateStr);
    if (isNaN(date)) return 'Fecha desconocida';
    return date.toLocaleDateString('es-ES', ...);
}
```

---

### ⚡ 7. Envolver borrados multi-tabla en transacciones

```js
const borrarJugador = db.transaction((id) => {
    db.prepare('DELETE FROM acciones WHERE jugador_id = ?').run(id);
    db.prepare('DELETE FROM jugadores WHERE id = ?').run(id);
});
borrarJugador(id);
```

Si falla a mitad, se revierte todo automáticamente. better-sqlite3 lo soporta nativamente.

---

### ⚡ 8. Quitar los `console.log` de debug

En `scouting.js` → `setupAjustesEvents` hay ~15 `console.log` que ensucian la consola de DevTools y dificultan ver errores reales.

---

### ⚡ 9. Mover los archivos `test-*.js` fuera de la raíz

Son 4 scripts sueltos (`test-click.js`, `test-errors.js`, `test-ffmpeg.js`, `test-ffmpeg-filter.js`) que no aportan nada en la raíz del proyecto. Créate una carpeta `scripts/` o `dev/` y muévelos ahí. Especialmente `test-errors.js`, que si lo ejecutas sin querer **te modifica `renderer.js`**.

---

## Funcionalidades nuevas que podrías añadir

### 🏐 Para el scouting en vivo

| Funcionalidad | Qué te aportaría | Esfuerzo |
|---|---|---|
| **Control de velocidad de video** (0.25x–2x) | Ver jugadas en cámara lenta para analizar técnica. Esencial para scouting | 1-2 días |
| **Avance frame-by-frame** | Clavar el momento exacto de cada acción | 1 día |
| **Undo/Redo real** (con reversión de marcador) | Equivocarte ya no te cuesta 30 segundos de frustración | 1 día |
| **Registro por teclado completo** | Registrar una acción con 2-3 teclas en vez de 5 clicks. Podrías scoutear en tiempo real | 2-3 días |
| **Validación de reglas** (21pts, cambio campo cada 7) | Que la app te avise de cambio de campo, fin de set, etc. automáticamente | 2 días |
| **Autocompletado de jugadores** | Al crear partido, que sugiera jugadores que ya tienes en la BD | 1 hora |
| **Confirmación al salir con datos sin guardar** | Un "¿Estás seguro?" cuando navegas fuera de scouting sin guardar | 1 hora |

### 📊 Para los informes

| Funcionalidad | Qué te aportaría | Esfuerzo |
|---|---|---|
| **Exportar a PDF** (funcional y limpio) | Compartir informes con tu entrenador o compañero | 2-3 días |
| **Tablas ordenables** | Click en la cabecera para ordenar por columna | 1 día |
| **Filtros por jugador** | Ver las stats de un jugador específico sin el otro | 0.5 días |
| **Comparativa entre partidos** | Evolución de un jugador a lo largo de varios partidos | 2-3 días |
| **Heat map de zonas** | Ver en un campo visual dónde ataca/defiende más cada jugador | 2-3 días |
| **Exportar a Excel (.xlsx)** | Manipular datos en hojas de cálculo | 1-2 días |

### 🗂️ Para la gestión

| Funcionalidad | Qué te aportaría | Esfuerzo |
|---|---|---|
| **Foto de jugador** | Identificar rápido quién es quién | 0.5 días |
| **Campos extra de jugador** (altura, lateralidad, nacimiento) | Datos útiles para scouting | 1 hora |
| **Búsqueda y filtrado de jugadores** | Encontrar jugadores rápido cuando tengas muchos | 0.5 días |
| **Backup automático de la BD** | Copia de seguridad periódica para no perder datos | 0.5 días |
| **Importar/exportar base de datos** | Migrar datos a otro PC o hacer backups manuales | 0.5 días |
| **Estadísticas históricas por jugador** (cross-partido) | Ver la evolución de un jugador a lo largo de la temporada | 2-3 días |

---

## Ideas grandes a largo plazo

Estas son funcionalidades más ambiciosas que transformarían la app en algo mucho más potente:

### 🎯 1. Scouting con IA (detección automática de acciones)

Usar un modelo de visión por computador (tipo YOLO o MediaPipe) para detectar automáticamente jugadores, balón y tipo de acción en el video. No sustituiría al scouting manual pero podría **sugerirte** acciones que tú solo confirmas.

**Esfuerzo**: Grande (semanas), pero hay modelos preentrenados para deportes.

### 🌐 2. Versión web ligera para compartir informes

Un servidor local (o un export a HTML estático) que genere informes interactivos que puedas compartir con un enlace. El entrenador abre el enlace en su móvil y ve los gráficos sin instalar nada.

**Esfuerzo**: 1-2 semanas.

### 📱 3. Modo tablet/móvil para scoutear en la pista

Una PWA o versión responsive que puedas usar desde un iPad en el banquillo. El scouting en vivo desde la pista con una tablet es el workflow más común en voley profesional.

**Esfuerzo**: 2-4 semanas.

### 🔄 4. Sincronización entre dispositivos

Que puedas empezar a scoutear en el portátil y revisar los datos en otro PC. SQLite + un servicio de sync (o simplemente sincronizar el archivo .db con Dropbox/Drive).

**Esfuerzo**: 1-2 semanas.

### 📹 5. Generador de compilaciones de video automáticas

Seleccionar "todos los ataques de Pablo por zona 4 con calidad #" y que la app te genere un video concatenando esos clips automáticamente. Ya tienes FFmpeg integrado, solo falta la lógica de recorte y concatenación.

**Esfuerzo**: 1-2 semanas (la base con FFmpeg ya la tienes).

---

## Resumen: ¿Qué haría yo si fuera tú?

### Esta tarde (< 2 horas):
1. ✅ Corregir K1/K2 invertido (5 min)
2. ✅ Corregir undo para que revierta marcador (30 min)
3. ✅ Corregir mutación de objetos en stats-calculator (15 min)
4. ✅ Buscar jugador existente antes de crear duplicado (30 min)
5. ✅ Añadir `DELETE acciones` al borrar partido (5 min)
6. ✅ Handler de errores global (5 min)

### Esta semana:
7. 🔧 Cleanup en el router (que llame a destroy de cada página)
8. 🔧 Destruir Charts al salir del informe
9. 🔧 Limpiar event listeners de scouting al navegar
10. 🔧 Índices en la BD
11. 🔧 Mover test-*.js a una carpeta aparte

### Próximo mes:
12. 🚀 Control de velocidad de video
13. 🚀 Registro por teclado completo
14. 🚀 Undo/redo real con pila de acciones
15. 🚀 Exportar a PDF
16. 🚀 Partir scouting.js en módulos

### Cuando te aburras un finde:
17. 💡 Heat map de zonas
18. 💡 Comparativa entre partidos
19. 💡 Estadísticas históricas por jugador
20. 💡 Generador de compilaciones de video
