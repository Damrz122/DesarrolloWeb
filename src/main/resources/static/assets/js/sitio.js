// sitio.js - Apariencia editable del home (hero, cards, equipos, banners, spotlight,
// colores, logo y nombre). Lee /api/sitio/publico y parchea el DOM. Si falla, queda lo estatico.

import { api } from './api.js?v=2';

const CACHE_KEY = 'electronix_sitio';
let cache = null;

export async function obtenerSitio() {
    if (cache) return cache;
    try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (raw) {
            cache = JSON.parse(raw);
            return cache;
        }
    } catch { /* sin cache */ }
    try {
        const res = await api.get('/api/sitio/publico');
        if (res.exito && res.datos) {
            cache = res.datos;
            try {
                sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
            } catch { /* almacenamiento lleno */ }
            return cache;
        }
    } catch (e) {
        console.warn('No se pudo cargar la apariencia del sitio:', e);
    }
    return {};
}

export function limpiarCacheSitio() {
    cache = null;
    try {
        sessionStorage.removeItem(CACHE_KEY);
    } catch { /* nada */ }
}

function leerJSON(cfg, clave, defecto) {
    try {
        const v = cfg[clave];
        if (!v) return defecto;
        const parsed = JSON.parse(v);
        return Array.isArray(parsed) ? parsed : defecto;
    } catch {
        return defecto;
    }
}

