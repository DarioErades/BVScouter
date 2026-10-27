// Utilidades de interfaz: iconos, escape HTML, toasts, hojas modales y guardado de archivos.
const PATHS = {
  ball: '<circle cx="12" cy="12" r="9"/><path d="M4 8.7c3.6 2.4 12.4 2.4 16 0"/><path d="M3.3 12h17.4"/><path d="M4 15.3c3.6-2.4 12.4-2.4 16 0"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  rotR: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  rotL: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  swap: '<path d="M7 4 3 8l4 4"/><path d="M3 8h14"/><path d="m17 20 4-4-4-4"/><path d="M21 16H7"/>',
  chart: '<path d="M4 20V11M10 20V4M16 20v-7M22 20H2"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  download: '<path d="M12 3v12m0 0-4-4m4 4 4-4M4 21h16"/>',
  upload: '<path d="M12 21V9m0 0-4 4m4-4 4 4M4 3h16"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4M12 13v4M8 21h8M10 17h4"/>',
  alert: '<path d="M12 3 2 20h20zM12 10v4M12 17.5v.01"/>',
  dots: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  flag: '<path d="M5 21V4m0 0h11l-2 4 2 4H5"/>',
  play: '<path d="m7 4 13 8-13 8z"/>',
  court: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 12h18M9 4v16M15 4v16"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
  file: '<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 13h6M9 17h6"/>',
  home: '<path d="m3 11 9-8 9 8M5 10v10h14V10"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'
};

export const icon = (name, size = 22) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${PATHS[name] || ''}</svg>`;

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- toasts ----------
export function toast(msg, tone = '') {
  let box = document.querySelector('.toasts');
  if (!box) {
    box = document.createElement('div');
    box.className = 'toasts';
    document.body.appendChild(box);
  }
  const t = document.createElement('div');
  t.className = `toast ${tone}`;
  t.innerHTML = msg;
  box.appendChild(t);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => t.remove(), 2200);
}

// ---------- hojas modales ----------
// openSheet devuelve { el, close, body }. `onMount(body, api)` engancha los eventos.
export function openSheet({ title = '', html = '', foot = '', full = false, center = false, onMount, onClose } = {}) {
  const ov = document.createElement('div');
  ov.className = `overlay${center ? ' center' : ''}`;
  ov.innerHTML = `<div class="sheet${full ? ' full' : ''}">
    ${title !== null ? `<div class="sheet-head"><h2>${title}</h2><button class="icon-btn" data-close aria-label="Cerrar">${icon('x')}</button></div>` : ''}
    <div class="sheet-body">${html}</div>
    ${foot ? `<div class="sheet-foot">${foot}</div>` : ''}
  </div>`;
  document.body.appendChild(ov);
  const api = {
    el: ov,
    body: ov.querySelector('.sheet-body'),
    close() { ov.remove(); onClose?.(); },
    setBody(h) { api.body.innerHTML = h; }
  };
  ov.addEventListener('click', (e) => {
    if (e.target === ov || e.target.closest('[data-close]')) api.close();
  });
  onMount?.(ov, api);
  return api;
}

export function confirmDlg({ title, msg = '', ok = 'Aceptar', cancel = 'Cancelar', danger = false }) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    openSheet({
      title, center: true, html: `<p class="muted" style="margin:0 0 4px;font-size:17px">${msg}</p>`,
      foot: `<button class="btn" data-no>${cancel}</button><button class="btn ${danger ? 'danger' : 'primary'}" data-yes>${ok}</button>`,
      onClose: () => finish(false),
      onMount: (ov, api) => {
        ov.querySelector('[data-yes]').onclick = () => { finish(true); api.close(); };
        ov.querySelector('[data-no]').onclick = () => api.close();
      }
    });
  });
}

// ---------- archivos ----------
export async function saveFile(name, text) {
  const cap = window.Capacitor;
  if (cap?.isNativePlatform?.()) {
    const { Filesystem, Share } = cap.Plugins;
    await Filesystem.writeFile({ path: name, data: text, directory: 'CACHE', encoding: 'utf8' });
    const { uri } = await Filesystem.getUri({ path: name, directory: 'CACHE' });
    await Share.share({ title: name, url: uri });
    return;
  }
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// PDF: en la tablet lo genera el plugin nativo Imprimir (diálogo de impresión de Android, con
// "Guardar como PDF"); en el navegador se imprime un iframe oculto.
export async function exportarPdf(nombre, html) {
  const plugin = window.Capacitor?.Plugins?.Imprimir;
  if (window.Capacitor?.isNativePlatform?.() && plugin) {
    await plugin.pdf({ nombre, html });
    return;
  }
  const f = document.createElement('iframe');
  f.style.cssText = 'position:fixed;width:1123px;height:794px;left:-10000px;top:0;border:0';
  document.body.appendChild(f);
  await new Promise((ok) => { f.onload = ok; f.srcdoc = html; });
  const prev = document.title;
  document.title = nombre;
  f.contentWindow.print();
  document.title = prev;
  setTimeout(() => f.remove(), 1000);
}

export const fmtDate = (d) => {
  try { return new Date(d + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return d || ''; }
};
