// toast.js - Sistema de notificaciones flotantes
// Usa solo clases elx-* (output.css): las utilidades Tailwind no están
// compiladas en output.css y el CDN no carga en todas las páginas.

const ICONS = {
    success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"></path></svg>',
    error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fda4af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18L18 6M6 6l12 12"></path></svg>',
    warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>',
    info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1ca299" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
};

export function showToast(mensaje, tipo = 'info', duracion = 3500) {
    const permitidos = ['success', 'error', 'warning', 'info'];
    const kind = permitidos.includes(tipo) ? tipo : 'info';

    let contenedor = document.getElementById('toast-container');
    if (!contenedor) {
        contenedor = document.createElement('div');
        contenedor.id = 'toast-container';
        contenedor.className = 'elx-toast-container';
        document.body.appendChild(contenedor);
    }

    const toast = document.createElement('div');
    toast.className = `elx-toast elx-toast-${kind}`;
    toast.setAttribute('role', kind === 'error' ? 'alert' : 'status');

    const text = document.createElement('div');
    text.className = 'elx-toast-body';
    text.textContent = mensaje;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'elx-toast-close';
    closeBtn.setAttribute('aria-label', 'Cerrar notificación');
    closeBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18L18 6M6 6l12 12"></path></svg>';
    closeBtn.addEventListener('click', () => toast.remove());

    const iconWrap = document.createElement('span');
    iconWrap.innerHTML = ICONS[kind];
    iconWrap.className = 'elx-toast-icono';

    toast.appendChild(iconWrap);
    toast.appendChild(text);
    toast.appendChild(closeBtn);
    contenedor.appendChild(toast);

    // Animación de entrada
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.classList.add('elx-show');
        });
    });

    // Salida automática
    setTimeout(() => {
        toast.classList.remove('elx-show');
        setTimeout(() => toast.remove(), 350);
    }, duracion);
}
