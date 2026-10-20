import { api } from '/assets/js/api.js';
import { auth } from '/assets/js/auth.js';
import { showToast } from '/assets/js/ui/toast.js';

/*
 * El estudio guarda los mismos datos que consume sitio.js.  Cada tarjeta tiene
 * su propio canvas 240x360 (la medida real del home), por eso una modificación
 * se ve igual al publicarla y no como una maqueta diferente.
 */
const fabric = globalThis.fabric;
const W = 240;
const H = 360;
// Las capas se siguen guardando en el tamaño público (240×360), pero el
// editor pinta a 2× para que los textos y controles sean nítidos en pantalla.
const VIEW_SCALE = 1.5;
const PIXEL_SCALE = 2;
const VIEW_W = W * VIEW_SCALE;
const VIEW_H = H * VIEW_SCALE;
const RENDER_W = VIEW_W * PIXEL_SCALE;
const RENDER_H = VIEW_H * PIXEL_SCALE;
const CANVAS_SCALE = RENDER_W / W;
const BOARD_W = VIEW_W;
const BOARD_H = VIEW_H + 48;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 1.7;

const estado = {
    equipos: [],
    titulo: 'EQUIPOS ELECTRÓNICOS',
    contextos: [],
    activo: 0,
    categorias: [],
    modo: 'editar',
    vista: 'despues',
    sucio: false,
    zoom: 1,
    manoFija: false,
    manoTemporal: false,
};

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const copia = (v) => JSON.parse(JSON.stringify(v));
const pct = (v) => Math.round(Number(v || 0) * 10) / 10;

function normalizarDrive(url) {
    const v = String(url || '').trim();
    if (!v.includes('drive.google.com')) return v;
    const m = v.match(/\/file\/d\/([A-Za-z0-9_-]+)/) || v.match(/[?&]id=([A-Za-z0-9_-]+)/);
    return m && m[1] ? `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1000` : v;
}

function color(v, fallback) {
    return /^#?[0-9a-f]{6}$/i.test(String(v || '').trim())
        ? '#' + String(v).trim().replace('#', '').toUpperCase()
        : fallback;
}

