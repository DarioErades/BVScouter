// Selector de secciones para exportar a PDF: cada bloque exportable lleva data-pdf-sec="id"
// (y opcionalmente data-pdf-label); el título se toma de su primer encabezado.
import { escapeHtml } from './helpers.js';

const SELECTOR_TITULO = '.report-section-title, .section-title, h2, h3';

export function seccionesPdf(raiz) {
    return [...raiz.querySelectorAll('[data-pdf-sec]')].map(el => ({
        id: el.dataset.pdfSec,
        label: (el.dataset.pdfLabel || el.querySelector(SELECTOR_TITULO)?.textContent || el.dataset.pdfSec).trim()
    }));
}

function leerDesmarcadas(clave) {
    try { return new Set(JSON.parse(localStorage.getItem(clave)) || []); } catch (e) { return new Set(); }
}

// Resuelve con un Set de ids elegidos, o null si se cancela. Se recuerdan las desmarcadas (no las
// marcadas) para que una sección nueva salga incluida por defecto.
export function elegirSeccionesPdf(raiz, clave) {
    const secciones = seccionesPdf(raiz);
    if (!secciones.length) return Promise.resolve(new Set());
    const desmarcadas = leerDesmarcadas(clave);

    return new Promise(resolve => {
        const ov = document.createElement('div');
        ov.className = 'modal-overlay';
        ov.innerHTML = `
            <div class="modal-card">
                <h3 class="modal-title">📄 Exportar PDF</h3>
                <p style="color: var(--text-secondary); margin: -8px 0 14px;">Elige qué módulos incluir:</p>
                <div style="display: grid; gap: 8px; max-height: 50vh; overflow-y: auto;">
                    ${secciones.map(s => `
                        <label style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; cursor: pointer;">
                            <input type="checkbox" data-sec="${escapeHtml(s.id)}" ${desmarcadas.has(s.id) ? '' : 'checked'} style="width: 18px; height: 18px;">
                            <span>${escapeHtml(s.label)}</span>
                        </label>`).join('')}
                </div>
                <div style="display: flex; gap: 8px; margin-top: 12px;">
                    <button class="btn btn-sm btn-secondary" data-todas="1">Todas</button>
                    <button class="btn btn-sm btn-secondary" data-todas="0">Ninguna</button>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" data-cancelar>Cancelar</button>
                    <button class="btn btn-primary" data-ok>Exportar PDF</button>
                </div>
            </div>`;
        document.body.appendChild(ov);

        const checks = () => [...ov.querySelectorAll('input[data-sec]')];
        const btnOk = ov.querySelector('[data-ok]');
        const actualizar = () => { btnOk.disabled = !checks().some(c => c.checked); };
        const cerrar = (valor) => { ov.remove(); resolve(valor); };

        ov.addEventListener('change', actualizar);
        ov.addEventListener('click', (e) => {
            const todas = e.target.closest('[data-todas]');
            if (todas) { checks().forEach(c => { c.checked = todas.dataset.todas === '1'; }); actualizar(); }
            else if (e.target === ov || e.target.closest('[data-cancelar]')) cerrar(null);
            else if (e.target.closest('[data-ok]')) {
                const elegidas = new Set(checks().filter(c => c.checked).map(c => c.dataset.sec));
                try { localStorage.setItem(clave, JSON.stringify(secciones.map(s => s.id).filter(id => !elegidas.has(id)))); } catch (err) { /* sin preferencia */ }
                cerrar(elegidas);
            }
        });
        actualizar();
    });
}

// Quita del árbol las secciones no elegidas y los saltos de página que quedan sobrando.
export function filtrarSeccionesPdf(raiz, elegidas) {
    raiz.querySelectorAll('[data-pdf-sec]').forEach(el => {
        if (!elegidas.has(el.dataset.pdfSec)) el.remove();
    });
    raiz.querySelectorAll('.page-break, .pdf-page-break').forEach(el => {
        let sig = el.nextElementSibling;
        while (sig && sig.tagName === 'SCRIPT') sig = sig.nextElementSibling;
        const antes = el.previousElementSibling;
        if (!sig || !antes || sig.matches('.page-break, .pdf-page-break, .footer')) el.remove();
    });
    return raiz;
}