function esc(v) {
    return String(v ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function conSaltos(v) {
    return esc(v).replace(/\n/g, '<br>');
}

// Convierte #rrggbb a "r g b" para rgb(... / alpha). Si no es válido, usa el fallback.
function hexToRgb(v, fb) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(v || '').trim());
    if (!m) return fb;
    const n = parseInt(m[1], 16);
    return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

// Convierte links "compartir" de Google Drive a imagen directa.
// Así los bloques ya guardados con links de Drive empiezan a mostrarse sin re-guardar.
function normalizarDrive(url) {
    const v = String(url || '').trim();
    if (!v.includes('drive.google.com')) return v;
    const m = v.match(/\/file\/d\/([A-Za-z0-9_-]+)/) || v.match(/[?&]id=([A-Za-z0-9_-]+)/);
    if (m && m[1]) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1000`;
    return v;
}

// oscurece (pct negativo) o aclara un #rrggbb
function shade(hex, pct) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
    if (!m) return hex;
    const n = parseInt(m[1], 16);
    const t = pct < 0 ? 0 : 255;
    const p = Math.abs(pct) / 100;
    const r = Math.round(((n >> 16) & 255) + (t - ((n >> 16) & 255)) * p);
    const g = Math.round(((n >> 8) & 255) + (t - ((n >> 8) & 255)) * p);
    const b = Math.round((n & 255) + (t - (n & 255)) * p);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// icono: "" = sin icono, "<svg..." = svg directo, otro = url de imagen
function renderIcono(icono, clase) {
    const v = normalizarDrive(String(icono || '').trim());
    if (!v) return '';
    if (v.startsWith('<svg')) {
        return `<span class="${clase}" aria-hidden="true">${v}</span>`;
    }
    return `<span class="${clase}" aria-hidden="true"><img src="${esc(v)}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:contain" onerror="this.closest('span').style.display='none'"></span>`;
}

// logo: acepta ruta, URL o SVG pegado. Devuelve el nodo final.
export function pintarLogo(img, valor, nombre) {
    const v = normalizarDrive(String(valor || '').trim());
    if (!img) return img;
    if (v.startsWith('<svg') || v.startsWith('<SVG')) {
        const span = document.createElement('span');
        span.className = img.className;
        span.setAttribute('role', 'img');
        span.setAttribute('aria-label', nombre || 'Logo');
        span.innerHTML = v;
        img.replaceWith(span);
        return span;
    }
    if (img.tagName === 'IMG') {
        img.src = v || '/assets/img/logo.svg';
        img.alt = nombre || '';
    }
    return img;
}

function aplicarMarca(cfg) {
    const nombre = String(cfg['site.nombre'] || '').trim() || 'ELECTRONIX';
    const logo = String(cfg['site.logo'] || '').trim() || '/assets/img/logo.svg';
    document.title = `${nombre} — Tienda Oficial de Equipos Electrónicos`;
    document.querySelectorAll('.fx-brand > span').forEach(el => { el.textContent = nombre; });
    document.querySelectorAll('img.fx-brand-logo').forEach(img => pintarLogo(img, logo, nombre));
    const legal = document.querySelector('.fx-foot-legal > span');
    if (legal) legal.textContent = `Copyright © 2026 ${nombre}. Todos los derechos reservados.`;
}

function aplicarTema(cfg) {
    const primario = String(cfg['tema.primario'] || '').trim() || '#3564C9';
    const secundario = String(cfg['tema.secundario'] || '').trim() || '#000000';
    const oscuro = shade(primario, -18);
    const root = document.documentElement.style;
    ['--fx-blue', '--elx-teal-primary', '--elx-teal-accent',
     '--elx-teal-card-ofertas', '--elx-teal-card-vendidos', '--elx-teal-card-recom'
    ].forEach(v => root.setProperty(v, primario));
    ['--fx-blue-dark', '--elx-teal-primary-hover', '--elx-teal-accent-hover'].forEach(v => root.setProperty(v, oscuro));
    root.setProperty('--fx-blue-darker', shade(primario, -30));

    let st = document.getElementById('sitio-theme');
    if (!st) {
        st = document.createElement('style');
        st.id = 'sitio-theme';
        document.head.appendChild(st);
    }
    st.textContent = `
.fx-topbar{background:${secundario}!important}
.fx-hero{background:${secundario}!important}
.fx-btn{background:${primario}!important}
.elx-chat-header{background:linear-gradient(135deg, ${oscuro} 0%, ${primario} 100%)!important}
.elx-chat-send{background-color:${primario}!important}
.elx-chat-input:focus{border-color:${primario}!important}
.sitio-hero-cta{display:inline-block;margin-top:18px;padding:11px 30px;border-radius:999px;background:${primario};color:#fff!important;font-weight:700;font-size:.85rem;letter-spacing:.04em;text-decoration:none;box-shadow:0 8px 22px rgba(0,0,0,.35)}
.sitio-hero-cta:hover{filter:brightness(1.12)}`;
}

function pintarSlide(slides, i) {
    const s = slides[i];
    if (!s) return;
    const hero = document.querySelector('.fx-hero');
    const img = document.querySelector('.fx-hero-monitors');
    const big = document.getElementById('fx-hero-big');
    const sub = document.getElementById('fx-hero-sub');
    const contenido = document.querySelector('.fx-hero-content');
    if (!hero) return;

    const tipo = s.fondoTipo || 'imagen';
    if (tipo === 'imagen' && s.imagen) {
        // Precarga antes de cambiar: evita el flash de la foto anterior al recargar
        const url = normalizarDrive(s.imagen);
        const pedido = (pintarSlide._pedido = (pintarSlide._pedido || 0) + 1);
        const pre = new Image();
        pre.onload = () => {
            if (pedido !== pintarSlide._pedido || !document.querySelector('.fx-hero')) return;
            if (img) {
                img.src = url;
                img.style.display = '';
                img.onerror = () => { img.style.display = 'none'; };
            }
            hero.style.background = '';
        };
        pre.onerror = () => {
            if (pedido !== pintarSlide._pedido) return;
            if (img) img.style.display = 'none';
        };
        pre.src = url;
    } else if (tipo === 'degradado') {
        if (img) img.style.display = 'none';
        hero.style.background = `linear-gradient(135deg, ${s.fondoColor1 || '#000000'}, ${s.fondoColor2 || '#000000'})`;
    } else {
        if (img) img.style.display = 'none';
        hero.style.background = s.fondoColor1 || '#000000';
    }

    if (contenido) contenido.style.display = s.mostrarTexto === false ? 'none' : '';
    if (big) big.textContent = s.titulo || '';
    if (sub) sub.textContent = s.subtitulo || '';

    let cta = document.getElementById('sitio-hero-cta');
    if (s.textoBoton) {
        if (!cta && contenido) {
            cta = document.createElement('a');
            cta.id = 'sitio-hero-cta';
            cta.className = 'sitio-hero-cta';
            contenido.appendChild(cta);
        }
        if (cta) {
            cta.textContent = s.textoBoton;
            cta.href = s.linkUrl || '/productos.html';
        }
    } else if (cta) {
        cta.remove();
    }
}

function aplicarHero(cfg) {
    const slides = leerJSON(cfg, 'hero.slides', []);
    if (!slides.length || !document.querySelector('.fx-hero')) return;
    window.SITIO_HERO = slides.map(s => ({ big: s.titulo || '', sub: s.subtitulo || '' }));
    window.SITIO_HERO_APLICAR = i => pintarSlide(slides, i);
    pintarSlide(slides, 0);
}

function aplicarCards(cfg) {
    const box = document.querySelector('.fx-cards');
    const cards = leerJSON(cfg, 'home.cards', []);
    if (!box || !cards.length) return;
    box.innerHTML = '';
    cards.forEach(c => {
        const a = document.createElement('a');
        a.href = c.linkUrl || '/productos.html';
        a.className = 'fx-card';
        a.innerHTML = `
            <h2 class="fx-card-title">${esc(c.titulo)}</h2>
            <div class="fx-card-mid">
                ${renderIcono(c.icono, 'fx-card-icon')}
                <p class="fx-card-desc">${conSaltos(c.descripcion)}</p>
            </div>
            <span class="fx-btn">${esc(c.boton || 'Ver')}</span>`;
        box.appendChild(a);
    });
}

// Equipos de fábrica: se usan cuando aún no hay config guardada (evita dejar el esqueleto).
const EQUIPOS_DEFECTO = [
    { nombre: 'TELEVISORES', descripcion: 'Pantallas y monitores gamer', fondo: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&auto=format&fit=crop&q=80', producto: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500&auto=format&fit=crop&q=80', cta: 'Ver productos', categoria: 'Televisores' },
    { nombre: 'SMARTPHONES', descripcion: 'Última generación y accesorios', fondo: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80', producto: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=500&auto=format&fit=crop&q=80', cta: 'Ver productos', categoria: 'Smartphones' },
    { nombre: 'PORTATILES', descripcion: 'Ultralivianas, gamers y trabajo', fondo: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&auto=format&fit=crop&q=80', producto: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500&auto=format&fit=crop&q=80', cta: 'Ver productos', categoria: 'Laptops' },
    { nombre: 'EQUIPO DE SONIDO', descripcion: 'Audífonos, parlantes y más', fondo: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80', producto: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=500&auto=format&fit=crop&q=80', cta: 'Ver productos', categoria: 'Audio' },
    { nombre: 'ACCESORIOS Y PC', descripcion: 'Teclados, ratones y componentes', fondo: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80', producto: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500&auto=format&fit=crop&q=80', cta: 'Ver productos', categoria: 'Accesorios' }
];

// Render de capas del Estudio: posiciones absolutas en % (idéntico al canvas).
function htmlCapas(t, capas, fondoRaw, fondoColor, fallbackFondo, fondoBlur) {
    const blur = Number(fondoBlur) || 0;
    let bgStyle = fondoRaw
        ? `background-image:url('${fondoRaw.replace(/'/g, '%27')}')`
        : (fondoColor ? `background-color:${fondoColor}` : `background-image:url('${fallbackFondo}')`);
    if (blur > 0) {
        bgStyle += `;filter:blur(${blur}px);transform:scale(1.08)`;
    }
    const num = (v, fb) => (Number.isFinite(Number(v)) ? Number(v) : fb);
    const capasHtml = capas.map((c) => {
        const x = num(c.cx, 50), y = num(c.cy, 50), rot = num(c.rot, 0);
        if (c.tipo === 'imagen') {
            const src = normalizarDrive(c.src || '');
            if (!src) return '';
            const w = num(c.w, 80);
            const h = c.h == null ? null : num(c.h, 0);
            const st = [
                `left:${x}%`, `top:${y}%`, `width:${w}%`,
                h ? `height:${h}%` : 'height:auto',
                `transform:translate(-50%,-50%) rotate(${rot}deg)`,
            ].join(';');
            return `<img class="cap-layer cap-img" src="${esc(src)}" alt="" loading="lazy" style="${st}" onerror="this.remove()">`;
        }
        const size = num(c.size, 14);
        const w = num(c.w, 60);
        const sy = num(c.sy, 1);
        const align = ['left', 'center', 'right'].includes(c.align) ? c.align : 'left';
        const st = [
            `left:${x}%`, `top:${y}%`, `width:${w}%`,
            `font-size:${size}px`, `text-align:${align}`,
            `color:${esc(String(c.color || '#ffffff'))}`,
            `font-weight:${num(c.peso, 700)}`,
            'line-height:1.35', 'letter-spacing:0.02em',
            'white-space:pre-wrap', 'padding:0', 'margin:0',
            `transform:translate(-50%,-50%) rotate(${rot}deg)` + (sy !== 1 ? ` scale(1,${sy})` : ''),
        ].join(';');
        return `<span class="cap-layer cap-t" style="${st}">${esc(c.texto ?? '')}</span>`;
    }).join('');
    const titulo = capas.find((c) => c.id === 'titulo');
    const al = titulo && titulo.align === 'center' ? 'center' : (titulo && titulo.align === 'right' ? 'right' : 'left');
    const ctaStyle = al === 'center'
        ? 'left:50%;transform:translateX(-50%)'
        : (al === 'right' ? 'right:1.1rem' : 'left:1.1rem');
    return `
        <span class="elx-cat-bg" aria-hidden="true" style="${bgStyle.replace(/"/g, '&quot;')}"></span>
        <span class="elx-cat-veil" aria-hidden="true"></span>
        ${capasHtml}
        <span class="elx-cat-cta" style="${ctaStyle}">${esc(t.cta || 'Ver productos')}</span>`;
}

function aplicarEquipos(cfg) {
    const grid = document.getElementById('categorias-grid');
    if (!grid) return;
    // Sin config (o si falla la API) se pintan los de fábrica: nunca se deja el esqueleto.
    const guardados = leerJSON(cfg, 'home.equipos', []);
    const equipos = guardados.length ? guardados : EQUIPOS_DEFECTO;
    const titulo = String(cfg['home.equipos.titulo'] || '').trim();
    if (titulo) {
        const h = document.querySelector('#equipos .elx-section-title');
        if (h) h.textContent = titulo;
    }
    const fallbackFondo = 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=600&auto=format&fit=crop&q=80';
    grid.innerHTML = '';
    equipos.forEach(t => {
        try {
        // Compat: 'imagen' vieja -> fondo; 'icono' viejo con URL -> producto.
        // Sin URL de fondo se usa el color base (sin fallback que lo tape).
        const fondoRaw = normalizarDrive(t.fondo || t.imagen || '');
        const iconoRaw = String(t.icono || '').trim();
        const productoRaw = normalizarDrive(
            t.producto || (iconoRaw && !iconoRaw.startsWith('<svg') ? iconoRaw : '')
        );
        const fondoColor = String(t.fondoColor || '').trim();
        // Diseño por card (editor de posición): tamaños, posición, alineación y velo
        let d = {};
        try {
            d = typeof t.diseno === 'string' ? JSON.parse(t.diseno || '{}') : (t.diseno || {});
            if (!d || typeof d !== 'object') d = {};
        } catch { d = {}; }
        const num = (v, fb, min, max) => {
            const n = Number(v);
            if (!Number.isFinite(n)) return fb;
            return Math.min(max, Math.max(min, n));
        };
        // OJO: fondoBlur debe calcularse antes de usarse en la rama de capas (evita TDZ).
        const fondoBlur = num(d.fondoBlur, 0, 0, 12);
        // Capas del Estudio (canvas Fabric): si existen, mandan sobre el esquema viejo
        let capas = [];
        try {
            const v = t.capas;
            const arr = typeof v === 'string' ? JSON.parse(v || '[]') : (v || []);
            if (Array.isArray(arr)) capas = arr.filter((c) => c && c.id && (c.tipo === 'texto' || c.tipo === 'imagen'));
        } catch { capas = []; }
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'cat-tile elx-cat-tile elx-cat-card' + (capas.length ? ' elx-cat-card--capas' : '');
        b.dataset.name = t.categoria || t.nombre || '';
        b.style.setProperty('--velo', (num(d.velo, 62, 0, 95) / 100).toFixed(2));
        b.style.setProperty('--velo-hover', (num(d.veloHover, 32, 0, 95) / 100).toFixed(2));
        b.style.setProperty('--velo-rgb', hexToRgb(d.veloColor, '10 14 28'));
        if (capas.length) {
            b.innerHTML = htmlCapas(t, capas, fondoRaw, fondoColor, fallbackFondo, fondoBlur);
            grid.appendChild(b);
            return;
        }
        if (d.alinear === 'centro' || d.alinear === 'der' || d.alinear === 'izq') {
            b.dataset.alinear = d.alinear;
        }
        let bgStyle = fondoRaw
            ? `background-image:url('${fondoRaw.replace(/'/g, '%27')}')`
            : (fondoColor ? `background-color:${fondoColor}` : `background-image:url('${fallbackFondo}')`);
        if (fondoBlur > 0) {
            bgStyle += `;filter:blur(${fondoBlur}px);transform:scale(1.08)`;
        }
        const tituloTam = num(d.tituloTam, 0, 0, 100);
        const descTam = num(d.descTam, 0, 0, 100);
        const prodTam = num(d.prodTam, 82, 20, 200);
        const prodSX = num(d.prodSX, 1, 0.3, 2.5);
        const prodSY = num(d.prodSY, 1, 0.3, 2.5);
        const prodX = num(d.prodX, 0, -60, 60);
        const prodY = num(d.prodY, 0, -50, 50);
        const textoX = num(d.textoX, 0, -30, 30);
        const textoY = num(d.textoY, 0, -30, 30);
        const estiloNombre = [
            tituloTam ? `font-size:${tituloTam}px` : '',
            (textoX || textoY) ? `transform:translate(${textoX}%,${textoY}%)` : ''
        ].filter(Boolean).join(';');
        const estiloDesc = [
            descTam ? `font-size:${descTam}px` : '',
            (textoX || textoY) ? `transform:translate(${textoX}%,${textoY}%)` : ''
        ].filter(Boolean).join(';');
        b.innerHTML = `
            <span class="elx-cat-bg" aria-hidden="true" style="${bgStyle.replace(/"/g, '&quot;')}"></span>
            <span class="elx-cat-veil" aria-hidden="true"></span>
            <span class="elx-cat-name"${estiloNombre ? ` style="${estiloNombre}"` : ''}>${esc(t.nombre)}</span>
            <span class="elx-cat-desc"${estiloDesc ? ` style="${estiloDesc}"` : ''}>${esc(t.descripcion)}</span>
            ${productoRaw ? `<img class="elx-cat-product" src="${esc(productoRaw)}" alt="" loading="lazy" style="width:${prodTam}%;transform:translate(${prodX}%,${prodY}%) scale(${prodSX},${prodSY})" onerror="this.remove()">` : ''}
            <span class="elx-cat-cta">${esc(t.cta || 'Ver productos')}</span>`;
        grid.appendChild(b);
        } catch (err) {
            console.warn('Bloque de equipo inválido, se omite:', err, t);
        }
    });
}

function aplicarBanners(cfg) {
    const grid = document.querySelector('.elx-promo-grid');
    const banners = leerJSON(cfg, 'home.banners', []);
    if (!grid || !banners.length) return;
    const fallback = 'https://images.unsplash.com/photo-1547394765-185e1e68f34e?w=900&auto=format&fit=crop&q=80';
    grid.innerHTML = '';
    banners.slice(0, 2).forEach((b, i) => {
        const azul = (b.estilo || (i === 1 ? 'azul' : 'oscuro')) === 'azul';
        const div = document.createElement('div');
        div.className = azul ? 'elx-banner-small elx-banner-apple' : 'elx-banner-large elx-banner-apple';
        const tam = (v, min, max) => {
            const n = Number(v);
            return Number.isFinite(n) && n >= min && n <= max ? Math.round(n) : 0;
        };
        const etTam = tam(b.etiquetaTam, 8, 40);
        const tiTam = tam(b.tituloTam, 12, 80);
        const deTam = tam(b.descTam, 8, 40);
        const alinearIzq = b.textoAlinear === 'izq';
        div.innerHTML = `
            <div class="elx-banner-apple-text"${alinearIzq ? ' style="align-items:flex-start;text-align:left"' : ''}>
                <span class="elx-banner-tag${azul ? ' elx-banner-tag--light' : ''}"${etTam ? ` style="font-size:${etTam}px"` : ''}>${esc(b.etiqueta)}</span>
                <h3 class="elx-banner-title${azul ? ' elx-banner-title--sm' : ''}"${tiTam ? ` style="font-size:${tiTam}px"` : ''}>${esc(b.titulo)}</h3>
                ${b.descripcion ? `<p class="elx-banner-desc"${deTam ? ` style="font-size:${deTam}px"` : ''}>${esc(b.descripcion)}</p>` : ''}
                <a href="${esc(b.linkUrl || '/productos.html')}" class="${azul ? 'elx-banner-link elx-pill-btn elx-pill-btn--light' : 'elx-hero-btn elx-hero-btn--compact elx-pill-btn'}">${esc(b.boton || 'Ver más')}</a>
            </div>
            <img class="elx-banner-apple-img" src="${esc(normalizarDrive(b.imagen || fallback))}" alt="${esc(b.titulo)}" loading="lazy" onerror="this.style.display='none'">`;
        grid.appendChild(div);
    });
}

function aplicarSpotlight(cfg) {
    const track = document.getElementById('spot-track');
    const spots = leerJSON(cfg, 'home.spotlight', []);
    if (!track || !spots.length) return;
    track.innerHTML = '';
    spots.forEach(s => {
        const art = document.createElement('article');
        art.className = 'elx-spot-card';
        art.style.backgroundImage = `url('${normalizarDrive(s.imagen || '').replace(/'/g, '%27')}')`;
        art.innerHTML = `
            <span class="elx-spot-veil" aria-hidden="true"></span>
            <div class="elx-spot-top"><span class="elx-spot-kicker">${esc(s.kicker)}</span></div>
            <div class="elx-spot-bottom">
                <h3>${esc(s.titulo)}</h3>
                <p>${esc(s.descripcion)}</p>
                <a href="${esc(s.linkUrl || '/productos.html')}" class="elx-spot-btn">${esc(s.boton || 'Ver más')}</a>
            </div>`;
        track.appendChild(art);
    });
    const dots = document.getElementById('spot-dots');
    if (dots) dots.innerHTML = '';
}

export async function aplicarSitio() {
    const cfg = await obtenerSitio();
    if (!cfg || !Object.keys(cfg).length) return cfg;
    aplicarMarca(cfg);
    aplicarTema(cfg);
    aplicarHero(cfg);
    aplicarCards(cfg);
    aplicarEquipos(cfg);
    aplicarBanners(cfg);
    aplicarSpotlight(cfg);
    return cfg;
}
