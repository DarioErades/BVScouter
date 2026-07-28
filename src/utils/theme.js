// gestion de preferencias de tema (modo claro/oscuro + color de acento + densidad)

const STORAGE_KEY = 'bvscouter_prefs';

let activeMode = null; // 'playa' | 'pista' | null

export function setActiveThemeMode(mode) {
    activeMode = mode;
    applyPrefs();
}

export const ACCENT_PRESETS = [
    { name: 'Ámbar', value: '#f59e0b' },
    { name: 'Azul', value: '#3b82f6' },
    { name: 'Esmeralda', value: '#10b981' },
    { name: 'Violeta', value: '#8b5cf6' },
    { name: 'Rosa', value: '#ec4899' },
    { name: 'Rojo', value: '#ef4444' },
    { name: 'Cian', value: '#06b6d4' },
    { name: 'Lima', value: '#84cc16' }
];

const DEFAULT_PREFS = {
    theme: 'dark',       // 'dark' | 'light'
    accentPlaya: '#f59e0b', // Ámbar por defecto para Playa
    accentPista: '#3b82f6', // Azul por defecto para Pista
    density: 'normal',   // 'normal' | 'compact'
    fontScale: 'normal', // 'compact' | 'normal' | 'large'
    reduceMotion: false,
    videoSeekSeconds: 5,
    videoDefaultSpeed: 1,
    keybindings: {},
    keyAtaque: 'a',
    keyAcelerada: 'q'
};

export function getPrefs() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        let parsed = raw ? JSON.parse(raw) : {};
        const res = {
            ...DEFAULT_PREFS,
            ...parsed,
            accentPlaya: parsed.accentPlaya || parsed.accent || DEFAULT_PREFS.accentPlaya,
            accentPista: parsed.accentPista || DEFAULT_PREFS.accentPista
        };
        res.accent = activeMode === 'pista' ? res.accentPista : res.accentPlaya;
        return res;
    } catch (e) {
        const res = { ...DEFAULT_PREFS };
        res.accent = activeMode === 'pista' ? res.accentPista : res.accentPlaya;
        return res;
    }
}

export function savePrefs(newPrefs) {
    const current = getPrefs();
    const toSave = { ...current, ...newPrefs };
    if (newPrefs.accent !== undefined) {
        if (activeMode === 'pista') {
            toSave.accentPista = newPrefs.accent;
        } else {
            toSave.accentPlaya = newPrefs.accent;
            toSave.accent = newPrefs.accent; // fallback backward compat
        }
    }
    toSave.accent = activeMode === 'pista' ? toSave.accentPista : toSave.accentPlaya;
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    applyPrefs(toSave);
    return toSave;
}

function hexToRgb(hex) {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
    return {
        r: parseInt(full.slice(0, 2), 16),
        g: parseInt(full.slice(2, 4), 16),
        b: parseInt(full.slice(4, 6), 16)
    };
}

function shade(hex, percent) {
    const { r, g, b } = hexToRgb(hex);
    const t = percent < 0 ? 0 : 255;
    const p = Math.abs(percent);
    const nr = Math.round((t - r) * p) + r;
    const ng = Math.round((t - g) * p) + g;
    const nb = Math.round((t - b) * p) + b;
    return `#${[nr, ng, nb].map(x => x.toString(16).padStart(2, '0')).join('')}`;
}

export function applyPrefs(prefs = getPrefs()) {
    const root = document.documentElement;

    // modo claro/oscuro
    root.setAttribute('data-theme', prefs.theme);
    root.setAttribute('data-density', prefs.density);
    root.setAttribute('data-font-scale', prefs.fontScale || 'normal');
    root.setAttribute('data-reduce-motion', prefs.reduceMotion ? 'true' : 'false');

    // color de acento y derivados según modalidad
    const accent = activeMode === 'pista' 
        ? (prefs.accentPista || DEFAULT_PREFS.accentPista) 
        : (prefs.accentPlaya || prefs.accent || DEFAULT_PREFS.accentPlaya);
    
    const { r, g, b } = hexToRgb(accent);
    root.style.setProperty('--accent-primary', accent);
    root.style.setProperty('--accent-primary-hover', shade(accent, -0.15));
    root.style.setProperty('--accent-primary-glow', `rgba(${r}, ${g}, ${b}, 0.3)`);
    root.style.setProperty('--text-accent', accent);
    root.style.setProperty('--border-focus', accent);
    root.style.setProperty('--shadow-glow', `0 0 20px rgba(${r}, ${g}, ${b}, 0.15)`);
}

export function initTheme() {
    applyPrefs(getPrefs());
}
