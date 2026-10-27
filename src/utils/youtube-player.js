// Reproductor de YouTube embebido, compartido entre el scouting de playa y el de pista.
// Guarda su estado a nivel de módulo: solo una pantalla de scouting está activa a la vez,
// igual que ocurría cuando cada archivo tenía su propia copia de estas variables.
let ytCurrentTime = 0;
let ytState = -1;
let ytMessageListener = null;
let ytPollInterval = null;
let ytReady = false;
let ytBlurListener = null;

function getIframe() {
    return document.getElementById('yt-iframe-player');
}

function postCommand(func, args = []) {
    const iframe = getIframe();
    if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
    }
}

// URL del embed con los parámetros que YouTube necesita para que la API funcione bien
// (controles visibles, reproducción en línea en móvil/tablet, y origen para el postMessage).
export function ytEmbedUrl(ytId) {
    return `https://www.youtube.com/embed/${ytId}?autoplay=1&enablejsapi=1&controls=1&playsinline=1&origin=${encodeURIComponent(location.origin)}`;
}

export function setupYoutubeTracking() {
    ytCurrentTime = 0;
    ytState = -1;
    ytReady = false;

    if (ytMessageListener) window.removeEventListener('message', ytMessageListener);
    if (ytPollInterval) clearInterval(ytPollInterval);

    ytMessageListener = (event) => {
        let data = event.data;
        if (typeof data === 'string') {
            try { data = JSON.parse(data); } catch (e) { return; }
        }
        if (!data || typeof data !== 'object') return;

        ytReady = true;
        if (data.info && typeof data.info.currentTime === 'number') {
            ytCurrentTime = data.info.currentTime;
        } else if (typeof data.currentTime === 'number') {
            ytCurrentTime = data.currentTime;
        }
        if (data.info && typeof data.info.playerState === 'number') {
            ytState = data.info.playerState;
        }
    };
    window.addEventListener('message', ytMessageListener);

    // Solo nos "suscribimos" (listening) hasta que el iframe responde; el reproductor
    // empuja solo currentTime/playerState. Mandar comandos antes de que cargue rompe sus controles.
    ytPollInterval = setInterval(() => {
        const iframe = getIframe();
        if (!iframe || !iframe.contentWindow) return;
        if (ytReady) {
            clearInterval(ytPollInterval);
            ytPollInterval = null;
            return;
        }
        try {
            iframe.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*');
        } catch (e) {
            // ignore
        }
    }, 500);

    // el iframe se queda con el foco del teclado y las teclas (P, atajos...) dejan de llegar a la app
    if (ytBlurListener) window.removeEventListener('blur', ytBlurListener);
    ytBlurListener = () => {
        setTimeout(() => {
            const iframe = getIframe();
            if (iframe && document.activeElement === iframe) window.focus();
        }, 0);
    };
    window.addEventListener('blur', ytBlurListener);
}

// Se llama al salir de la pantalla de scouting, para no dejar listeners colgados.
export function teardownYoutubeTracking() {
    if (ytMessageListener) {
        window.removeEventListener('message', ytMessageListener);
        ytMessageListener = null;
    }
    if (ytPollInterval) {
        clearInterval(ytPollInterval);
        ytPollInterval = null;
    }
    if (ytBlurListener) {
        window.removeEventListener('blur', ytBlurListener);
        ytBlurListener = null;
    }
}

export function toggleYoutubePlayPause() {
    if (ytState === 1) postCommand('pauseVideo');
    else postCommand('playVideo');
}

export function seekYoutubeBy(seconds) {
    postCommand('seekTo', [Math.max(0, ytCurrentTime + seconds), true]);
}

export function seekYoutubeTo(seconds) {
    postCommand('seekTo', [seconds, true]);
    postCommand('playVideo');
}

export function setYoutubeSpeed(speed) {
    postCommand('setPlaybackRate', [speed]);
}

export function getYoutubeCurrentTime() {
    if (!ytMessageListener) setupYoutubeTracking();
    return ytCurrentTime || 0;
}

export const isYoutubeIframePresent = () => !!getIframe();