function colorTexto(v, fallback) {
    const s = String(v || '').trim();
    if (/^#?[0-9a-f]{6}$/i.test(s)) return '#' + s.replace('#', '').toUpperCase();
    // Las capas existentes usan rgba() para los subtítulos; Fabric lo soporta.
    if (/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i.test(s)) return s;
    return fallback;
}

function numero(v, fallback, min = -Infinity, max = Infinity) {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}

function json(v, fallback) {
    try {
        const r = typeof v === 'string' ? JSON.parse(v || '') : v;
        return r && typeof r === 'object' ? r : fallback;
    } catch { return fallback; }
}

function geometriaDefecto(b) {
    return [
        { id: 'titulo', tipo: 'texto', texto: b.nombre || 'NOMBRE', cx: 50, cy: 9, w: 85, size: 15, rot: 0, align: 'left', color: '#FFFFFF', peso: 800, font: 'Montserrat', sy: 1 },
        { id: 'sub', tipo: 'texto', texto: b.descripcion || 'Descripción', cx: 50, cy: 16.5, w: 70, size: 11, rot: 0, align: 'left', color: '#D9DCE4', peso: 500, font: 'Montserrat', sy: 1 },
        ...(normalizarDrive(b.producto || b.icono || '') ? [{ id: 'prod', tipo: 'imagen', src: normalizarDrive(b.producto || b.icono), cx: 50, cy: 55, w: 82, h: null, rot: 0 }] : []),
    ];
}

function capasDe(b) {
    const arr = json(b.capas, []);
    if (Array.isArray(arr) && arr.length) {
        return arr.filter(c => c && c.id && (c.tipo === 'texto' || c.tipo === 'imagen'));
    }
    // Compatibilidad con el editor anterior.
    const d = json(b.diseno, {});
    const capas = geometriaDefecto(b);
    const prod = capas.find(c => c.id === 'prod');
    if (prod) {
        prod.w = numero(d.prodTam, 82, 5, 150);
        prod.cx = 50 + numero(d.prodX, 0, -60, 60) * (prod.w / 100);
        prod.cy = 55 + numero(d.prodY, 0, -50, 50) * .5;
    }
    const al = { izq: 'left', centro: 'center', der: 'right' }[d.alinear] || 'left';
    capas.filter(c => c.tipo === 'texto').forEach(c => { c.align = al; });
    const titulo = capas.find(c => c.id === 'titulo');
    const sub = capas.find(c => c.id === 'sub');
    if (titulo) titulo.size = numero(d.tituloTam, 15, 8, 56);
    if (sub) sub.size = numero(d.descTam, 11, 8, 56);
    return capas;
}

function botonDefecto(b, alinear) {
    const previo = json(b.boton, {});
    const centro = alinear === 'center';
    const derecha = alinear === 'right';
    return {
        texto: String(previo.texto || b.cta || 'Ver productos').slice(0, 50),
        // 1.1rem de margen público + centro del pill de fábrica (aproximado
        // con la anchura de «VER PRODUCTOS») para que no salte al guardar.
        cx: numero(previo.cx, centro ? 50 : (derecha ? 69 : 31), 0, 100),
        cy: numero(previo.cy, 92.8, 0, 100),
        escalaX: numero(previo.escalaX, 1, .2, 4),
        escalaY: numero(previo.escalaY, 1, .2, 4),
        rot: numero(previo.rot, 0, -180, 180),
        fontSize: numero(previo.fontSize, 10.5, 7, 30),
        fondo: color(previo.fondo, '#FFFFFF'),
        color: color(previo.color, '#111111'),
        radio: numero(previo.radio, 999, 0, 999),
        paddingX: numero(previo.paddingX, 14, 2, 60),
        paddingY: numero(previo.paddingY, 7, 2, 30),
        bordeColor: color(previo.bordeColor, '#FFFFFF'),
        borde: numero(previo.borde, 0, 0, 12),
        oculto: !!previo.oculto,
    };
}

function propsDe(b) {
    const d = json(b.diseno, {});
    const titulo = capasDe(b).find(c => c.id === 'titulo');
    return {
        fondo: normalizarDrive(b.fondo || b.imagen || ''),
        fondoColor: color(b.fondoColor, '#111827'),
        fondoBlur: numero(d.fondoBlur, 0, 0, 12),
        velo: numero(d.velo, 62, 0, 95),
        veloHover: numero(d.veloHover, 32, 0, 95),
        veloColor: color(d.veloColor, '#0A0E1C'),
        boton: botonDefecto(b, titulo && titulo.align),
    };
}

function bloquear(o) {
    o.set({ selectable: false, evented: false, hasControls: false, hasBorders: false, lockMovementX: true, lockMovementY: true, lockRotation: true, lockScalingX: true, lockScalingY: true });
    o.data = { ...(o.data || {}), fijo: true };
    return o;
}

function controles(o) {
    if (!o || !o.controls) return o;
    ['tl', 'tr', 'bl', 'br'].forEach(k => { if (o.controls[k]) o.controls[k].actionHandler = fabric.controlsUtils.scalingEqually; });
    o.set({ transparentCorners: false, cornerColor: '#58dfc8', cornerStrokeColor: '#10201e', cornerSize: 7, cornerStyle: 'circle', borderColor: '#58dfc8', padding: 2, lockScalingFlip: true, lockSkewingX: true, lockSkewingY: true });
    return o;
}

function crearTexto(c) {
    const o = new fabric.Textbox(String(c.texto ?? 'Texto'), {
        left: numero(c.cx, 50) * W / 100, top: numero(c.cy, 50) * H / 100,
        originX: 'center', originY: 'center', width: Math.max(12, numero(c.w, 60) * W / 100),
        fontFamily: c.font || 'Montserrat', fontSize: numero(c.size, 14, 6, 80),
        fontWeight: c.peso || 700, fill: colorTexto(c.color, '#FFFFFF'), opacity: numero(c.opacity, 1, 0, 1),
        textAlign: ['left', 'center', 'right'].includes(c.align) ? c.align : 'left',
        lineHeight: numero(c.lineHeight, 1.35, .5, 3), charSpacing: numero(c.charSpacing, 20, -200, 500),
        angle: numero(c.rot, 0, -360, 360), editable: true,
        flipX: !!c.flipX, flipY: !!c.flipY, visible: c.visible !== false,
    });
    if (c.sy && Number(c.sy) !== 1) o.scaleY = Number(c.sy);
    o.data = { rol: 'texto', id: c.id || ('txt-' + Math.random().toString(36).slice(2, 8)), bloqueado: !!c.bloqueado };
    aplicarBloqueo(o, !!c.bloqueado);
    return controles(o);
}

async function crearImagen(c) {
    const src = normalizarDrive(c.src || '');
    if (!src) return null;
    try {
        const img = await fabric.Image.fromURL(src, { crossOrigin: 'anonymous' });
        img.set({
            left: numero(c.cx, 50) * W / 100, top: numero(c.cy, 55) * H / 100,
            originX: 'center', originY: 'center', angle: numero(c.rot, 0, -360, 360),
            opacity: numero(c.opacity, 1, 0, 1), flipX: !!c.flipX, flipY: !!c.flipY, visible: c.visible !== false,
        });
        const targetW = numero(c.w, 82, 2, 200) * W / 100;
        img.scaleToWidth(targetW);
        if (c.h != null) img.scaleY = numero(c.h, 10, 1, 200) * H / 100 / img.height;
        img.data = { rol: 'imagen', id: c.id || ('img-' + Math.random().toString(36).slice(2, 8)), src, ajustes: { ...(c.ajustes || {}) }, bloqueado: !!c.bloqueado };
        await aplicarFiltros(img);
        aplicarBloqueo(img, !!c.bloqueado);
        return controles(img);
    } catch {
        const r = new fabric.Rect({ left: numero(c.cx, 50) * W / 100, top: numero(c.cy, 55) * H / 100, originX: 'center', originY: 'center', width: numero(c.w, 82) * W / 100, height: 90, fill: 'rgba(255,255,255,.08)', stroke: '#9ba3b5', strokeDashArray: [6, 4] });
        r.data = { rol: 'imagen', id: c.id || 'img', src, faltante: true, ajustes: {}, bloqueado: !!c.bloqueado };
        aplicarBloqueo(r, !!c.bloqueado);
        return controles(r);
    }
}

async function aplicarFiltros(o) {
    if (!o || o.data?.faltante || !o.applyFilters) return;
    const a = o.data.ajustes || {};
    // Fabric 6 expone los filtros en fabric.filters (versiones antiguas los
    // dejaban bajo fabric.Image.filters), por eso se admiten ambas versiones.
    const F = fabric.filters || (fabric.Image && fabric.Image.filters);
    if (!F) return;
    try {
        const fs = [];
        if (numero(a.brightness, 0, -100, 100)) fs.push(new F.Brightness({ brightness: numero(a.brightness, 0) / 100 }));
        if (numero(a.contrast, 0, -100, 100)) fs.push(new F.Contrast({ contrast: numero(a.contrast, 0) / 100 }));
        if (numero(a.saturation, 0, -100, 100)) fs.push(new F.Saturation({ saturation: numero(a.saturation, 0) / 100 }));
        if (numero(a.blur, 0, 0, 12)) fs.push(new F.Blur({ blur: numero(a.blur, 0) / 12 }));
        if (a.grayscale) fs.push(new F.Grayscale());
        if (a.sepia) fs.push(new F.Sepia());
        o.filters = fs;
        o.applyFilters();
    } catch { /* Una imagen externa sin CORS se sigue mostrando sin el filtro. */ }
}

function crearBoton(boton) {
    const b = { ...boton };
    const texto = new fabric.IText(String(b.texto || 'Ver productos').toUpperCase(), { originX: 'center', originY: 'center', fontFamily: 'Montserrat', fontSize: b.fontSize, fontWeight: 800, fill: b.color, charSpacing: 30, editable: false, selectable: false, evented: false });
    const ancho = texto.width + b.paddingX * 2;
    const alto = texto.height + b.paddingY * 2;
    // Fabric no limita rx/ry como CSS. Limitarlo a la mitad de la altura evita
    // que un radio 999 convierta el pill del editor en una elipse aplastada.
    const radio = Math.min(numero(b.radio, 999, 0, 999), alto / 2);
    const caja = new fabric.Rect({ width: ancho, height: alto, rx: radio, ry: radio, fill: b.fondo, stroke: b.borde ? b.bordeColor : undefined, strokeWidth: b.borde || 0, originX: 'center', originY: 'center', selectable: false, evented: false });
    const g = new fabric.Group([caja, texto], { left: b.cx * W / 100, top: b.cy * H / 100, originX: 'center', originY: 'center', angle: b.rot, scaleX: b.escalaX, scaleY: b.escalaY, visible: !b.oculto });
    g.data = { rol: 'boton', id: 'cta', boton: b };
    return controles(g);
}

function aplicarBloqueo(o, bloqueado) {
    if (!o) return;
    o.data = { ...(o.data || {}), bloqueado };
    o.set({ lockMovementX: bloqueado, lockMovementY: bloqueado, lockRotation: bloqueado, lockScalingX: bloqueado, lockScalingY: bloqueado, selectable: !bloqueado, evented: !bloqueado });
}

function etiqueta(o) {
    if (!o) return 'Nada seleccionado';
    if (o.data?.rol === 'boton') return 'Botón';
    if (o.data?.id === 'titulo') return 'Título';
    if (o.data?.id === 'sub') return 'Subtítulo';
    if (o.data?.rol === 'imagen') return 'Imagen';
    return 'Texto';
}

function serializarCapa(o) {
    const d = o.data || {};
    const base = { id: d.id, cx: pct(o.left / W * 100), cy: pct(o.top / H * 100), rot: pct(o.angle || 0), opacity: pct(o.opacity ?? 1), flipX: !!o.flipX, flipY: !!o.flipY, visible: o.visible !== false, bloqueado: !!d.bloqueado };
    if (d.rol === 'imagen') {
        const sx = o.scaleX || 1, sy = o.scaleY || 1;
        return { ...base, tipo: 'imagen', src: d.src || '', w: pct(o.getScaledWidth() / W * 100), h: Math.abs(sx - sy) < .02 ? null : pct(o.getScaledHeight() / H * 100), ajustes: { ...(d.ajustes || {}) } };
    }
    const sx = o.scaleX || 1, sy = o.scaleY || 1;
    return { ...base, tipo: 'texto', texto: o.text, w: pct(o.getScaledWidth() / W * 100), size: Math.max(6, Math.round((o.fontSize || 12) * sx)), align: o.textAlign || 'left', color: o.fill || '#FFFFFF', peso: o.fontWeight || 700, font: o.fontFamily || 'Montserrat', sy: pct(sy / sx), lineHeight: o.lineHeight || 1.35, charSpacing: o.charSpacing || 0 };
}

function guardarEnMemoria(ctx) {
    if (!ctx || !ctx.canvas) return;
    const capas = ctx.canvas.getObjects().filter(o => !['fondo', 'velo', 'boton'].includes(o.data?.rol)).map(serializarCapa);
    const cta = ctx.cta;
    if (cta) {
        ctx.card.boton = { ...(ctx.card.boton || {}), ...(cta.data?.boton || {}), cx: pct(cta.left / W * 100), cy: pct(cta.top / H * 100), escalaX: pct(cta.scaleX || 1), escalaY: pct(cta.scaleY || 1), rot: pct(cta.angle || 0), oculto: cta.visible === false };
    }
    const b = ctx.bloque;
    ctx.bloque = {
        ...b, capas: JSON.stringify(capas), cta: ctx.card.boton.texto || 'Ver productos', boton: ctx.card.boton,
        imagen: ctx.card.fondo || '', fondo: ctx.card.fondo || '', fondoColor: ctx.card.fondoColor,
        diseno: JSON.stringify({ ...json(b.diseno, {}), velo: ctx.card.velo, veloHover: ctx.card.veloHover, veloColor: ctx.card.veloColor, fondoBlur: ctx.card.fondoBlur }),
    };
    estado.equipos[ctx.i] = ctx.bloque;
}

function foto(ctx) {
    guardarEnMemoria(ctx);
    return { capas: capasDe(ctx.bloque), card: copia(ctx.card), categoria: ctx.bloque.categoria || '', categoriaId: ctx.bloque.categoriaId || '' };
}

function marcarSucio() {
    estado.sucio = true;
    $('#est-guardar').textContent = 'Guardar *';
}

function agregarHistorial(ctx) {
    if (!ctx || ctx.restaurando) return;
    const s = foto(ctx);
    const previo = ctx.historial[ctx.paso];
    if (previo && JSON.stringify(previo) === JSON.stringify(s)) return;
    ctx.historial = ctx.historial.slice(0, ctx.paso + 1);
    ctx.historial.push(copia(s));
    ctx.paso = ctx.historial.length - 1;
    marcarSucio();
    refrescarBarra();
}

async function pintarContexto(ctx, snap, seleccionarId = null) {
    if (!ctx) return;
    ctx.restaurando = true;
    if (Object.prototype.hasOwnProperty.call(snap, 'categoria')) ctx.bloque.categoria = snap.categoria || '';
    if (Object.prototype.hasOwnProperty.call(snap, 'categoriaId')) ctx.bloque.categoriaId = snap.categoriaId || '';
    ctx.card = copia(snap.card);
    ctx.canvas.clear();
    ctx.canvas.backgroundColor = ctx.card.fondoColor;
    ctx.fondo = null;
    ctx.velo = null;
    ctx.cta = null;
    if (ctx.card.fondo) {
        try {
            const bg = await fabric.Image.fromURL(ctx.card.fondo, { crossOrigin: 'anonymous' });
            const factor = Math.max(W / bg.width, H / bg.height);
            bg.set({ left: W / 2, top: H / 2, originX: 'center', originY: 'center', scaleX: factor, scaleY: factor });
            if (ctx.card.fondoBlur) {
                try {
                    const Blur = fabric.filters?.Blur || fabric.Image?.filters?.Blur;
                    if (Blur) { bg.filters = [new Blur({ blur: ctx.card.fondoBlur / 12 })]; bg.applyFilters(); }
                } catch { /* fallback CSS no necesario */ }
            }
            bg.data = { rol: 'fondo', id: 'fondo' };
            ctx.fondo = bloquear(bg);
            ctx.canvas.add(ctx.fondo);
        } catch { /* Se conserva el color base si falla la imagen. */ }
    }
    ctx.velo = bloquear(new fabric.Rect({ left: 0, top: 0, width: W, height: H, fill: ctx.card.veloColor, opacity: ctx.card.velo / 100 }));
    ctx.velo.data = { rol: 'velo', id: 'velo' };
    ctx.canvas.add(ctx.velo);
    for (const capa of snap.capas) {
        const o = capa.tipo === 'imagen' ? await crearImagen(capa) : crearTexto(capa);
        if (o) ctx.canvas.add(o);
    }
    ctx.cta = crearBoton(ctx.card.boton);
    ctx.canvas.add(ctx.cta);
    ctx.canvas.discardActiveObject();
    if (seleccionarId) seleccionar(ctx, seleccionarId);
    aplicarModoCanvas(ctx);
    ctx.canvas.requestRenderAll();
    ctx.restaurando = false;
}

function seleccionar(ctx, id) {
    const o = ctx.canvas.getObjects().find(x => x.data?.id === id || x.data?.rol === id);
    if (o) { ctx.canvas.setActiveObject(o); ctx.canvas.requestRenderAll(); }
}

function contextoActivo() { return estado.contextos[estado.activo] || null; }
function objetoActivo(ctx = contextoActivo()) {
    const o = ctx?.canvas?.getActiveObject();
    return o && !o.data?.fijo ? o : null;
}

function manoActiva() { return estado.manoFija || estado.manoTemporal; }

function actualizarMano() {
    const activa = manoActiva();
    $('#est-wrap')?.classList.toggle('is-hand', activa);
    $$('.est-tool[data-tool]').forEach(b => {
        b.classList.toggle('is-active', b.dataset.tool === (activa ? 'mano' : 'seleccionar'));
    });
    estado.contextos.forEach(aplicarModoCanvas);
    $('#est-status').textContent = activa
        ? 'Mano activa: arrastra para recorrer la vista · V para seleccionar'
        : (estado.modo === 'editar' ? 'Arrastra elementos o selecciona una capa' : 'Haz clic en una tarjeta para probar su destino');
}

function activarMano(fija) {
    estado.manoFija = fija;
    estado.manoTemporal = false;
    actualizarMano();
}

function campoEnEdicion() {
    const activo = document.activeElement;
    if (activo?.matches?.('input, textarea, select, [contenteditable="true"]')) return true;
    return !!contextoActivo()?.canvas?.getActiveObject()?.isEditing;
}

function aplicarModoCanvas(ctx) {
    const editar = estado.modo === 'editar' && estado.vista === 'despues' && !manoActiva();
    ctx.canvas.skipTargetFind = !editar;
    ctx.canvas.selection = false;
    ctx.contenedor.classList.toggle('is-preview', !editar);
    if (!editar) ctx.canvas.discardActiveObject();
    ctx.canvas.requestRenderAll();
}

function aplicarHover(ctx, encendido) {
    if (!ctx?.velo) return;
    const simular = $('#est-hover').checked;
    ctx.velo.set({ opacity: ((encendido && simular) ? ctx.card.veloHover : ctx.card.velo) / 100 });
    ctx.canvas.requestRenderAll();
}

function activarContexto(i, id = null) {
    if (!estado.contextos[i]) return;
    estado.activo = i;
    estado.contextos.forEach(c => c.contenedor.classList.toggle('is-active', c.i === i));
    $$('#est-card-switcher .est-card-tab').forEach(b => b.classList.toggle('is-active', Number(b.dataset.card) === i));
    const sel = $('#est-bloque');
    if (sel) sel.value = String(i);
    if (id) seleccionar(estado.contextos[i], id);
    refrescarPanel();
}

function valor(id, v, suf = '') {
    const x = document.querySelector(`[data-v-${id}]`);
    if (x) x.textContent = v == null ? '—' : v + suf;
}

function refrescarBarra() {
    const c = contextoActivo();
    $('#est-undo').disabled = !c || c.paso <= 0;
    $('#est-redo').disabled = !c || c.paso >= c.historial.length - 1;
}

function refrescarPanel() {
    const ctx = contextoActivo();
    if (!ctx) return;
    const card = ctx.card;
    $('#est-section-title').textContent = estado.titulo;
    $('#est-board-title').textContent = estado.titulo;
    $('#est-fondo-url').value = card.fondo || '';
    $('#est-fondo-color').value = card.fondoColor;
    $('#est-veloColor').value = card.veloColor;
    $('#est-velo').value = card.velo; valor('velo', card.velo, '%');
    $('#est-veloHover').value = card.veloHover; valor('veloHover', card.veloHover, '%');
    $('#est-fondoBlur').value = card.fondoBlur; valor('fondoBlur', card.fondoBlur, 'px');
    const o = objetoActivo(ctx);
    $('#est-sel-nombre').textContent = etiqueta(o);
    const habilitar = !!o && estado.modo === 'editar' && estado.vista === 'despues';
    ['est-x', 'est-y', 'est-w', 'est-rot', 'est-opacity', 'est-flip-x', 'est-flip-y', 'est-front'].forEach(id => { const e = $('#' + id); if (e) e.disabled = !habilitar; });
    if (o) {
        const datos = { x: pct(o.left / W * 100), y: pct(o.top / H * 100), w: pct(o.getScaledWidth() / W * 100), rot: Math.round(o.angle || 0), opacity: Math.round((o.opacity ?? 1) * 100) };
        [['x', '%'], ['y', '%'], ['w', '%'], ['rot', '°'], ['opacity', '%']].forEach(([k, s]) => { $('#' + `est-${k}`).value = datos[k]; valor(k, datos[k], s); });
    } else ['x', 'y', 'w', 'rot', 'opacity'].forEach(k => valor(k, null));
    const texto = o?.data?.rol === 'texto';
    const imagen = o?.data?.rol === 'imagen';
    const boton = o?.data?.rol === 'boton';
    $('#est-texto-props').hidden = !texto;
    $('#est-image-props').hidden = !imagen;
    $('#est-button-props').hidden = !boton;
    if (texto) {
        $('#est-texto').value = o.text || ''; $('#est-font').value = o.fontFamily || 'Montserrat';
        $('#est-texto-color').value = color(o.fill, '#FFFFFF'); $('#est-size').value = o.fontSize || 14; valor('size', o.fontSize || 14, 'px');
        $$('#est-align [data-al]').forEach(x => x.classList.toggle('is-sel', x.dataset.al === (o.textAlign || 'left')));
    }
    if (imagen) {
        const a = o.data.ajustes || {};
        $('#est-imagen-url').value = o.data.src || '';
        [['brightness', 0, ''], ['contrast', 0, ''], ['saturation', 0, ''], ['imgBlur', 0, 'px']].forEach(([k, fb, s]) => { const v = k === 'imgBlur' ? numero(a.blur, fb) : numero(a[k], fb); $('#' + `est-${k}`).value = v; valor(k, v, s); });
        $('#est-grayscale').classList.toggle('is-sel', !!a.grayscale); $('#est-sepia').classList.toggle('is-sel', !!a.sepia);
    }
    if (boton) {
        const b = ctx.card.boton;
        $('#est-cta-texto').value = b.texto || ''; $('#est-cta-fondo').value = b.fondo; $('#est-cta-color').value = b.color; $('#est-cta-borde-color').value = b.bordeColor; $('#est-cta-borde').value = b.borde; $('#est-cta-radius').value = b.radio; valor('ctaBorde', b.borde, 'px'); valor('radius', b.radio, 'px');
        const selected = String(ctx.bloque.categoriaId || '');
        $('#est-cta-categoria').value = selected;
    }
    pintarCapas(ctx);
    refrescarBarra();
}

function pintarCapas(ctx) {
    const box = $('#est-layers');
    const activo = objetoActivo(ctx);
    const objs = ctx.canvas.getObjects().filter(o => !['fondo', 'velo'].includes(o.data?.rol)).reverse();
    box.innerHTML = '';
    objs.forEach(o => {
        const d = o.data || {};
        const el = document.createElement('div');
        el.className = 'est-layer' + (activo === o ? ' is-selected' : '');
        el.innerHTML = `<i>${d.rol === 'imagen' ? '▧' : d.rol === 'boton' ? '▰' : 'T'}</i><span>${etiqueta(o)}</span><button type="button" data-layer-visible title="Mostrar u ocultar">${o.visible === false ? '○' : '◉'}</button><button type="button" data-layer-lock title="Bloquear">${d.bloqueado ? '⌧' : '⌑'}</button><button type="button" data-layer-up title="Subir capa">↑</button><button type="button" data-layer-down title="Bajar capa">↓</button>`;
        el.addEventListener('click', () => { activarContexto(ctx.i); ctx.canvas.setActiveObject(o); ctx.canvas.requestRenderAll(); refrescarPanel(); });
        el.querySelector('[data-layer-visible]').addEventListener('click', e => { e.stopPropagation(); o.set({ visible: o.visible === false }); if (d.rol === 'boton') ctx.card.boton.oculto = o.visible === false; ctx.canvas.requestRenderAll(); agregarHistorial(ctx); refrescarPanel(); });
        el.querySelector('[data-layer-lock]').addEventListener('click', e => { e.stopPropagation(); aplicarBloqueo(o, !d.bloqueado); ctx.canvas.discardActiveObject(); agregarHistorial(ctx); refrescarPanel(); });
        el.querySelector('[data-layer-up]').addEventListener('click', e => { e.stopPropagation(); moverCapa(ctx, o, 1); });
        el.querySelector('[data-layer-down]').addEventListener('click', e => { e.stopPropagation(); moverCapa(ctx, o, -1); });
        box.appendChild(el);
    });
}

function moverCapa(ctx, o, dir) {
    if (o.data?.rol === 'boton') return;
    const editables = ctx.canvas.getObjects().filter(x => !['fondo', 'velo', 'boton'].includes(x.data?.rol));
    const p = editables.indexOf(o);
    const destino = Math.max(0, Math.min(editables.length - 1, p + dir));
    if (p === destino) return;
    const obj = editables.splice(p, 1)[0]; editables.splice(destino, 0, obj);
    const fijos = ctx.canvas.getObjects().filter(x => ['fondo', 'velo'].includes(x.data?.rol));
    ctx.canvas._objects = [...fijos, ...editables, ctx.cta];
    ctx.canvas.requestRenderAll(); agregarHistorial(ctx); refrescarPanel();
}

function modificarSeleccion(fn, guardar = false) {
    const ctx = contextoActivo(); const o = objetoActivo(ctx);
    if (!ctx || !o) return;
    fn(o, ctx); o.setCoords(); ctx.canvas.requestRenderAll(); marcarSucio(); refrescarPanel();
    if (guardar) agregarHistorial(ctx);
}

async function rehacerBoton(ctx) {
    const snap = foto(ctx);
    await pintarContexto(ctx, snap, 'cta');
}

function cambiarBoton(k, v, guardar = false) {
    const ctx = contextoActivo(); if (!ctx) return;
    guardarEnMemoria(ctx);
    ctx.card.boton[k] = v;
    rehacerBoton(ctx).then(() => { marcarSucio(); if (guardar) agregarHistorial(ctx); refrescarPanel(); });
}

async function reemplazarImagen(ctx, o, url) {
    if (!ctx || !o || !url) return;
    guardarEnMemoria(ctx);
    const snap = foto(ctx);
    const capa = snap.capas.find(c => c.id === o.data.id);
    if (!capa) return;
    capa.src = normalizarDrive(url);
    await pintarContexto(ctx, snap, capa.id);
    agregarHistorial(ctx); refrescarPanel();
}

async function subirImagen(file) {
    if (!file) return '';
    if (file.size > 5 * 1024 * 1024) throw new Error('La imagen supera los 5MB');
    const fd = new FormData(); fd.append('archivo', file);
    const token = api.getToken();
    const r = await fetch('/api/sitio/uploads', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd });
    const data = await r.json().catch(() => null);
    if (!r.ok || !data?.datos?.url) throw new Error(data?.mensaje || 'No se pudo subir la imagen');
    return data.datos.url;
}

