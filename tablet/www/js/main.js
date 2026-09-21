import { go } from './nav.js';
import './views/home.js';
import './views/setup.js';
import './views/lineup.js';
import './views/live.js';

// Dentro de la app de Android ocultamos la barra de estado para ganar pantalla.
try { window.Capacitor?.Plugins?.StatusBar?.hide?.(); } catch (e) { /* solo en nativo */ }

// La pantalla no debe apagarse durante un partido.
try { window.Capacitor?.Plugins?.KeepAwake?.keepAwake?.(); } catch (e) { /* solo en nativo */ }

// Botón "atrás" de Android: vuelve al inicio en vez de cerrar la app a mitad de partido.
try {
  window.Capacitor?.Plugins?.App?.addListener?.('backButton', () => {
    const sheet = document.querySelector('.overlay');
    if (sheet) sheet.remove(); else go('home');
  });
} catch (e) { /* solo en nativo */ }

go('home');
