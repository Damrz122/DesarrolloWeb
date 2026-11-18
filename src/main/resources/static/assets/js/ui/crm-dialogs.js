// Teclado y foco consistentes para los diálogos CRM existentes, sin cambiar sus acciones.
const fondos = [...document.querySelectorAll('.adm-modal-backdrop')];
let activo = null, origen = null;
const enfocables = fondo => [...fondo.querySelectorAll('button, input, select, textarea, a[href], [tabindex="0"]')]
    .filter(e => !e.disabled && e.getClientRects().length);
fondos.forEach((fondo, indice) => {
    const dialogo = fondo.querySelector('.adm-modal');
    if (!dialogo) return;
    dialogo.setAttribute('role', 'dialog');
    dialogo.setAttribute('aria-modal', 'true');
    dialogo.tabIndex = -1;
    const titulo = dialogo.querySelector('h2, h3');
    if (titulo) {
        if (!titulo.id) titulo.id = `crm-dialogo-${indice}`;
        dialogo.setAttribute('aria-labelledby', titulo.id);
    }
    new MutationObserver(() => {
        const abierto = !fondo.classList.contains('hidden') && !fondo.hidden;
        if (abierto && activo !== fondo) {
            origen = document.activeElement;
            activo = fondo;
            (enfocables(fondo)[0] || dialogo).focus();
        } else if (!abierto && activo === fondo) {
            activo = null;
            if (origen?.isConnected) origen.focus();
        }
    }).observe(fondo, { attributes: true, attributeFilter: ['class', 'hidden'] });
});
document.addEventListener('keydown', e => {
    if (!activo) return;
    if (e.key === 'Escape') {
        e.preventDefault();
        const cierre = activo.querySelector('button[aria-label^="Cerrar"], .adm-close');
        if (cierre) cierre.click();
        else activo.classList.add('hidden');
    }
    if (e.key === 'Tab') {
        const elementos = enfocables(activo), primero = elementos[0], ultimo = elementos.at(-1);
        if (!primero) { e.preventDefault(); return; }
        if (e.shiftKey && (document.activeElement === primero || !activo.contains(document.activeElement))) {
            e.preventDefault(); ultimo.focus();
        } else if (!e.shiftKey && (document.activeElement === ultimo || !activo.contains(document.activeElement))) {
            e.preventDefault(); primero.focus();
        }
    }
});