function abrirVistaPrevia(ctx) {
    const id = ctx.bloque.categoriaId;
    const nombre = ctx.bloque.categoria || ctx.bloque.nombre || '';
    const destino = id ? `/productos.html?categoriaId=${encodeURIComponent(id)}` : (nombre ? `/productos.html?categoria=${encodeURIComponent(nombre)}` : '/productos.html');
    window.open(destino, '_blank', 'noopener');
}

function aplicarZoom(v) {
    estado.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, v));
    const z = estado.zoom;
    $('#est-board').style.setProperty('--est-workspace-zoom', z);
    $('#est-board-sizer').style.minWidth = Math.max(100, BOARD_W * z) + 'px';
    $('#est-board-sizer').style.minHeight = Math.max(100, BOARD_H * z) + 'px';
    $('#est-zoom-nivel').textContent = Math.round(z * 100) + '%';
}

function ajustarZoom() {
    const wrap = $('#est-wrap');
    const disponible = Math.max(300, wrap.clientWidth - 70);
    aplicarZoom(Math.min(1, disponible / BOARD_W));
}

function cambiarModo(modo) {
    estado.modo = modo;
    $$('[data-mode]').forEach(b => b.classList.toggle('is-sel', b.dataset.mode === modo));
    estado.contextos.forEach(aplicarModoCanvas);
    if (manoActiva()) actualizarMano();
    else $('#est-status').textContent = modo === 'editar' ? 'Arrastra elementos o selecciona una capa' : 'Haz clic en una tarjeta para probar su destino';
    refrescarPanel();
}

