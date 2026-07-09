# BVScouter 🏐

¡Buenas! Este es **BVScouter**, un programa de scouting y análisis táctico para voley playa hecho con Electron, Vite y SQLite (better-sqlite3). 

La idea de la app es poder registrar todas las acciones de un partido (saques, recepciones, ataques, colocaciones, bloqueos y defensas) segundo a segundo mientras ves el vídeo, y luego sacar estadísticas guapas e informes en PDF.

## Características 🌟
- **Explorador estilo Google Drive:** Organiza todos tus partidos por carpetas. Puedes arrastrar y soltar los partidos dentro de las carpetas para tenerlo todo ordenado, y devolverlos a la raíz si te has equivocado.
- **Generador de Highlights de YouTube y Local:** Descarga automáticamente los partidos de YouTube (los cachea para no descargarlos dos veces) y los recorta usando `ffmpeg`.
- **Marcador en los vídeos:** Los vídeos recortados te salen con un marcador arriba a la derecha que se actualiza solo según el punto exacto en el que ocurrió la jugada.
- **Defensas Neutras:** Añadido soporte para registrar defensas que no puntúan en la media de efectividad pero sirven para seguir la jugada (con la tecla `,`).
- **Informes Estadísticos:** Gráficos interactivos de rendimiento de los jugadores, patrones de ataque/saque y progresión de puntos set a set.

## Requisitos 🛠️
Para poder usar la descarga de vídeos de YouTube, necesitas tener instalado:
- **ffmpeg** (se usa para recortar los clips de vídeo).
- **yt-dlp** (se usa para bajar los vídeos en local).

## Cómo ejecutar en desarrollo 💻

Primero, clona el repositorio y entra en la carpeta:
```bash
cd BVScouter
```

Instala todas las dependencias de Node:
```bash
npm install
```

Para arrancar el entorno de desarrollo con recarga rápida (HMR):
```bash
npm start
```

## Cómo compilar y empaquetar 📦

Si quieres generar el instalador para producción (`.deb` en el caso de Linux):
```bash
npm run make
```

El instalador compilado se guardará en la carpeta `out/make/`. Para instalarlo en tu sistema puedes hacer:
```bash
sudo dpkg -i out/make/deb/x64/bvscouter_1.0.0_amd64.deb
```
