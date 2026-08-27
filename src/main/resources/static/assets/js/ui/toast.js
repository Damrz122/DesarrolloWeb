// toast.js - Sistema moderno de notificaciones flotantes

export function showToast(mensaje, tipo = 'info', duracion = 3500) {
    let contenedor = document.getElementById('toast-container');
    if (!contenedor) {
        contenedor = document.createElement('div');
        contenedor.id = 'toast-container';
        contenedor.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4';
        document.body.appendChild(contenedor);
    }

    const toast = document.createElement('div');
    toast.className = 'pointer-events-auto flex items-center p-4 rounded-xl shadow-2xl backdrop-blur-md transition-all duration-300 transform translate-y-4 opacity-0 border text-sm font-medium';

    let icono = '';
    let estilos = '';

    switch (tipo) {
        case 'success':
            estilos = 'bg-emerald-900/90 border-emerald-500/50 text-emerald-100';
            icono = `<svg class="w-5 h-5 mr-3 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
            break;
        case 'error':
            estilos = 'bg-rose-900/90 border-rose-500/50 text-rose-100';
            icono = `<svg class="w-5 h-5 mr-3 text-rose-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;
            break;
        case 'warning':
            estilos = 'bg-amber-900/90 border-amber-500/50 text-amber-100';
            icono = `<svg class="w-5 h-5 mr-3 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`;
            break;
        default:
            estilos = 'bg-slate-900/90 border-slate-700 text-slate-100';
            icono = `<svg class="w-5 h-5 mr-3 text-indigo-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
    }

    toast.className += ` ${estilos}`;
    toast.innerHTML = `
        ${icono}
        <div class="flex-1">${mensaje}</div>
        <button class="ml-3 text-white/60 hover:text-white transition-colors" onclick="this.parentElement.remove()">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
    `;

    contenedor.appendChild(toast);

    // Animación de entrada
    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-4', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
    });

    // Salida automática
    setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('translate-y-4', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, duracion);
}