async function cambiarVista(vista) {
    estado.vista = vista;
    $$('[data-vista]').forEach(b => b.classList.toggle('is-sel', b.dataset.vista === vista));
    for (const ctx of estado.contextos) {
        // Al entrar a «Antes» el canvas se reconstruye con el estado inicial.
        // El borrador permanece en el historial y se recupera intacto al volver.
        const snap = vista === 'antes' ? ctx.inicial : ctx.historial[ctx.paso];
        await pintarContexto(ctx, copia(snap));
    }
    estado.contextos.forEach(aplicarModoCanvas);
    if (manoActiva()) actualizarMano();
    else $('#est-status').textContent = vista === 'antes' ? 'Diseño al abrir el estudio (solo lectura)' : (estado.modo === 'editar' ? 'Arrastra elementos o selecciona una capa' : 'Haz clic en una tarjeta para probar su destino');
    refrescarPanel();
}

async function moverHistorial(dir) {
    const ctx = contextoActivo(); if (!ctx) return;
    const paso = ctx.paso + dir;
    if (paso < 0 || paso >= ctx.historial.length) return;
    ctx.paso = paso;
    await pintarContexto(ctx, copia(ctx.historial[paso]));
    marcarSucio(); refrescarPanel();
}

function prepararCanvas(ctx) {
    ctx.gesto = null;
    ctx.canvas.on('mouse:down:before', opt => {
        const actual = ctx.canvas.getActiveObject();
        ctx.gesto = { objeto: actual && opt.target === actual ? actual : null, movio: false };
    });
    ctx.canvas.on('selection:created', () => { activarContexto(ctx.i); refrescarPanel(); });
    ctx.canvas.on('selection:updated', () => { activarContexto(ctx.i); refrescarPanel(); });
    ctx.canvas.on('selection:cleared', () => refrescarPanel());
    ['object:moving', 'object:scaling', 'object:rotating'].forEach(ev => ctx.canvas.on(ev, () => { if (!ctx.restaurando) { if (ctx.gesto) ctx.gesto.movio = true; estado.vista = 'despues'; marcarSucio(); refrescarPanel(); } }));
    ctx.canvas.on('object:modified', () => { if (!ctx.restaurando) agregarHistorial(ctx); });
    ctx.canvas.on('text:editing:exited', () => { if (!ctx.restaurando) agregarHistorial(ctx); });
    ctx.canvas.on('mouse:down', () => { if (estado.modo === 'vista') abrirVistaPrevia(ctx); });
    ctx.canvas.on('mouse:up', () => {
        const g = ctx.gesto;
        ctx.gesto = null;
        // Segundo clic sobre la misma capa = deseleccionar, como en un editor visual.
        if (estado.modo === 'editar' && g?.objeto && !g.movio && !g.objeto.isEditing && ctx.canvas.getActiveObject() === g.objeto) {
            ctx.canvas.discardActiveObject();
            ctx.canvas.requestRenderAll();
            refrescarPanel();
        }
    });
    ctx.canvas.on('mouse:dblclick', opt => {
        const o = opt.target;
        if (o?.data?.rol === 'texto') {
            ctx.canvas.setActiveObject(o);
            o.enterEditing();
            try { o.selectAll(); } catch { /* nada */ }
            refrescarPanel();
        }
    });
    ctx.contenedor.addEventListener('mouseenter', () => aplicarHover(ctx, true));
    ctx.contenedor.addEventListener('mouseleave', () => aplicarHover(ctx, false));
}

