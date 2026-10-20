import { api } from '/assets/js/api.js';
import { renderNavbar } from '/assets/js/ui/navbar.js';
import { aplicarSitio } from '/assets/js/sitio.js?v=5';

renderNavbar();

// sitio editable: aplica hero, cards, equipos, banners, colores y marca antes de bindear
await aplicarSitio();

function normalizar(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

const ALIAS_CATEGORIA = {
    'televisores': 'monitores',
    'laptops': 'laptops y computadoras',
    'portatiles': 'laptops y computadoras',
    'audio': 'audio y sonido',
    'equipo de sonido': 'audio y sonido',
    'accesorios': 'accesorios moviles',
    'accesorios y pc': 'accesorios moviles'
};

let categoriasCache = null;
async function obtenerCategorias() {
    if (categoriasCache) return categoriasCache;
    try {
        const res = await api.get('/api/categorias');
        if (res.exito && res.datos) {
            categoriasCache = res.datos;
            return categoriasCache;
        }
    } catch (e) {
        console.warn('No se pudieron cargar categorías para navegar:', e);
    }
    return [];
}

function resolverId(cats, buscado) {
    const n = normalizar(buscado);
    if (!n || !cats.length) return null;
    let hit = cats.find(c => normalizar(c.nombre) === n);
    if (hit) return hit.id;
    const alias = ALIAS_CATEGORIA[n];
    if (alias) {
        hit = cats.find(c => normalizar(c.nombre) === alias);
        if (hit) return hit.id;
    }
    hit = cats.find(c => normalizar(c.nombre).includes(n) || n.includes(normalizar(c.nombre).split(' ')[0]));
    return hit ? hit.id : null;
}

// Home: los tiles de categorías navegan a productos filtrada por categoriaId real
document.querySelectorAll('.cat-tile').forEach(tile => {
    tile.addEventListener('click', async () => {
        const nombre = tile.dataset.name || tile.dataset.categoria || '';
        const cats = await obtenerCategorias();
        const id = resolverId(cats, nombre);
        if (id) {
            window.location.href = `/productos.html?categoriaId=${id}`;
        } else if (nombre) {
            window.location.href = `/productos.html?categoria=${encodeURIComponent(nombre)}`;
        } else {
            window.location.href = '/productos.html';
        }
    });
});

// Reveal on scroll: crece un poquito al entrar en viewport (estilo Apple)
(function initReveal() {
    const sel = '.elx-cat-tile, .elx-banner-large, .elx-banner-small, .fx-card';
    const els = document.querySelectorAll(sel);
    if (!els.length) return;
    els.forEach(el => el.classList.add('elx-reveal'));
    if (!('IntersectionObserver' in window)) {
        els.forEach(el => el.classList.add('elx-visible'));
        return;
    }
    const io = new IntersectionObserver(entries => {
        entries.forEach(en => {
            if (en.isIntersecting) {
                en.target.classList.add('elx-visible');
                io.unobserve(en.target);
            }
        });
    }, { threshold: 0.15 });
    els.forEach(el => io.observe(el));
})();

// Carrusel spotlight infinito estilo Apple TV+: autoplay con dots de progreso.
// Bucle real: clona tarjetas a ambos lados; al salir la última entra la primera
// por detrás y el salto de vuelta es instantáneo e invisible.
(function initSpotlight() {
    const track = document.getElementById('spot-track');
    const dotsBox = document.getElementById('spot-dots');
    if (!track || !dotsBox) return;

    const AUTOPLAY_MS = 5000;
    const CLONES = 2; // tarjetas clonadas por lado para el bucle
    let realCount = 0;
    let first = 0; // índice extendido de la primera tarjeta real
    let pos = 0;   // índice extendido centrado actualmente
    let timer = null;
    let animating = false;
    let dots = [];

    const realCards = () => Array.from(track.querySelectorAll('.elx-spot-card:not([data-clon])'));
    const allCards = () => Array.from(track.querySelectorAll('.elx-spot-card'));
    const norm = p => ((p - first) % realCount + realCount) % realCount;

    function centerOf(el) {
        return el.offsetLeft - track.offsetLeft - (track.clientWidth - el.offsetWidth) / 2;
    }

    function buildLoop() {
        track.querySelectorAll('[data-clon]').forEach(n => n.remove());
        const real = realCards();
        realCount = real.length;
        if (!realCount) return false;
        const n = Math.min(CLONES, realCount);
        const firstReal = real[0];
        real.slice(-n).forEach(orig => {
            const c = orig.cloneNode(true);
            c.setAttribute('data-clon', 'pre');
            c.setAttribute('aria-hidden', 'true');
            c.tabIndex = -1;
            track.insertBefore(c, firstReal);
        });
        real.slice(0, n).forEach(orig => {
            const c = orig.cloneNode(true);
            c.setAttribute('data-clon', 'post');
            c.setAttribute('aria-hidden', 'true');
            c.tabIndex = -1;
            track.appendChild(c);
        });
        first = n;
        pos = first;
        buildDots();
        return true;
    }

    function buildDots() {
        dotsBox.innerHTML = '';
        for (let i = 0; i < realCount; i++) {
            const d = document.createElement('button');
            d.type = 'button';
            d.className = 'elx-spot-dot';
            d.setAttribute('role', 'tab');
            d.setAttribute('aria-label', 'Ir a la tarjeta ' + (i + 1));
            d.innerHTML = '<span></span>';
            d.addEventListener('click', () => goToReal(i, true));
            dotsBox.appendChild(d);
        }
        dots = Array.from(dotsBox.querySelectorAll('.elx-spot-dot'));
    }

    function paint() {
        const cur = norm(pos);
        dots.forEach((d, i) => {
            const isActive = i === cur;
            d.classList.toggle('active', isActive);
            d.classList.remove('playing');
            if (isActive) {
                // reinicia la animación de carga estilo Apple (keyframes)
                void d.offsetWidth;
                d.classList.add('playing');
            }
        });
    }

    function jumpTo(p) {
        const all = allCards();
        if (!all[p]) return;
        pos = p;
        track.scrollTo({ left: centerOf(all[p]), behavior: 'auto' });
    }

    function animateTo(p) {
        const all = allCards();
        if (!all[p]) return;
        pos = p;
        animating = true;
        track.scrollTo({ left: centerOf(all[p]), behavior: 'smooth' });
        paint();
        clearTimeout(animateTo._t);
        animateTo._t = setTimeout(() => { animating = false; }, 700);
    }

    function settle() {
        // si quedó en un clon, salta en seco a su gemela real (bucle invisible)
        if (pos < first) jumpTo(pos + realCount);
        else if (pos >= first + realCount) jumpTo(pos - realCount);
        paint();
    }

    function syncLoop() {
        const same = realCards().length === realCount && track.querySelector('[data-clon]');
        if (same) return true;
        const cur = realCount ? norm(pos) : 0;
        if (!buildLoop()) return false;
        pos = first + Math.min(cur, realCount - 1);
        jumpTo(pos);
        paint();
        return true;
    }

    function next() {
        if (!syncLoop()) return;
        const p = pos + 1;
        animateTo(p);
        if (p >= first + realCount) {
            // pasó la última: llega al clon y vuelve a la primera real sin animar
            setTimeout(() => { jumpTo(p - realCount); animating = false; }, 700);
        }
    }

    function goToReal(i, manual) {
        if (!syncLoop()) return;
        const cur = norm(pos);
        let diff = (i - cur + realCount) % realCount;
        if (diff > realCount / 2) diff -= realCount;
        animateTo(pos + diff);
        if (manual) restart();
    }

    function restart() {
        stop();
        timer = setInterval(next, AUTOPLAY_MS);
    }
    function stop() {
        if (timer) clearInterval(timer);
        timer = null;
    }

    // Scroll manual: detecta la tarjeta más centrada y normaliza clones
    let scrollT = null;
    track.addEventListener('scroll', () => {
        if (animating) return;
        clearTimeout(scrollT);
        scrollT = setTimeout(() => {
            if (!syncLoop()) return;
            const all = allCards();
            const mid = track.scrollLeft + track.clientWidth / 2;
            let best = pos, bestDist = Infinity;
            all.forEach((c, i) => {
                const center = c.offsetLeft - track.offsetLeft + c.offsetWidth / 2;
                const dist = Math.abs(center - mid);
                if (dist < bestDist) { bestDist = dist; best = i; }
            });
            if (best !== pos) {
                pos = best;
                animating = true;
                setTimeout(() => { settle(); animating = false; }, 120);
                paint();
                restart();
            }
        }, 160);
    }, { passive: true });

    track.addEventListener('pointerenter', stop);
    track.addEventListener('pointerleave', restart);
    track.addEventListener('touchstart', stop, { passive: true });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stop(); else restart();
    });

    function boot() {
        if (!buildLoop()) return;
        pos = first;
        // vista inicial: primera tarjeta pegada a la izquierda
        const all = allCards();
        track.scrollTo({ left: all[first].offsetLeft - track.offsetLeft, behavior: 'auto' });
        paint();
        restart();
    }

    if (realCards().length) boot();
    else {
        // Las tarjetas aún no se renderizaron: arranca cuando el track cambie.
        const obs = new MutationObserver(() => {
            if (realCards().length) { obs.disconnect(); boot(); }
        });
        obs.observe(track, { childList: true });
        setTimeout(() => obs.disconnect(), 10000);
    }
})();
