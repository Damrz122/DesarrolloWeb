import { api } from '/assets/js/api.js';
import { auth } from '/assets/js/auth.js';
import { showToast } from '/assets/js/ui/toast.js';

// Estudio visual con canvas real (Fabric.js vendida en /assets/js/vendor/).
// Título, subtítulo e imagen son objetos independientes con handles nativos:
// esquinas = proporcional, bordes = un eje, cuerpo = mover, vacío = deseleccionar.
const fabric = globalThis.fabric;
if (!fabric) {
    showToast('No se pudo cargar la librería de canvas', 'error');
    throw new Error('fabric UMD no disponible');
}

// Lienzo de diseño 1:1 con la card pública (240x360).
// OJO: estas constantes van antes de invocar initEstudio() (TDZ).
const W = 240;
const H = 360;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 3;

const estado = {
    equipos: [],
    idx: 0,
    vista: 'despues', // 'antes' | 'despues'
    sucio: false,
    d0: null,   // snapshot guardado (Antes): { capas, card }
    card: null, // props base del bloque: fondo, velo, cta...
};

let canvas = null;
let fondoObj = null;
let veloObj = null;
let ctaObj = null;

const $ = (s) => document.querySelector(s);

if (!auth.protegerRutaAdmin()) {
    // Guard: redirige al login si no hay admin
} else {
    // Superficie de error visible: si algo falla al iniciar, se muestra en el lienzo
    window.addEventListener('error', (ev) => {
        const wrap = document.getElementById('est-wrap');
        if (!wrap || wrap.dataset.errorMostrado) return;
        wrap.dataset.errorMostrado = '1';
        const msg = document.createElement('p');
        msg.className = 'adm-sub';
        msg.textContent = 'Error iniciando el Estudio: ' + (ev.message || 'desconocido') + ' — recarga la página.';
        wrap.prepend(msg);
    });
    initEstudio().catch((err) => {
        console.error(err);
        showToast('No se pudo iniciar el Estudio: ' + (err.message || err), 'error');
    });
}

const esTexto = (o) => !!o && typeof o.enterEditing === 'function' && (o.isType('textbox') || o.isType('i-text'));