function pintarSelectorTarjetas() {
    const caja = $('#est-card-switcher');
    if (!caja) return;
    caja.innerHTML = '';
    estado.equipos.forEach((b, i) => {
        const tab = document.createElement('button');
        tab.type = 'button';
        tab.className = 'est-card-tab';
        tab.dataset.card = String(i);
        tab.textContent = b.nombre || `Tarjeta ${i + 1}`;
        const fondo = normalizarDrive(b.fondo || b.imagen || '');
        if (fondo) tab.style.backgroundImage = `url("${fondo.replace(/"/g, '%22')}")`;
        tab.addEventListener('click', () => activarContexto(i));
        caja.appendChild(tab);
    });
}

function crearContextos() {
    const box = $('#est-cards'); box.innerHTML = '';
    estado.contextos.forEach(c => c.canvas?.dispose());
    estado.contextos = estado.equipos.map((bloque, i) => {
        const contenedor = document.createElement('div'); contenedor.className = 'est-canvas-card'; contenedor.dataset.card = i;
        const canvasEl = document.createElement('canvas'); canvasEl.width = RENDER_W; canvasEl.height = RENDER_H; canvasEl.id = `est-canvas-${i}`;
        contenedor.appendChild(canvasEl); box.appendChild(contenedor);
        const canvas = new fabric.Canvas(canvasEl, { width: RENDER_W, height: RENDER_H, selection: false, preserveObjectStacking: true, stopContextMenu: true });
        // El lienzo físico tiene más píxeles que su tamaño CSS. El viewport
        // mantiene las coordenadas de guardado en 240×360 sin estirar texto.
        canvas.setDimensions({ width: VIEW_W, height: VIEW_H }, { cssOnly: true });
        canvas.setViewportTransform([CANVAS_SCALE, 0, 0, CANVAS_SCALE, 0, 0]);
        const ctx = { i, bloque: copia(bloque), contenedor, canvas, card: propsDe(bloque), inicial: null, historial: [], paso: 0, restaurando: false };
        prepararCanvas(ctx);
        return ctx;
    });
    pintarSelectorTarjetas();
}

