// pager.js - Paginador compartido del admin (< 1 2 3 ... >) con cambio suave.
// Uso: renderPager(el, { pagina (0-based), totalPaginas, onPage }) + swapSuave(tbody, pintar).

export function paginasVisibles(pagina, total) {
    const actual = pagina + 1;
    const set = new Set([1, 2, actual - 1, actual, actual + 1, total - 1, total]);
    const nums = [...set].filter(n => n >= 1 && n <= total).sort((a, b) => a - b);
    const out = [];
    let prev = 0;
    for (const n of nums) {
        if (n - prev > 1) out.push('…');
        out.push(n);
        prev = n;
    }
    return out;
}

export function renderPager(el, { pagina, totalPaginas, onPage }) {
    if (!el) return;
    if (!totalPaginas || totalPaginas <= 1) {
        el.innerHTML = '';
        el.setAttribute('hidden', '');
        return;
    }
    el.removeAttribute('hidden');
    el.innerHTML = '';

    const crear = (etiqueta, paginaDest, { deshabilitado = false, activo = false, titulo = '' } = {}) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'adm-pager-btn' + (activo ? ' is-active' : '');
        b.textContent = etiqueta;
        if (titulo) b.title = titulo;
        if (activo) b.setAttribute('aria-current', 'page');
        b.disabled = deshabilitado || activo;
        if (!b.disabled) b.addEventListener('click', () => onPage(paginaDest));
        return b;
    };

    el.appendChild(crear('‹', pagina - 1, { deshabilitado: pagina <= 0, titulo: 'Página anterior' }));
    for (const item of paginasVisibles(pagina, totalPaginas)) {
        if (item === '…') {
            const s = document.createElement('span');
            s.className = 'adm-pager-dots';
            s.textContent = '…';
            el.appendChild(s);
        } else {
            el.appendChild(crear(String(item), item - 1, { activo: item - 1 === pagina, titulo: 'Página ' + item }));
        }
    }
    el.appendChild(crear('›', pagina + 1, { deshabilitado: pagina >= totalPaginas - 1, titulo: 'Página siguiente' }));
}

// swapSuave: fundido de salida, pinta, fundido de entrada (no se ve brusco)
export function swapSuave(contenedor, pintar) {
    if (!contenedor) {
        pintar();
        return Promise.resolve();
    }
    contenedor.classList.add('is-fading');
    return new Promise(resolve => setTimeout(() => {
        pintar();
        void contenedor.offsetWidth;
        contenedor.classList.remove('is-fading');
        resolve();
    }, 170));
}