function normalizarDrive(url) {
    const v = String(url || '').trim();
    if (!v.includes('drive.google.com')) return v;
    const m = v.match(/\/file\/d\/([A-Za-z0-9_-]+)/) || v.match(/[?&]id=([A-Za-z0-9_-]+)/);
    if (m && m[1]) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1000`;
    return v;
}

function hexToCss(hex, fb) {
    return /^#?[0-9a-f]{6}$/i.test(String(hex || '').trim()) ? String(hex).trim().replace(/^#?/, '#').toUpperCase() : fb;
}

// ---------- Geometría por defecto (calca el look actual del home) ----------
function geometriaDefecto(bloque) {
    return {
        titulo: { texto: bloque.nombre || 'NOMBRE', cx: 50, cy: 9, w: 85, size: 15, rot: 0, align: 'left' },
        sub: { texto: bloque.descripcion || 'Descripción', cx: 50, cy: 16.5, w: 70, size: 11, rot: 0, align: 'left' },
        prod: { src: normalizarDrive(bloque.producto || ''), cx: 50, cy: 55, w: 82, h: null, rot: 0 },
    };
}

// Migra el esquema viejo (diseno: prodTam/prodX/...) a capas (aproximado;
// el usuario lo afina en el estudio, para eso existe).
function migrarDisenoViejo(bloque) {
    const g = geometriaDefecto(bloque);
    let d = {};
    try {
        d = typeof bloque.diseno === 'string' ? JSON.parse(bloque.diseno || '{}') : (bloque.diseno || {});
        if (!d || typeof d !== 'object') d = {};
    } catch { d = {}; }
    const num = (v, fb) => (Number.isFinite(Number(v)) ? Number(v) : fb);
    if (d.tituloTam) g.titulo.size = num(d.tituloTam, 15);
    if (d.descTam) g.sub.size = num(d.descTam, 11);
    const al = { izq: 'left', centro: 'center', der: 'right' }[d.alinear] || 'left';
    g.titulo.align = al;
    g.sub.align = al;
    g.prod.w = Math.min(100, Math.max(5, num(d.prodTam, 82)));
    g.prod.cx = 50 + num(d.prodX, 0) * (g.prod.w / 100);
    g.prod.cy = 55 + num(d.prodY, 0) * 0.5;
    return g;
}

function propsCard(bloque) {
    let d = {};
    try {
        d = typeof bloque.diseno === 'string' ? JSON.parse(bloque.diseno || '{}') : (bloque.diseno || {});
        if (!d || typeof d !== 'object') d = {};
    } catch { d = {}; }
    const num = (v, fb, min, max) => {
        const n = Number(v);
        return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fb;
    };
    return {
        fondo: normalizarDrive(bloque.fondo || bloque.imagen || ''),
        fondoColor: String(bloque.fondoColor || '').trim() || '#111827',
        fondoBlur: num(d.fondoBlur, 0, 0, 12),
        velo: num(d.velo, 62, 0, 95),
        veloHover: num(d.veloHover, 32, 0, 95),
        veloColor: hexToCss(d.veloColor, '#0A0E1C'),
        cta: bloque.cta || 'Ver productos',
    };
}

// ---------- Factoría de objetos ----------
function bloquear(obj) {
    obj.set({
        selectable: false,
        evented: false,
        hasControls: false,
        hasBorders: false,
        lockMovementX: true,
        lockMovementY: true,
        lockRotation: true,
        lockScalingX: true,
        lockScalingY: true,
        lockSkewingX: true,
        lockSkewingY: true,
        hoverCursor: 'default',
    });
    obj.data = { ...(obj.data || {}), locked: true };
    return obj;
}

function estiloControles() {
    fabric.Object.prototype.set({
        transparentCorners: false,
        cornerColor: '#3b82f6',
        cornerStrokeColor: '#ffffff',
        cornerSize: 10,
        cornerStyle: 'rect',
        borderColor: '#3b82f6',
        borderScaleFactor: 2,
        padding: 4,
        rotatingPointOffset: 26,
    });
}

// Esquinas = proporcional (bordes = un eje, nativo).
// En v6 los controles viven por instancia (obj.controls), no en el prototipo.
function forzarEsquinasProporcionales(obj) {
    if (!obj || !obj.controls) return;
    ['tl', 'tr', 'bl', 'br'].forEach((k) => {
        const c = obj.controls[k];
        if (c) c.actionHandler = fabric.controlsUtils.scalingEqually;
    });
}

function crearTexto({ texto, cx, cy, w, size, rot, align, color, peso, id }) {
    const t = new fabric.Textbox(String(texto ?? ''), {
        left: (cx / 100) * W,
        top: (cy / 100) * H,
        originX: 'center',
        originY: 'center',
        width: Math.max(20, (w / 100) * W),
        fontFamily: 'Montserrat',
        fontSize: size,
        fontWeight: peso,
        fill: color,
        textAlign: align,
        lineHeight: 1.35,
        angle: rot,
        lockScalingFlip: true,
        lockSkewingX: true,
        lockSkewingY: true,
        editable: true,
        editingBorderColor: '#3b82f6',
    });
    t.data = { rol: 'texto', id: id || ('txt-' + Math.random().toString(36).slice(2, 7)) };
    forzarEsquinasProporcionales(t);
    return t;
}

function crearProducto({ src, cx, cy, w, h, rot }) {
    return fabric.Image.fromURL(src, { crossOrigin: 'anonymous' }).then((img) => {
        img.set({
            left: (cx / 100) * W,
            top: (cy / 100) * H,
            originX: 'center',
            originY: 'center',
            angle: rot,
            lockScalingFlip: true,
            lockSkewingX: true,
            lockSkewingY: true,
        });
        const targetW = (w / 100) * W;
        img.scaleToWidth(targetW);
        if (h) img.set({ scaleX: targetW / img.width, scaleY: ((h / 100) * H) / img.height });
        img.data = { rol: 'prod', id: 'prod', src };
        forzarEsquinasProporcionales(img);
        return img;
    }).catch(() => {
        // Si la imagen no carga, guía punteada para no bloquear la edición
        const r = new fabric.Rect({
            left: (cx / 100) * W,
            top: (cy / 100) * H,
            originX: 'center',
            originY: 'center',
            width: (w / 100) * W,
            height: 120,
            fill: 'rgba(255,255,255,0.08)',
            stroke: '#666',
            strokeDashArray: [6, 4],
            angle: rot,
            lockScalingFlip: true,
            lockSkewingX: true,
            lockSkewingY: true,
        });
        r.data = { rol: 'prod', id: 'prod', src, faltante: true };
        forzarEsquinasProporcionales(r);
        showToast('La imagen del producto no cargó (revisa la URL)', 'error');
        return r;
    });
}

function crearCta(texto, align) {
    // Home usa text-transform:uppercase + letter-spacing:.03em: el canvas debe medir
    // el mismo texto en mayúsculas o el pill sale más angosto/aplastado a los lados.
    const txt = String(texto || 'Ver productos').toUpperCase();
    const label = new fabric.IText(txt, {
        fontFamily: 'Montserrat',
        fontSize: 10.5,
        fontWeight: 800,
        fill: '#111111',
        originX: 'center',
        originY: 'center',
        editable: false,
        lineHeight: 1.2,
        charSpacing: 30,
        textAlign: 'center',
    });
    // El fondo va primero = queda detrás del texto dentro del grupo
    const g = new fabric.Group([
        new fabric.Rect({
            width: label.width + 28,
            height: label.height + 14,
            rx: 999, ry: 999,
            fill: '#ffffff',
            originX: 'center', originY: 'center',
        }),
        label,
    ], { originX: 'center', originY: 'center', angle: 0 });
    g.set({ left: W / 2, top: H - 26 });
    if (align === 'left') g.set({ left: 17.6 + g.getScaledWidth() / 2 });
    if (align === 'right') g.set({ left: W - 17.6 - g.getScaledWidth() / 2 });
    bloquear(g);
    g.data = { rol: 'cta' };
    return g;
}

// ---------- Construcción / serialización ----------
async function crearCapa(c) {
    if (!c) return null;
    if (c.tipo === 'imagen') {
        if (!c.src) return null;
        return crearProducto({
            src: c.src, cx: c.cx ?? 50, cy: c.cy ?? 55,
            w: c.w ?? 82, h: c.h ?? null, rot: c.rot ?? 0,
        });
    }
    const t = crearTexto({
        texto: c.texto ?? 'Texto', cx: c.cx ?? 50, cy: c.cy ?? 50,
        w: c.w ?? 60, size: c.size ?? 14, rot: c.rot ?? 0,
        align: c.align ?? 'center',
        color: c.color ?? '#ffffff', peso: c.peso ?? 700, id: c.id,
    });
    return t;
}

async function reconstruirTodo(capas, card) {
    canvas.clear();
    canvas.backgroundColor = card.fondoColor;
    fondoObj = null;
    veloObj = null;
    ctaObj = null;

    if (card.fondo) {
        try {
            const bg = await fabric.Image.fromURL(card.fondo, { crossOrigin: 'anonymous' });
            const s = Math.max(W / bg.width, H / bg.height);
            bg.set({ left: W / 2, top: H / 2, originX: 'center', originY: 'center', scaleX: s, scaleY: s });
            if (card.fondoBlur > 0) {
                try {
                    bg.filters = [new fabric.Image.filters.Blur({ blur: Math.min(1, card.fondoBlur / 12) })];
                    bg.applyFilters();
                } catch { /* preview sin blur: el home igual lo aplica por CSS */ }
            }
            bloquear(bg);
            bg.data = { rol: 'fondo' };
            fondoObj = bg;
            canvas.add(bg);
        } catch { /* sin fondo: queda el color base */ }
    }

    veloObj = new fabric.Rect({
        left: 0, top: 0, width: W, height: H,
        fill: card.veloColor, opacity: card.velo / 100,
    });
    bloquear(veloObj);
    veloObj.data = { rol: 'velo' };
    canvas.add(veloObj);

    // Orden fijo: producto, título, subtítulo, extras, CTA arriba
    const porId = Object.fromEntries((capas || []).filter((c) => c && c.id).map((c) => [c.id, c]));
    const enOrden = [
        porId.prod,
        porId.titulo,
        porId.sub,
        ...(capas || []).filter((c) => c && c.id !== 'prod' && c.id !== 'titulo' && c.id !== 'sub'),
    ].filter(Boolean);
    for (const c of enOrden) {
        const o = await crearCapa(c);
        if (o) canvas.add(o);
    }

    ctaObj = crearCta(card.cta, (porId.titulo && porId.titulo.align) || 'left');
    canvas.add(ctaObj);

    canvas.discardActiveObject();
    canvas.requestRenderAll();
    refrescarPanel();
}

function pct(n) {
    return Math.round(n * 10) / 10;
}

function serializar() {
    const capas = [];
    const card = { ...estado.card };
    canvas.getObjects().forEach((o) => {
        if (o.data && o.data.locked) return;
        const cx = pct((o.left / W) * 100);
        const cy = pct((o.top / H) * 100);
        const rot = Math.round((((o.angle || 0) % 360) + 360) % 360);
        if (o.data && o.data.rol === 'prod') {
            if (o.data.faltante && !o.data.src) return;
            const sx = o.scaleX || 1;
            const sy = o.scaleY || 1;
            capas.push({
                id: 'prod', tipo: 'imagen', src: o.data.src || '',
                cx, cy,
                w: pct((o.getScaledWidth() / W) * 100),
                h: Math.abs(sx - sy) < 0.02 ? null : pct((o.getScaledHeight() / H) * 100),
                rot,
            });
        } else if (esTexto(o)) {
            const sx = o.scaleX || 1;
            const sy = o.scaleY || 1;
            capas.push({
                id: o.data.id || ('txt-' + Math.random().toString(36).slice(2, 7)),
                tipo: 'texto',
                texto: o.text,
                cx, cy,
                w: pct((o.width / W) * 100),
                size: Math.max(6, Math.round((o.fontSize || 12) * sx)),
                rot,
                align: o.textAlign || 'left',
                color: o.fill,
                peso: o.fontWeight,
                sy: Math.round((sy / sx) * 1000) / 1000,
            });
        }
    });
    return {
        capas,
        velo: card.velo, veloHover: card.veloHover,
        veloColor: card.veloColor, fondoBlur: card.fondoBlur,
    };
}

// ---------- Carga ----------
function bloqueActual() {
    return estado.equipos[estado.idx] || {};
}

function leerCapas(bloque) {
    // Esquema nuevo tiene prioridad; si no, se migra el viejo al abrir.
    let arr = [];
    try {
        const v = bloque.capas;
        arr = typeof v === 'string' ? JSON.parse(v || '[]') : (v || []);
        if (!Array.isArray(arr)) arr = [];
    } catch { arr = []; }
    if (arr.length) return arr;
    const g = migrarDisenoViejo(bloque);
    return [
        { id: 'titulo', tipo: 'texto', texto: g.titulo.texto, cx: g.titulo.cx, cy: g.titulo.cy, w: g.titulo.w, size: g.titulo.size, rot: 0, align: g.titulo.align, color: '#ffffff', peso: 800, sy: 1 },
        { id: 'sub', tipo: 'texto', texto: g.sub.texto, cx: g.sub.cx, cy: g.sub.cy, w: g.sub.w, size: g.sub.size, rot: 0, align: g.sub.align, color: 'rgba(255,255,255,0.85)', peso: 500, sy: 1 },
        ...(g.prod.src ? [{ id: 'prod', tipo: 'imagen', src: g.prod.src, cx: g.prod.cx, cy: g.prod.cy, w: g.prod.w, h: null, rot: 0 }] : []),
    ];
}

function propsCardDe(bloque) {
    let d = {};
    try {
        d = typeof bloque.diseno === 'string' ? JSON.parse(bloque.diseno || '{}') : (bloque.diseno || {});
        if (!d || typeof d !== 'object') d = {};
    } catch { d = {}; }
    const num = (v, fb, min, max) => {
        const n = Number(v);
        return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fb;
    };
    return {
        fondo: normalizarDrive(bloque.fondo || bloque.imagen || ''),
        fondoColor: String(bloque.fondoColor || '').trim() || '#111827',
        fondoBlur: num(d.fondoBlur, 0, 0, 12),
        velo: num(d.velo, 62, 0, 95),
        veloHover: num(d.veloHover, 32, 0, 95),
        veloColor: hexToCss(d.veloColor, '#0A0E1C'),
        cta: bloque.cta || 'Ver productos',
    };
}

async function cargarBloque() {
    const b = bloqueActual();
    $('#est-bloque-nombre').textContent = b.nombre || 'Card';
    estado.card = propsCardDe(b);
    const capas = leerCapas(b);
    estado.d0 = JSON.parse(JSON.stringify({ capas, card: estado.card }));
    estado.vista = 'despues';
    estado.sucio = false;
    syncVista();
    await reconstruirTodo(capas, estado.card);
    marcarSucio(false);
}

// ---------- Panel lateral (complemento numérico en vivo) ----------
function objetoEditableSel() {
    const o = canvas ? canvas.getActiveObject() : null;
    if (!o || (o.data && o.data.locked)) return null;
    return o;
}

function nombreSel(o) {
    if (!o) return 'Nada seleccionado';
    if (o.data && o.data.rol === 'prod') return 'Imagen del producto';
    if (o.data && o.data.id === 'titulo') return 'Título';
    if (o.data && o.data.id === 'sub') return 'Subtítulo';
    return 'Texto';
}

function refrescarPanel() {
    const o = objetoEditableSel();
    $('#est-sel-nombre').textContent = nombreSel(o);
    const esT = esTexto(o);
    $('#est-texto-props').hidden = !esT;
    const ranges = { x: '#est-x', y: '#est-y', w: '#est-w', rot: '#est-rot', size: '#est-size' };
    if (!o) {
        Object.values(ranges).forEach((id) => { const el = $(id); if (el) el.disabled = true; });
        ['x', 'y', 'w', 'rot', 'size'].forEach((k) => {
            const val = document.querySelector(`[data-v-${k}]`);
            if (val) val.textContent = '—';
        });
    } else {
        const vals = {
            x: pct((o.left / W) * 100),
            y: pct((o.top / H) * 100),
            w: pct((o.getScaledWidth() / W) * 100),
            rot: Math.round(o.angle || 0),
            size: esT ? Math.round(o.fontSize || 12) : 0,
        };
        const sufs = { x: '%', y: '%', w: '%', rot: '°', size: 'px' };
        Object.entries(ranges).forEach(([k, id]) => {
            const el = $(id);
            const val = document.querySelector(`[data-v-${k}]`);
            if (k === 'size' && !esT) { if (el) el.disabled = true; if (val) val.textContent = '—'; return; }
            if (el) { el.disabled = false; if (document.activeElement !== el) el.value = vals[k]; }
            if (val) val.textContent = vals[k] + sufs[k];
        });
        if (esT) {
            document.querySelectorAll('#est-align [data-al]').forEach((x) => {
                x.classList.toggle('is-sel', x.dataset.al === (o.textAlign || 'left'));
            });
        }
    }
    const c = estado.card || {};
    const setCard = (id, vSel, vNum, suf) => {
        const r = $(id);
        const val = document.querySelector(`[data-v-${vSel}]`);
        if (val) val.textContent = vNum + suf;
        if (r && document.activeElement !== r) r.value = vNum;
    };
    setCard('#est-velo', 'velo', c.velo ?? 62, '%');
    setCard('#est-veloHover', 'veloHover', c.veloHover ?? 32, '%');
    const col = $('#est-veloColor');
    if (col && document.activeElement !== col) col.value = c.veloColor || '#0A0E1C';
    const hex = document.querySelector('[data-v-veloColor]');
    if (hex) hex.textContent = c.veloColor || '#0A0E1C';
    setCard('#est-fondoBlur', 'fondoBlur', c.fondoBlur ?? 0, 'px');
    const btn = $('#est-guardar');
    if (btn) btn.textContent = estado.sucio ? 'Guardar *' : 'Guardar';
}

function marcarSucio(v) {
    estado.sucio = v;
    const btn = $('#est-guardar');
    if (btn) btn.textContent = v ? 'Guardar *' : 'Guardar';
}

// ---------- Zoom / hover / guardado ----------
function aplicarZoom(z, punto) {
    z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
    canvas.zoomToPoint(punto || new fabric.Point(W / 2, H / 2), z);
    $('#est-zoom-nivel').textContent = Math.round(z * 100) + '%';
    canvas.requestRenderAll();
}

function syncVista() {
    document.querySelectorAll('[data-vista]').forEach((x) => x.classList.toggle('is-sel', x.dataset.vista === estado.vista));
}

function aplicarHover(activo) {
    if (!veloObj || !estado.card) return;
    const on = activo && $('#est-hover').checked;
    veloObj.set({ opacity: (on ? estado.card.veloHover : estado.card.velo) / 100 });
    canvas.requestRenderAll();
}

async function aplicarBlurFondo() {
    if (!fondoObj) return;
    try {
        const v = estado.card.fondoBlur || 0;
        fondoObj.filters = v > 0 ? [new fabric.Image.filters.Blur({ blur: Math.min(1, v / 12) })] : [];
        fondoObj.applyFilters();
        canvas.requestRenderAll();
    } catch { /* preview sin blur: el home igual lo aplica por CSS */ }
}

async function guardar() {
    const btn = $('#est-guardar');
    const s = serializar();
    const b = bloqueActual();
    // Parse seguro del diseño previo: un JSON corrupto no debe tumbar el guardado.
    let disenoPrevio = {};
    try {
        disenoPrevio = typeof b.diseno === 'string' ? JSON.parse(b.diseno || '{}') : (b.diseno || {});
        if (!disenoPrevio || typeof disenoPrevio !== 'object') disenoPrevio = {};
    } catch { disenoPrevio = {}; }
    // Solo capas válidas: evita guardar basura que luego rompa el home.
    const capasValidas = Array.isArray(s.capas)
        ? s.capas.filter((c) => c && c.id && (c.tipo === 'texto' || c.tipo === 'imagen'))
        : [];
    estado.equipos[estado.idx] = {
        ...b,
        capas: JSON.stringify(capasValidas),
        // Espejo legacy para lectores viejos
        imagen: b.fondo || b.imagen || '',
        icono: b.producto || '',
        diseno: JSON.stringify({
            ...disenoPrevio,
            velo: s.velo, veloHover: s.veloHover, veloColor: s.veloColor, fondoBlur: s.fondoBlur,
        }),
    };
    btn.disabled = true;
    btn.textContent = 'Guardando…';
    try {
        await api.put('/api/sitio', { 'home.equipos': JSON.stringify(estado.equipos) });
        try { sessionStorage.removeItem('electronix_sitio'); } catch { /* nada */ }
        estado.d0 = JSON.parse(JSON.stringify(s));
        estado.d0.card = { ...estado.card };
        estado.card && Object.assign(estado.card, {
            velo: s.velo, veloHover: s.veloHover, veloColor: s.veloColor, fondoBlur: s.fondoBlur,
        });
        marcarSucio(false);
        refrescarPanel();
        showToast('Diseño publicado correctamente', 'success');
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = estado.sucio ? 'Guardar *' : 'Guardar';
    }
}

// ---------- Init ----------
async function initEstudio() {
    estiloControles();
    canvas = new fabric.Canvas('est-canvas', {
        width: W,
        height: H,
        backgroundColor: '#111827',
        selection: false, // sin selección múltiple: click = un solo objeto
        preserveObjectStacking: true,
        enableRetinaScaling: true,
        stopContextMenu: true,
    });

    try {
        await Promise.race([
            Promise.all([
                document.fonts.load('800 15px Montserrat'),
                document.fonts.load('500 11px Montserrat'),
                document.fonts.load('700 14px Montserrat'),
            ]),
            new Promise((res) => setTimeout(res, 1500)),
        ]);
    } catch { /* fuentes del sistema como fallback */ }

    try {
        const res = await api.get('/api/sitio');
        if (res.exito && res.datos) {
            try {
                const arr = JSON.parse(res.datos['home.equipos'] || '[]');
                estado.equipos = Array.isArray(arr) ? arr : [];
            } catch { estado.equipos = []; }
        }
    } catch (err) {
        showToast('Error cargando bloques: ' + err.message, 'error');
    }
    if (!estado.equipos.length) {
        showToast('No hay bloques de equipos para editar', 'error');
        return;
    }

    // Deep-link ?bloque=<indice|nombre>
    const qp = new URLSearchParams(window.location.search);
    const qb = qp.get('bloque');
    if (qb != null && qb !== '') {
        const porIndice = Number(qb);
        if (Number.isInteger(porIndice) && estado.equipos[porIndice]) {
            estado.idx = porIndice;
        } else {
            const i = estado.equipos.findIndex(
                (x) => String(x.nombre || '').toLowerCase() === String(qb).toLowerCase()
            );
            if (i >= 0) estado.idx = i;
        }
    }

    const sel = $('#est-bloque');
    estado.equipos.forEach((b, i) => {
        const opt = document.createElement('option');
        opt.value = String(i);
        opt.textContent = b.nombre || `Bloque ${i + 1}`;
        sel.appendChild(opt);
    });
    sel.value = String(estado.idx);
    sel.addEventListener('change', async () => {
        if (estado.sucio && !confirm('Tienes cambios sin guardar. ¿Cambiar de bloque y perderlos?')) {
            sel.value = String(estado.idx);
            return;
        }
        estado.idx = Number(sel.value) || 0;
        await cargarBloque();
    });

    document.querySelectorAll('[data-vista]').forEach((b) => b.addEventListener('click', async () => {
        estado.vista = b.dataset.vista;
        syncVista();
        if (estado.vista === 'antes' && estado.d0) {
            await reconstruirTodo(estado.d0.capas || [], estado.d0.card || estado.card);
            marcarSucio(estado.sucio);
        } else {
            refrescarPanel();
        }
        canvas.requestRenderAll();
    }));

    // Hover en vivo sobre el lienzo
    const wrap = $('#est-wrap');
    wrap.addEventListener('mouseenter', () => aplicarHover(true));
    wrap.addEventListener('mouseleave', () => aplicarHover(false));

    // Zoom: rueda + botones
    canvas.on('mouse:wheel', (opt) => {
        const e = opt.e;
        e.preventDefault();
        e.stopPropagation();
        aplicarZoom(canvas.getZoom() * 0.999 ** e.deltaY, new fabric.Point(e.offsetX, e.offsetY));
    });
    $('#est-zoom-in').addEventListener('click', () => aplicarZoom(canvas.getZoom() * 1.25));
    $('#est-zoom-out').addEventListener('click', () => aplicarZoom(canvas.getZoom() / 1.25));

    // Selección -> panel (solo lectura del activo; un objeto por vez)
    const alSeleccionar = () => {
        const o = canvas.getActiveObject();
        if (o && !(o.data && o.data.locked)) forzarEsquinasProporcionales(o);
        refrescarPanel();
    };
    canvas.on('selection:created', alSeleccionar);
    canvas.on('selection:updated', alSeleccionar);
    canvas.on('selection:cleared', alSeleccionar);
    const alCambiar = () => {
        if (estado.vista !== 'despues') {
            estado.vista = 'despues';
            syncVista();
        }
        marcarSucio(true);
        refrescarPanel();
    };
    canvas.on('object:moving', alCambiar);
    canvas.on('object:scaling', alCambiar);
    canvas.on('object:rotating', alCambiar);
    canvas.on('object:modified', () => { marcarSucio(true); refrescarPanel(); });
    canvas.on('text:changed', () => { marcarSucio(true); });

    // + Texto / 🗑 / Supr
    $('#est-add-texto').addEventListener('click', () => {
        const t = crearTexto({
            texto: 'Texto nuevo', cx: 50, cy: 50, w: 60,
            size: 14, rot: 0, align: 'center', color: '#ffffff', peso: 700,
        });
        t.data = { ...t.data, id: 'txt-' + Math.random().toString(36).slice(2, 7) };
        canvas.add(t);
        canvas.setActiveObject(t);
        canvas.requestRenderAll();
        marcarSucio(true);
        refrescarPanel();
        t.enterEditing();
        try { t.selectAll(); } catch { /* nada */ }
    });
    const borrarSel = () => {
        const o = objetoEditableSel();
        if (!o) return;
        if (o.isEditing) return;
        canvas.remove(o);
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        marcarSucio(true);
        refrescarPanel();
    };
    $('#est-borrar').addEventListener('click', borrarSel);
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Delete' && e.key !== 'Backspace') return;
        const tag = String((document.activeElement && document.activeElement.tagName) || '').toLowerCase();
        if (['input', 'textarea', 'select'].includes(tag)) return;
        borrarSel();
    });

    // Panel numérico -> objeto activo
    const moverA = (fn) => {
        const o = objetoEditableSel();
        if (!o) return;
        fn(o);
        o.setCoords();
        canvas.requestRenderAll();
        marcarSucio(true);
        refrescarPanel();
    };
    $('#est-x').addEventListener('input', (e) => moverA((o) => o.set({ left: (Number(e.target.value) / 100) * W })));
    $('#est-y').addEventListener('input', (e) => moverA((o) => o.set({ top: (Number(e.target.value) / 100) * H })));
    $('#est-w').addEventListener('input', (e) => moverA((o) => {
        const targetW = (Number(e.target.value) / 100) * W;
        const cur = o.getScaledWidth() || 1;
        const f = targetW / cur;
        o.set({ scaleX: (o.scaleX || 1) * f, scaleY: (o.scaleY || 1) * f });
    }));
    $('#est-rot').addEventListener('input', (e) => moverA((o) => o.set({ angle: Number(e.target.value) })));
    $('#est-size').addEventListener('input', (e) => moverA((o) => {
        if (esTexto(o)) o.set({ fontSize: Number(e.target.value) });
    }));
    document.querySelectorAll('#est-align [data-al]').forEach((b) => b.addEventListener('click', () => {
        moverA((o) => {
            if (esTexto(o)) {
                o.set({ textAlign: b.dataset.al });
                document.querySelectorAll('#est-align [data-al]').forEach((x) => x.classList.toggle('is-sel', x === b));
            }
        });
    }));

    // Velo / fondo (nivel card)
    const veloA = (fn) => {
        fn();
        if (veloObj) veloObj.set({ fill: estado.card.veloColor, opacity: estado.card.velo / 100 });
        canvas.requestRenderAll();
        marcarSucio(true);
        refrescarPanel();
    };
    $('#est-velo').addEventListener('input', (e) => veloA(() => { estado.card.velo = Number(e.target.value); }));
    $('#est-veloHover').addEventListener('input', (e) => veloA(() => { estado.card.veloHover = Number(e.target.value); }));
    $('#est-veloColor').addEventListener('input', (e) => veloA(() => { estado.card.veloColor = String(e.target.value).toUpperCase(); }));
    $('#est-fondoBlur').addEventListener('change', async (e) => {
        estado.card.fondoBlur = Number(e.target.value);
        await aplicarBlurFondo();
        marcarSucio(true);
        refrescarPanel();
    });

    $('#est-guardar').addEventListener('click', guardar);

    await cargarBloque();
}