async function cargarContextos() {
    for (const ctx of estado.contextos) {
        const s = { capas: capasDe(ctx.bloque), card: propsDe(ctx.bloque), categoria: ctx.bloque.categoria || '', categoriaId: ctx.bloque.categoriaId || '' };
        ctx.inicial = copia(s); ctx.historial = [copia(s)]; ctx.paso = 0;
        await pintarContexto(ctx, s);
    }
    activarContexto(0);
}

async function guardarTodo() {
    const btn = $('#est-guardar');
    estado.contextos.forEach(guardarEnMemoria);
    const contenido = JSON.stringify(estado.equipos);
    if (contenido.length > 140000) { showToast('El diseño es demasiado grande. Reduce capas o textos.', 'error'); return; }
    btn.disabled = true; btn.textContent = 'Guardando…';
    try {
        await api.put('/api/sitio', { 'home.equipos': contenido, 'home.equipos.titulo': estado.titulo });
        try { sessionStorage.removeItem('electronix_sitio'); } catch { /* nada */ }
        estado.contextos.forEach(ctx => { const s = foto(ctx); ctx.inicial = copia(s); ctx.historial = [copia(s)]; ctx.paso = 0; });
        estado.sucio = false; btn.textContent = 'Guardar'; refrescarBarra(); showToast('Diseño publicado correctamente', 'success');
    } catch (e) { showToast(e.message || 'No se pudo publicar el diseño', 'error'); }
    finally { btn.disabled = false; if (estado.sucio) btn.textContent = 'Guardar *'; }
}

function enlazarEventos() {
    $$('.est-tool[data-tool]').forEach(b => b.addEventListener('click', () => {
        activarMano(b.dataset.tool === 'mano');
    }));
    $$('[data-mode]').forEach(b => b.addEventListener('click', () => cambiarModo(b.dataset.mode)));
    $$('[data-vista]').forEach(b => b.addEventListener('click', () => cambiarVista(b.dataset.vista)));
    $('#est-undo').addEventListener('click', () => moverHistorial(-1)); $('#est-redo').addEventListener('click', () => moverHistorial(1));
    $('#est-zoom-in').addEventListener('click', () => aplicarZoom(estado.zoom * 1.2)); $('#est-zoom-out').addEventListener('click', () => aplicarZoom(estado.zoom / 1.2)); $('#est-zoom-fit').addEventListener('click', ajustarZoom);
    // La rueda sobre la mesa acerca/aleja sin teclas extra. El panel lateral
    // no comparte este evento, por lo que allí la rueda conserva su scroll.
    $('#est-wrap').addEventListener('wheel', e => {
        e.preventDefault();
        const wrap = e.currentTarget;
        const rect = wrap.getBoundingClientRect();
        const antes = estado.zoom;
        const x = e.clientX - rect.left + wrap.scrollLeft;
        const y = e.clientY - rect.top + wrap.scrollTop;
        aplicarZoom(antes * (e.deltaY < 0 ? 1.12 : 1 / 1.12));
        const ratio = estado.zoom / antes;
        // Conserva aproximadamente bajo el cursor el punto que se estaba viendo.
        wrap.scrollLeft = Math.max(0, x * ratio - (e.clientX - rect.left));
        wrap.scrollTop = Math.max(0, y * ratio - (e.clientY - rect.top));
    }, { passive: false });
    const mesa = $('#est-wrap');
    let paneo = null;
    const terminarPaneo = () => {
        if (!paneo) return;
        paneo = null;
        mesa.classList.remove('is-panning');
        document.removeEventListener('mousemove', moverPaneo, true);
    };
    const moverPaneo = e => {
        if (!paneo) return;
        mesa.scrollLeft = paneo.left - (e.clientX - paneo.x);
        mesa.scrollTop = paneo.top - (e.clientY - paneo.y);
    };
    // Se captura antes que Fabric: así la mano nunca selecciona ni desplaza capas.
    mesa.addEventListener('mousedown', e => {
        if (!manoActiva() || e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        paneo = { x: e.clientX, y: e.clientY, left: mesa.scrollLeft, top: mesa.scrollTop };
        mesa.classList.add('is-panning');
        document.addEventListener('mousemove', moverPaneo, true);
        document.addEventListener('mouseup', terminarPaneo, { once: true, capture: true });
    }, true);
    $('#est-guardar').addEventListener('click', guardarTodo);
    $('#est-bloque').addEventListener('change', () => activarContexto(Number($('#est-bloque').value) || 0));
    $('#est-hover').addEventListener('change', () => estado.contextos.forEach(c => aplicarHover(c, false)));
    $('#est-card-fondo').addEventListener('click', () => { $('#est-card-props').open = true; $('#est-fondo-url').focus(); });
    $('#est-card-boton').addEventListener('click', () => { const c = contextoActivo(); if (c) { activarContexto(c.i, 'cta'); refrescarPanel(); } });
    $('#est-add-texto').addEventListener('click', () => {
        const c = contextoActivo(); if (!c || estado.modo !== 'editar') return;
        const o = crearTexto({ id: 'txt-' + Math.random().toString(36).slice(2, 8), texto: 'Texto nuevo', cx: 50, cy: 50, w: 60, size: 16, align: 'center', color: '#FFFFFF', peso: 700 });
        c.canvas.add(o); c.canvas.setActiveObject(o); c.canvas.requestRenderAll(); agregarHistorial(c); refrescarPanel(); o.enterEditing();
    });
    $('#est-add-imagen').addEventListener('click', () => $('#est-add-imagen-file').click());
    $('#est-add-imagen-file').addEventListener('change', async e => {
        const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
        try { const url = await subirImagen(f); const c = contextoActivo(); const o = await crearImagen({ id: 'img-' + Math.random().toString(36).slice(2, 8), src: url, cx: 50, cy: 50, w: 60 }); c.canvas.add(o); c.canvas.setActiveObject(o); c.canvas.requestRenderAll(); agregarHistorial(c); refrescarPanel(); } catch (err) { showToast(err.message, 'error'); }
    });
    $('#est-crop').addEventListener('click', () => { const o = objetoActivo(); if (!o || o.data?.rol !== 'imagen') { showToast('Selecciona una imagen para encuadrarla.', 'info'); return; } $('#est-status').textContent = 'Modo recorte: escala y mueve la imagen; la tarjeta muestra el encuadre final.'; $('#est-crop').classList.toggle('is-active'); });
    $('#est-duplicar').addEventListener('click', async () => { const c = contextoActivo(), o = objetoActivo(); if (!c || !o || o.data?.rol === 'boton') return; const n = await o.clone(); n.set({ left: o.left + 12, top: o.top + 12 }); n.data = { ...(n.data || {}), id: (o.data.rol === 'texto' ? 'txt-' : 'img-') + Math.random().toString(36).slice(2, 8), bloqueado: false }; aplicarBloqueo(n, false); c.canvas.add(n); c.canvas.setActiveObject(n); agregarHistorial(c); refrescarPanel(); });
    $('#est-borrar').addEventListener('click', () => { const c = contextoActivo(), o = objetoActivo(); if (!c || !o) return; if (o.data?.rol === 'boton') { o.visible = false; c.card.boton.oculto = true; } else c.canvas.remove(o); c.canvas.discardActiveObject(); c.canvas.requestRenderAll(); agregarHistorial(c); refrescarPanel(); });
    $('#est-fondo-usar').addEventListener('click', async () => { const c = contextoActivo(); if (!c) return; guardarEnMemoria(c); c.card.fondo = normalizarDrive($('#est-fondo-url').value); await pintarContexto(c, foto(c)); agregarHistorial(c); refrescarPanel(); });
    $('#est-fondo-file').addEventListener('change', async e => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; try { $('#est-fondo-url').value = await subirImagen(f); $('#est-fondo-usar').click(); } catch (err) { showToast(err.message, 'error'); } });
    ['est-fondo-color', 'est-velo', 'est-veloHover', 'est-veloColor', 'est-fondoBlur'].forEach(id => { const e = $('#' + id); e.addEventListener('input', () => { const c = contextoActivo(); if (!c) return; const key = id === 'est-fondo-color' ? 'fondoColor' : id === 'est-fondoBlur' ? 'fondoBlur' : id.replace('est-', ''); c.card[key] = id.includes('Color') || id === 'est-fondo-color' ? e.value.toUpperCase() : Number(e.value); if (c.velo) c.velo.set({ fill: c.card.veloColor, opacity: c.card.velo / 100 }); c.canvas.backgroundColor = c.card.fondoColor; c.canvas.requestRenderAll(); marcarSucio(); refrescarPanel(); }); e.addEventListener('change', () => { const c = contextoActivo(); if (id === 'est-fondoBlur') pintarContexto(c, foto(c)).then(() => agregarHistorial(c)); else agregarHistorial(c); }); });
    [['x', o => o.set({ left: Number($('#est-x').value) * W / 100 })], ['y', o => o.set({ top: Number($('#est-y').value) * H / 100 })], ['w', o => { const factor = (Number($('#est-w').value) * W / 100) / (o.getScaledWidth() || 1); o.set({ scaleX: (o.scaleX || 1) * factor, scaleY: (o.scaleY || 1) * factor }); }], ['rot', o => o.set({ angle: Number($('#est-rot').value) })], ['opacity', o => o.set({ opacity: Number($('#est-opacity').value) / 100 })]].forEach(([k, fn]) => { const e = $('#est-' + k); e.addEventListener('input', () => modificarSeleccion(fn)); e.addEventListener('change', () => agregarHistorial(contextoActivo())); });
    $('#est-flip-x').addEventListener('click', () => modificarSeleccion(o => o.set({ flipX: !o.flipX }), true)); $('#est-flip-y').addEventListener('click', () => modificarSeleccion(o => o.set({ flipY: !o.flipY }), true)); $('#est-front').addEventListener('click', () => modificarSeleccion((o, c) => { c.canvas.bringObjectToFront(o); c.canvas.bringObjectToFront(c.cta); }, true));
    $('#est-texto').addEventListener('input', e => modificarSeleccion(o => { if (o.data?.rol === 'texto') o.set({ text: e.target.value }); })); $('#est-texto').addEventListener('change', () => agregarHistorial(contextoActivo()));
    $('#est-font').addEventListener('change', e => modificarSeleccion(o => { if (o.data?.rol === 'texto') o.set({ fontFamily: e.target.value }); }, true)); $('#est-texto-color').addEventListener('input', e => modificarSeleccion(o => { if (o.data?.rol === 'texto') o.set({ fill: e.target.value.toUpperCase() }); })); $('#est-texto-color').addEventListener('change', () => agregarHistorial(contextoActivo()));
    $('#est-size').addEventListener('input', e => modificarSeleccion(o => { if (o.data?.rol === 'texto') o.set({ fontSize: Number(e.target.value) }); })); $('#est-size').addEventListener('change', () => agregarHistorial(contextoActivo()));
    $$('#est-align [data-al]').forEach(b => b.addEventListener('click', () => modificarSeleccion(o => { if (o.data?.rol === 'texto') o.set({ textAlign: b.dataset.al }); }, true)));
    $('#est-imagen-usar').addEventListener('click', () => reemplazarImagen(contextoActivo(), objetoActivo(), $('#est-imagen-url').value)); $('#est-imagen-file').addEventListener('change', async e => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; try { await reemplazarImagen(contextoActivo(), objetoActivo(), await subirImagen(f)); } catch (err) { showToast(err.message, 'error'); } });
    [['brightness', 'brightness'], ['contrast', 'contrast'], ['saturation', 'saturation'], ['imgBlur', 'blur']].forEach(([id, k]) => { const e = $('#est-' + id); e.addEventListener('input', async () => { const o = objetoActivo(); if (!o || o.data?.rol !== 'imagen') return; o.data.ajustes = { ...(o.data.ajustes || {}), [k]: Number(e.value) }; await aplicarFiltros(o); o.canvas.requestRenderAll(); marcarSucio(); refrescarPanel(); }); e.addEventListener('change', () => agregarHistorial(contextoActivo())); });
    $('#est-grayscale').addEventListener('click', async () => { const o = objetoActivo(); if (!o?.data || o.data.rol !== 'imagen') return; o.data.ajustes.grayscale = !o.data.ajustes.grayscale; await aplicarFiltros(o); o.canvas.requestRenderAll(); agregarHistorial(contextoActivo()); refrescarPanel(); }); $('#est-sepia').addEventListener('click', async () => { const o = objetoActivo(); if (!o?.data || o.data.rol !== 'imagen') return; o.data.ajustes.sepia = !o.data.ajustes.sepia; await aplicarFiltros(o); o.canvas.requestRenderAll(); agregarHistorial(contextoActivo()); refrescarPanel(); }); $('#est-reset-image').addEventListener('click', async () => { const o = objetoActivo(); if (!o?.data || o.data.rol !== 'imagen') return; o.data.ajustes = {}; await aplicarFiltros(o); o.canvas.requestRenderAll(); agregarHistorial(contextoActivo()); refrescarPanel(); });
    $('#est-cta-texto').addEventListener('change', e => cambiarBoton('texto', e.target.value.slice(0, 50), true)); $('#est-cta-fondo').addEventListener('change', e => cambiarBoton('fondo', e.target.value.toUpperCase(), true)); $('#est-cta-color').addEventListener('change', e => cambiarBoton('color', e.target.value.toUpperCase(), true)); $('#est-cta-borde-color').addEventListener('change', e => cambiarBoton('bordeColor', e.target.value.toUpperCase(), true)); $('#est-cta-borde').addEventListener('change', e => cambiarBoton('borde', Number(e.target.value), true)); $('#est-cta-radius').addEventListener('change', e => cambiarBoton('radio', Number(e.target.value), true));
    $('#est-cta-categoria').addEventListener('change', e => { const c = contextoActivo(); const cat = estado.categorias.find(x => String(x.id) === String(e.target.value)); c.bloque.categoriaId = cat ? cat.id : ''; c.bloque.categoria = cat ? cat.nombre : ''; agregarHistorial(c); refrescarPanel(); });
    document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); moverHistorial(e.shiftKey ? 1 : -1); return; }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); moverHistorial(1); return; }
        if (campoEnEdicion()) return;
        if (e.key === 'Escape') { const c = contextoActivo(); c?.canvas.discardActiveObject(); c?.canvas.requestRenderAll(); refrescarPanel(); return; }
        if (e.key === 'h' || e.key === 'H') { e.preventDefault(); activarMano(true); return; }
        if (e.key === 'v' || e.key === 'V') { e.preventDefault(); activarMano(false); return; }
        if (e.code === 'Space') {
            e.preventDefault();
            if (!estado.manoTemporal) { estado.manoTemporal = true; actualizarMano(); }
            return;
        }
        if (e.key === 'Delete' || e.key === 'Backspace') $('#est-borrar').click();
    });
    document.addEventListener('keyup', e => {
        if (e.code === 'Space' && estado.manoTemporal) { estado.manoTemporal = false; actualizarMano(); }
    });
    window.addEventListener('beforeunload', e => { if (estado.sucio) { e.preventDefault(); e.returnValue = ''; } });
}

async function init() {
    if (!fabric) { showToast('No se pudo cargar la librería de edición.', 'error'); return; }
    if (!auth.protegerRutaAdmin()) return;
    fabric.Object.prototype.set({ transparentCorners: false, cornerColor: '#58dfc8', cornerStrokeColor: '#10201e', cornerSize: 7, cornerStyle: 'circle', borderColor: '#58dfc8' });
    try { await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1000))]); } catch { /* fallback */ }
    try {
        const [sitio, cats] = await Promise.all([api.get('/api/sitio'), api.get('/api/categorias')]);
        const datos = sitio?.datos || {};
        const equipos = json(datos['home.equipos'], []);
        estado.equipos = Array.isArray(equipos) ? equipos : [];
        estado.titulo = String(datos['home.equipos.titulo'] || estado.titulo).trim() || estado.titulo;
        estado.categorias = cats?.exito && Array.isArray(cats.datos) ? cats.datos : [];
    } catch (e) { showToast('No se pudo cargar el estudio: ' + (e.message || e), 'error'); return; }
    if (!estado.equipos.length) { showToast('No hay bloques de equipos para editar.', 'error'); return; }
    const select = $('#est-bloque');
    estado.equipos.forEach((b, i) => { const o = document.createElement('option'); o.value = String(i); o.textContent = b.nombre || `Tarjeta ${i + 1}`; select.appendChild(o); });
    const destino = $('#est-cta-categoria');
    estado.categorias.forEach(c => { const o = document.createElement('option'); o.value = String(c.id); o.textContent = c.nombre; destino.appendChild(o); });
    crearContextos(); await cargarContextos(); enlazarEventos();
    const qp = new URLSearchParams(location.search).get('bloque');
    if (qp != null) { const i = Number(qp); if (Number.isInteger(i) && estado.contextos[i]) activarContexto(i); }
    requestAnimationFrame(ajustarZoom);
}

init();
