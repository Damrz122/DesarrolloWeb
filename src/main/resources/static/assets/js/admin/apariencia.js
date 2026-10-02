import { api } from '/assets/js/api.js';
import { auth } from '/assets/js/auth.js';
import { renderAdminShell } from '/assets/js/ui/adminShell.js?v=2';
import { showToast } from '/assets/js/ui/toast.js';
import { limpiarCacheSitio } from '/assets/js/sitio.js?v=4';

renderAdminShell('apariencia');

if (!auth.protegerRutaAdmin()) {
    // Guard
} else {
    initApariencia();
}

const estado = {
    hero: [],
    cards: [],
    equipos: [],
    equiposTitulo: '',
    banners: [],
    spot: []
};

// editores por seccion: campos del modal generico
const EDITORES = {
    hero: {
        titulo: 'Slide del hero',
        lista: 'hero',
        contar: 'ap-hero-count',
        campos: [
            { k: 'titulo', label: 'Título grande', tipo: 'text', ph: 'Ej. SUPER OFERTAS' },
            { k: 'subtitulo', label: 'Subtítulo', tipo: 'text', ph: 'Ej. ESPECIALES' },
            { k: 'fondoTipo', label: 'Fondo', tipo: 'select', opciones: [['imagen', 'Imagen'], ['color', 'Color sólido'], ['degradado', 'Degradado']] },
            { k: 'imagen', label: 'Imagen (URL, solo si fondo es imagen)', tipo: 'url', ph: 'https://…' },
            { k: 'fondoColor1', label: 'Color / inicio del degradado', tipo: 'color' },
            { k: 'fondoColor2', label: 'Fin del degradado', tipo: 'color' },
            { k: 'mostrarTexto', label: 'Mostrar texto sobre el fondo', tipo: 'check' },
            { k: 'textoBoton', label: 'Texto del botón (vacío = sin botón)', tipo: 'text', ph: 'Ej. Ver ofertas' },
            { k: 'linkUrl', label: 'Destino (clic / botón)', tipo: 'text', ph: 'Ej. /productos.html?ofertas=true' }
        ]
    },
    cards: {
        titulo: 'Tarjeta',
        lista: 'cards',
        contar: 'ap-cards-count',
        campos: [
            { k: 'titulo', label: 'Título', tipo: 'text', ph: 'Ej. OFERTAS' },
            { k: 'descripcion', label: 'Descripción', tipo: 'textarea', ph: 'Ej. ¡OFERTAS EN MILES DE PRODUCTOS PARA TI!' },
            { k: 'icono', label: 'Icono (SVG pegado o URL, vacío = sin icono)', tipo: 'textarea', ph: '<svg …>…</svg> o https://…' },
            { k: 'boton', label: 'Texto del botón', tipo: 'text', ph: 'Ej. MAS INFORMACIÓN' },
            { k: 'linkUrl', label: 'Destino', tipo: 'text', ph: 'Ej. /productos.html?ofertas=true' }
        ]
    },
    equipos: {
        titulo: 'Bloque de equipo',
        lista: 'equipos',
        contar: 'ap-equipos-count',
        campos: [
            { k: 'nombre', label: 'Nombre', tipo: 'text', ph: 'Ej. TELEVISORES' },
            { k: 'descripcion', label: 'Descripción', tipo: 'text', ph: 'Ej. Pantallas y monitores gamer' },
            { k: 'fondo', label: 'Fondo', tipo: 'media', variante: 'fondo', textoCambiar: 'Cambiar fondo', ph: 'https://… o /uploads/xxx.jpg' },
            { k: 'fondoColor', label: 'Color base del fondo (si no hay imagen)', tipo: 'color' },
            { k: 'producto', label: 'Producto', tipo: 'media', variante: 'producto', textoCambiar: 'Cambiar producto', ph: 'https://… o /uploads/xxx.png' },
            { k: 'diseno', label: 'Posición y diseño', tipo: 'diseno' },
            { k: 'cta', label: 'Texto del botón', tipo: 'text', ph: 'Ej. Ver productos' },
            { k: 'categoria', label: 'Categoría destino (nombre)', tipo: 'text', ph: 'Ej. Televisores' }
        ]
    },
    banners: {
        titulo: 'Banner',
        lista: 'banners',
        contar: null,
        campos: [
            { k: 'etiqueta', label: 'Etiqueta superior', tipo: 'text', ph: 'Ej. ¡COMPRA AHORA!' },
            { k: 'titulo', label: 'Título', tipo: 'text', ph: 'Ej. LO MEJOR EN HARDWARE Y GAMING' },
            { k: 'descripcion', label: 'Descripción (vacío = sin texto)', tipo: 'textarea', ph: 'Ej. Encuentra periféricos…' },
            { k: 'boton', label: 'Texto del botón', tipo: 'text', ph: 'Ej. Ver más' },
            { k: 'linkUrl', label: 'Destino', tipo: 'text', ph: 'Ej. /productos.html' },
            { k: 'imagen', label: 'Imagen', tipo: 'media', variante: 'fondo', textoCambiar: 'Cambiar imagen', ph: 'https://… o /uploads/xxx.jpg' },
            { k: 'estilo', label: 'Estilo', tipo: 'select', opciones: [['oscuro', 'Oscuro (grande)'], ['azul', 'Azul (lateral)']] },
            { k: 'textoAlinear', label: 'Posición del texto', tipo: 'select', opciones: [['centro', 'Centrado'], ['izq', 'Izquierda']] },
            { k: 'etiquetaTam', label: 'Etiqueta · tamaño px (vacío = normal)', tipo: 'text', ph: 'Ej. 12' },
            { k: 'tituloTam', label: 'Título · tamaño px (vacío = normal)', tipo: 'text', ph: 'Ej. 28' },
            { k: 'descTam', label: 'Descripción · tamaño px (vacío = normal)', tipo: 'text', ph: 'Ej. 14' }
        ]
    },
    spot: {
        titulo: 'Tarjeta destacada',
        lista: 'spot',
        contar: 'ap-spot-count',
        campos: [
            { k: 'kicker', label: 'Etiqueta', tipo: 'text', ph: 'Ej. Gaming' },
            { k: 'titulo', label: 'Título', tipo: 'text', ph: 'Ej. Noches gamer sin lag' },
            { k: 'descripcion', label: 'Descripción', tipo: 'textarea', ph: 'Ej. Arma tu setup…' },
            { k: 'boton', label: 'Texto del botón', tipo: 'text', ph: 'Ej. Ver colección' },
            { k: 'linkUrl', label: 'Destino', tipo: 'text', ph: 'Ej. /productos.html' },
            { k: 'imagen', label: 'Imagen (URL)', tipo: 'url', ph: 'https://…' }
        ]
    }
};

let editorTipo = null;
let editorIdx = -1;

const modal = document.getElementById('ap-modal');
const modalTitulo = document.getElementById('ap-modal-titulo');
const formCampos = document.getElementById('ap-form-campos');

function esc(v) {
    return String(v ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function leerJSON(valor, defecto) {
    try {
        const p = JSON.parse(valor);
        return Array.isArray(p) ? p : defecto;
    } catch {
        return defecto;
    }
}

// Drive: un link "compartir" (drive.google.com/file/d/ID/view) es una página,
// no una imagen. Se convierte a URL directa para que <img> y fondos sí la muestren.
// El archivo debe estar compartido como "Cualquier persona con el enlace".
function normalizarDrive(url) {
    const v = String(url || '').trim();
    if (!v.includes('drive.google.com')) return v;
    const m = v.match(/\/file\/d\/([A-Za-z0-9_-]+)/) || v.match(/[?&]id=([A-Za-z0-9_-]+)/);
    if (m && m[1]) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1000`;
    return v;
}

function bloquearFondo(bloquear) {
    document.body.style.overflow = bloquear ? 'hidden' : '';
}

// lateral figma: muestra un panel a la vez
function initSidebar() {
    const btns = document.querySelectorAll('.ap-side-btn');
    btns.forEach(b => b.addEventListener('click', () => {
        btns.forEach(x => x.classList.remove('is-active'));
        b.classList.add('is-active');
        document.querySelectorAll('.ap-contenido [data-panel]').forEach(p => {
            p.hidden = p.dataset.panel !== b.dataset.panel;
        });
    }));
}

// colores figma: presets + personalizado
const PRESETS_COLOR = ['#FFFFFF', '#E11D48', '#14B8A6', '#F5C518', '#8B5CF6', '#22C55E', '#C9A227'];
const pintoresColor = {};

function normalizarHex(v) {
    let h = String(v || '').trim();
    if (/^[0-9a-fA-F]{6}$/.test(h)) h = '#' + h;
    if (/^#[0-9a-fA-F]{6}$/.test(h)) return h.toUpperCase();
    return null;
}

function initColor(cual) {
    const dotsBox = document.getElementById('dots-' + cual);
    const hexEl = document.getElementById('hex-' + cual);
    const picker = document.getElementById('ap-' + cual);
    if (!dotsBox || !hexEl || !picker) return;
    const pintar = color => {
        const c = normalizarHex(color) || '#000000';
        picker.value = c;
        hexEl.textContent = c;
        dotsBox.querySelectorAll('.ap-dot').forEach(d => {
            d.classList.toggle('is-sel', d.dataset.color === c);
        });
    };
    PRESETS_COLOR.forEach(p => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'ap-dot';
        b.style.background = p;
        b.dataset.color = p;
        b.title = p;
        b.setAttribute('aria-label', 'Color ' + p);
        b.addEventListener('click', () => pintar(p));
        dotsBox.appendChild(b);
    });
    picker.addEventListener('input', () => pintar(picker.value));
    pintoresColor[cual] = pintar;
    pintar(picker.value);
}

function refrescarColor(cual, valor) {
    if (pintoresColor[cual]) pintoresColor[cual](valor);
}

// logo: acepta SVG pegado, ruta o URL + vista previa
function pintarPreviewLogo() {
    const valor = document.getElementById('ap-logo').value.trim();
    const actual = document.getElementById('ap-logo-img');
    if (!actual) return;
    if (valor.startsWith('<svg') || valor.startsWith('<SVG')) {
        const span = document.createElement('span');
        span.id = 'ap-logo-img';
        span.innerHTML = valor;
        actual.replaceWith(span);
    } else {
        if (actual.tagName !== 'IMG') {
            const img = document.createElement('img');
            img.id = 'ap-logo-img';
            img.alt = 'Vista previa del logo';
            actual.replaceWith(img);
            img.src = valor || '/assets/img/logo.svg';
        } else {
            actual.src = valor || '/assets/img/logo.svg';
        }
    }
}

function initLogo() {
    const btn = document.getElementById('ap-logo-cambiar');
    if (btn) {
        btn.addEventListener('click', () => {
            const edit = document.getElementById('ap-logo-edit');
            if (edit) edit.hidden = !edit.hidden;
        });
    }
    const input = document.getElementById('ap-logo');
    if (input) input.addEventListener('input', pintarPreviewLogo);
}

async function initApariencia() {
    const on = (id, evento, fn) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(evento, fn);
    };
    on('ap-modal-cerrar', 'click', cerrarEditor);
    on('ap-form-cancelar', 'click', cerrarEditor);
    on('ap-form', 'submit', guardarBloque);

    try { initSidebar(); } catch (e) { console.error('sidebar apariencia:', e); }
    try { initColor('primario'); } catch (e) { console.error('color primario:', e); }
    try { initColor('secundario'); } catch (e) { console.error('color secundario:', e); }
    try { initLogo(); } catch (e) { console.error('logo apariencia:', e); }

    document.querySelectorAll('[data-guardar]').forEach(b => {
        b.addEventListener('click', () => guardarSeccion(b.dataset.guardar, b));
    });

    const nuevos = [['ap-hero-nuevo', 'hero'], ['ap-cards-nuevo', 'cards'], ['ap-equipos-nuevo', 'equipos'], ['ap-banners-nuevo', 'banners'], ['ap-spot-nuevo', 'spot']];
    nuevos.forEach(([id, tipo]) => {
        const b = document.getElementById(id);
        if (b) b.addEventListener('click', () => abrirEditor(tipo, -1));
    });

    try {
        const res = await api.get('/api/sitio');
        if (res.exito && res.datos) {
            const cfg = res.datos;
            document.getElementById('ap-nombre').value = cfg['site.nombre'] || '';
            document.getElementById('ap-logo').value = cfg['site.logo'] || '';
            pintarPreviewLogo();
            refrescarColor('primario', cfg['tema.primario'] || '#3564C9');
            refrescarColor('secundario', cfg['tema.secundario'] || '#000000');
            document.getElementById('ap-equipos-titulo').value = cfg['home.equipos.titulo'] || '';

            estado.hero = leerJSON(cfg['hero.slides'], []);
            estado.cards = leerJSON(cfg['home.cards'], []);
            estado.equipos = leerJSON(cfg['home.equipos'], []);
            estado.equiposTitulo = cfg['home.equipos.titulo'] || '';
            estado.banners = leerJSON(cfg['home.banners'], []);
            estado.spot = leerJSON(cfg['home.spotlight'], []);

            repintarTodo();
        }
    } catch (err) {
        showToast('Error cargando apariencia: ' + err.message, 'error');
    }
}

function tituloDe(item) {
    return item.titulo || item.nombre || item.etiqueta || item.kicker || 'Bloque';
}

function subDe(item) {
    return item.subtitulo || item.descripcion || item.linkUrl || '';
}

function repintarTodo() {
    repintarLista('hero', 'ap-hero-lista');
    repintarLista('cards', 'ap-cards-lista');
    repintarLista('equipos', 'ap-equipos-lista');
    repintarLista('banners', 'ap-banners-lista');
    repintarLista('spot', 'ap-spot-lista');
}

function repintarLista(tipo, contenedorId) {
    const box = document.getElementById(contenedorId);
    const ed = EDITORES[tipo];
    const lista = estado[ed.lista];
    if (ed.contar) {
        const c = document.getElementById(ed.contar);
        if (c) c.textContent = `(${lista.length})`;
    }
    box.innerHTML = '';
    if (!lista.length) {
        box.innerHTML = '<div class="ap-vacio">Sin bloques. Agrega uno nuevo.</div>';
        return;
    }
    lista.forEach((item, i) => {
        const fila = document.createElement('div');
        fila.className = 'ap-item';
        const thumbUrl = normalizarDrive(item.producto || item.fondo || item.imagen || item.icono || '');
        const esSvg = String(item.producto || item.icono || '').trim().startsWith('<svg');
        const thumb = thumbUrl && !esSvg
            ? `<img class="ap-thumb" src="${esc(thumbUrl)}" alt="" onerror="this.style.display='none'">`
            : '<span class="ap-thumb"></span>';
        fila.innerHTML = `
            ${thumb}
            <div class="ap-item-body">
                <div class="ap-item-titulo">${esc(tituloDe(item))}</div>
                <div class="ap-item-sub">${esc(subDe(item))}</div>
            </div>
            <div class="ap-item-acciones">
                <button type="button" class="adm-btn adm-btn-edit adm-btn-sm">Editar</button>
                <button type="button" class="adm-btn adm-btn-del adm-btn-sm">Eliminar</button>
            </div>`;
        const [btnEditar, btnEliminar] = fila.querySelectorAll('button');
        btnEditar.addEventListener('click', () => abrirEditor(tipo, i));
        btnEliminar.addEventListener('click', () => {
            if (!confirm(`¿Eliminar "${tituloDe(item)}"? Se aplica al guardar la sección.`)) return;
            estado[ed.lista].splice(i, 1);
            repintarLista(tipo, contenedorId);
        });
        box.appendChild(fila);
    });
}

function abrirEditor(tipo, idx) {
    editorTipo = tipo;
    editorIdx = idx;
    const ed = EDITORES[tipo];
    const item = idx >= 0 ? estado[ed.lista][idx] : {};
    modalTitulo.textContent = (idx >= 0 ? 'Editar: ' : 'Nuevo: ') + ed.titulo.toLowerCase();
    formCampos.innerHTML = '';

    ed.campos.forEach(c => {
        const wrap = document.createElement('div');
        wrap.className = 'ap-campo';
        const val = item[c.k];
        if (c.tipo === 'select') {
            wrap.innerHTML = `
                <label class="adm-label" for="ap-f-${c.k}">${esc(c.label)}</label>
                <select id="ap-f-${c.k}" class="adm-select" data-k="${c.k}">
                    ${c.opciones.map(([v, t]) => `<option value="${v}"${String(val) === v ? ' selected' : ''}>${t}</option>`).join('')}
                </select>`;
        } else if (c.tipo === 'textarea') {
            wrap.innerHTML = `
                <label class="adm-label" for="ap-f-${c.k}">${esc(c.label)}</label>
                <textarea id="ap-f-${c.k}" rows="3" class="adm-textarea" data-k="${c.k}" placeholder="${esc(c.ph || '')}">${esc(val || '')}</textarea>`;
        } else if (c.tipo === 'check') {
            wrap.innerHTML = `
                <label class="ap-check" for="ap-f-${c.k}">
                    <input id="ap-f-${c.k}" type="checkbox" data-k="${c.k}"${val === false ? '' : ' checked'} />
                    ${esc(c.label)}
                </label>`;
        } else if (c.tipo === 'color') {
            wrap.innerHTML = `
                <label class="adm-label" for="ap-f-${c.k}">${esc(c.label)}</label>
                <input id="ap-f-${c.k}" type="color" class="ap-color" data-k="${c.k}" value="${esc(val || '#111827')}" />`;
        } else if (c.tipo === 'media') {
            // Valor efectivo: el campo nuevo manda; si está vacío se hereda del legacy
            // (bloques viejos con 'imagen'/'icono') para no borrar nada sin querer.
            const iconoEsSvg = String(item.icono || '').trim().startsWith('<svg');
            const efectivo = c.k === 'fondo'
                ? (val || item.imagen || '')
                : c.k === 'producto'
                    ? (val || (!iconoEsSvg ? (item.icono || '') : ''))
                    : (val || '');
            const actual = normalizarDrive(String(efectivo || '').trim());
            const esProducto = c.variante === 'producto';
            const vacioTxt = esProducto ? 'Sin producto · PNG transparente recomendado' : 'Sin fondo';
            wrap.className = 'ap-campo ap-campo--media';
            wrap.innerHTML = `
                <span class="adm-label">${esc(c.label)}</span>
                <div class="ap-media" data-media="${c.k}">
                    <button type="button" class="ap-media-tile ${esProducto ? 'ap-media--producto' : 'ap-media--fondo'}" data-media-tile="${c.k}" aria-haspopup="dialog" title="${esc(c.textoCambiar || 'Cambiar')}">
                        <img data-media-img="${c.k}" src="${esc(actual)}" alt="" ${actual ? '' : 'hidden'} onerror="this.hidden=true;var v=this.closest('.ap-media').querySelector('[data-media-vacio]');if(v)v.hidden=false;" />
                        <span class="ap-media-vacio" data-media-vacio="${c.k}" ${actual ? 'hidden' : ''}>${esc(vacioTxt)}</span>
                        <span class="ap-media-overlay">${esc(c.textoCambiar || 'Cambiar')}</span>
                    </button>
                    <input type="hidden" data-k="${c.k}" value="${esc(efectivo || '')}" />
                    <div class="ap-picker" data-picker="${c.k}" role="dialog" aria-label="${esc(c.label)}" hidden>
                        <div class="ap-picker-tabs" role="tablist" aria-label="Origen de la imagen">
                            <button type="button" class="ap-picker-tab is-active" data-picker-tab="url" role="tab">Enlace</button>
                            <button type="button" class="ap-picker-tab" data-picker-tab="pc" role="tab">Mi equipo</button>
                        </div>
                        <div data-picker-panel="url">
                            <input class="adm-input" data-picker-url placeholder="${esc(c.ph || 'https://…')}" inputmode="url" value="${esc(efectivo || '')}" />
                            <button type="button" class="adm-btn adm-btn-primary adm-btn-sm ap-picker-usar" data-picker-usar>Usar enlace</button>
                        </div>
                        <div data-picker-panel="pc" hidden>
                            <label class="ap-drop" data-picker-drop>
                                <input type="file" accept="image/png,image/jpeg,image/webp" data-picker-file hidden />
                                <span>Arrastra aquí o <b>elige de tu PC</b><br /><small>PNG · JPG · WEBP · máx 5MB</small></span>
                            </label>
                            <span class="adm-sub" data-picker-estado></span>
                        </div>
                        <div class="ap-picker-foot">
                            <button type="button" class="adm-btn adm-btn-ghost adm-btn-sm" data-picker-quitar>Quitar imagen</button>
                            <button type="button" class="adm-btn adm-btn-ghost adm-btn-sm" data-picker-cancelar>Cancelar</button>
                            <button type="button" class="adm-btn adm-btn-primary adm-btn-sm" data-picker-listo>Listo</button>
                        </div>
                    </div>
                </div>`;
        } else if (c.tipo === 'diseno') {
            wrap.className = 'ap-campo';
            const deep = idx >= 0 ? `/admin/estudio.html?bloque=${idx}` : '/admin/estudio.html';
            wrap.innerHTML = `
                <span class="adm-label">${esc(c.label)}</span>
                <div><a class="adm-btn adm-btn-ghost adm-btn-sm" href="${deep}">Abrir en Estudio</a></div>
                <span class="adm-sub">Edición visual con canvas: mover, estirar, rotar y editar textos.</span>`;
        } else if (c.tipo === 'file') {
            const destino = c.para || c.k;
            const actual = item[destino] || '';
            wrap.innerHTML = `
                <label class="adm-label" for="ap-f-${c.k}">${esc(c.label)}</label>
                <input id="ap-f-${c.k}" type="file" class="adm-input" accept="image/png,image/jpeg,image/webp" data-upload-para="${destino}" />
                <span class="adm-sub" data-preview-sub="${destino}">${actual ? 'Actual: ' + esc(String(actual)) : 'Sin archivo. PNG con transparencia recomendado para producto.'}</span>
                <img data-preview-img="${destino}" src="${esc(normalizarDrive(actual))}" alt="" style="max-width:120px;max-height:80px;object-fit:contain;margin-top:6px;${actual ? '' : 'display:none'}" onerror="this.style.display='none'" />`;
        } else {
            wrap.innerHTML = `
                <label class="adm-label" for="ap-f-${c.k}">${esc(c.label)}</label>
                <input id="ap-f-${c.k}" type="${c.tipo === 'url' ? 'text' : 'text'}" class="adm-input" data-k="${c.k}" value="${esc(val || '')}" placeholder="${esc(c.ph || '')}" inputmode="url" />`;
        }
        formCampos.appendChild(wrap);
    });

    // Subida desde PC: el file alimenta el campo URL destino (fondo/producto)
    formCampos.querySelectorAll('[data-upload-para]').forEach(input => {
        input.addEventListener('change', async () => {
            const file = input.files && input.files[0];
            if (!file) return;
            const destino = input.dataset.uploadPara;
            input.disabled = true;
            try {
                const url = await subirImagen(file);
                const campo = formCampos.querySelector(`[data-k="${destino}"]`);
                if (campo) campo.value = url;
                const prevImg = formCampos.querySelector(`[data-preview-img="${destino}"]`);
                if (prevImg) { prevImg.src = url; prevImg.style.display = ''; }
                const prevSub = formCampos.querySelector(`[data-preview-sub="${destino}"]`);
                if (prevSub) prevSub.textContent = 'Subido: ' + url;
                showToast('Imagen subida correctamente', 'success');
            } catch (err) {
                showToast(err.message, 'error');
            } finally {
                input.disabled = false;
            }
        });
    });
    // Vista previa en vivo al pegar URL
    formCampos.querySelectorAll('[data-k="fondo"], [data-k="producto"]').forEach(campo => {
        campo.addEventListener('input', () => {
            const prevImg = formCampos.querySelector(`[data-preview-img="${campo.dataset.k}"]`);
            if (prevImg) {
                const v = normalizarDrive(campo.value.trim());
                prevImg.src = v;
                prevImg.style.display = v ? '' : 'none';
            }
            pintarMediaTile(campo.dataset.k, campo.value);
        });
    });
    initMediaPickers();

    modal.classList.remove('hidden');
    bloquearFondo(true);
}

// Botón Posición: resumen + apertura del mini-editor visual
function hexToRgb(v, fb) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(v || '').trim());
    if (!m) return fb;
    const n = parseInt(m[1], 16);
    return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

function leerDiseno(v) {
    const fb = { prodTam: 82, prodSX: 1, prodSY: 1, prodX: 0, prodY: 0, textoX: 0, textoY: 0, alinear: 'izq', tituloTam: 15, descTam: 11, velo: 62, veloHover: 32, veloColor: '#0A0E1C', fondoBlur: 0 };
    try {
        const o = typeof v === 'string' ? JSON.parse(v || '{}') : (v || {});
        if (!o || typeof o !== 'object') return fb;
        const num = (x, d, min, max) => {
            const n = Number(x);
            return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
        };
        const color = /^#?[0-9a-f]{6}$/i.test(String(o.veloColor || '').trim())
            ? ('#' + String(o.veloColor).trim().replace('#', '').toUpperCase())
            : '#0A0E1C';
        return {
            prodTam: num(o.prodTam, 82, 20, 200),
            prodSX: num(o.prodSX, 1, 0.3, 2.5),
            prodSY: num(o.prodSY, 1, 0.3, 2.5),
            prodX: num(o.prodX, 0, -60, 60),
            prodY: num(o.prodY, 0, -50, 50),
            alinear: ['izq', 'centro', 'der'].includes(o.alinear) ? o.alinear : 'izq',
            tituloTam: num(o.tituloTam, 15, 11, 24),
            descTam: num(o.descTam, 11, 9, 16),
            velo: num(o.velo, 62, 0, 95),
            veloHover: num(o.veloHover, 32, 0, 95),
            veloColor: color,
            fondoBlur: num(o.fondoBlur, 0, 0, 12),
            textoX: num(o.textoX, 0, -30, 30),
            textoY: num(o.textoY, 0, -30, 30)
        };
    } catch { return fb; }
}

function resumenDiseno(d) {
    return `Producto ${d.prodTam}% · texto ${d.alinear} · velo ${d.velo}%→${d.veloHover}%`;
}

function initDisenoBoton() {
    const btn = formCampos.querySelector('[data-diseno-abrir]');
    if (!btn) return;
    const oculto = formCampos.querySelector('input[data-k="diseno"]');
    const resumen = formCampos.querySelector('[data-diseno-resumen]');
    const pintarResumen = () => {
        if (resumen && oculto) resumen.textContent = resumenDiseno(leerDiseno(oculto.value));
    };
    pintarResumen();
    btn.addEventListener('click', () => openDisenoEditor(oculto, pintarResumen));
}

// Mini-editor visual tipo Canva: preview real de la card + controles
function openDisenoEditor(oculto, alAplicar) {
    const raiz = document.createElement('div');
    raiz.className = 'ap-diseno-backdrop';
    const d0 = leerDiseno(oculto ? oculto.value : '');
    let d = { ...d0 };

    const leerCampo = (k) => {
        const el = formCampos.querySelector(`[data-k="${k}"]`);
        return el ? el.value : '';
    };

    raiz.innerHTML = `
        <div class="ap-diseno-panel" role="dialog" aria-modal="true" aria-label="Posición y diseño de la card">
            <div class="ap-diseno-head">
                <div><h3>Posición y diseño</h3><p class="ap-diseno-sub" data-sub></p></div>
                <button type="button" class="adm-close" data-diseno-x aria-label="Cerrar">✕</button>
            </div>
            <div class="ap-diseno-body">
                <div class="ap-diseno-prevcol">
                    <div class="ap-diseno-card" data-card>
                        <div class="ap-diseno-bg" data-bg></div>
                        <div class="ap-diseno-veil" data-veil></div>
                        <div class="ap-diseno-name" data-name data-drag="texto"></div>
                        <div class="ap-diseno-desc" data-desc data-drag="texto"></div>
                        <img class="ap-diseno-prod" data-prod data-drag="prod" alt="" />
                        <span class="ap-diseno-cta" data-cta></span>
                    </div>
                    <label class="ap-check"><input type="checkbox" data-sim-hover /> Simular hover (ver claridad)</label>
                </div>
                <div class="ap-diseno-controls">
                    <p class="ap-group"><span></span>Producto</p>
                    <div class="ap-row"><span>Tamaño</span><span class="ap-val" data-v-prodTam></span></div>
                    <input type="range" min="20" max="200" step="1" data-c-prodTam />
                    <div class="ap-grid2">
                        <div>
                            <div class="ap-row"><span>Mover X</span><span class="ap-val" data-v-prodX></span></div>
                            <input type="range" min="-60" max="60" step="1" data-c-prodX />
                        </div>
                        <div>
                            <div class="ap-row"><span>Mover Y</span><span class="ap-val" data-v-prodY></span></div>
                            <input type="range" min="-50" max="50" step="1" data-c-prodY />
                        </div>
                    </div>
                    <p class="ap-group"><span></span>Texto</p>
                    <div class="ap-row"><span>Alineación</span></div>
                    <div class="ap-seg" data-c-alinear>
                        <button type="button" data-al="izq">Izq</button>
                        <button type="button" data-al="centro">Centro</button>
                        <button type="button" data-al="der">Der</button>
                    </div>
                    <div class="ap-grid2">
                        <div>
                            <div class="ap-row"><span>Título</span><span class="ap-val" data-v-tituloTam></span></div>
                            <input type="range" min="11" max="24" step="1" data-c-tituloTam />
                        </div>
                        <div>
                            <div class="ap-row"><span>Descripción</span><span class="ap-val" data-v-descTam></span></div>
                            <input type="range" min="9" max="16" step="1" data-c-descTam />
                        </div>
                    </div>
                    <p class="ap-group"><span></span>Velo</p>
                    <div class="ap-grid2">
                        <div>
                            <div class="ap-row"><span>Oscuro normal</span><span class="ap-val" data-v-velo></span></div>
                            <input type="range" min="0" max="95" step="1" data-c-velo />
                        </div>
                        <div>
                            <div class="ap-row"><span>Claro en hover</span><span class="ap-val" data-v-veloHover></span></div>
                            <input type="range" min="0" max="95" step="1" data-c-veloHover />
                        </div>
                    </div>
                    <div class="ap-row"><span>Color de la sombra</span><span class="ap-val" data-v-veloColor></span></div>
                    <div class="ap-color-row">
                        <input type="color" class="ap-color" data-c-veloColor />
                    </div>
                    <div class="ap-row"><span>Desenfoque fondo</span><span class="ap-val" data-v-fondoBlur></span></div>
                    <input type="range" min="0" max="12" step="1" data-c-fondoBlur />
                </div>
            </div>
            <div class="ap-diseno-foot">
                <button type="button" class="ap-link-btn" data-diseno-reset>Restablecer</button>
                <button type="button" class="adm-btn adm-btn-ghost adm-btn-sm" data-diseno-cancel>Cancelar</button>
                <button type="button" class="adm-btn adm-btn-primary adm-btn-sm ap-btn-blue" data-diseno-ok>Aplicar</button>
            </div>
        </div>`;

    const q = (s) => raiz.querySelector(s);
    const card = q('[data-card]'), bg = q('[data-bg]'), veil = q('[data-veil]'),
        name = q('[data-name]'), desc = q('[data-desc]'),
        prod = q('[data-prod]'), cta = q('[data-cta]'), sub = q('[data-sub]');
    const SUF = { prodTam: '%', prodX: '%', prodY: '%', tituloTam: 'px', descTam: 'px', velo: '%', veloHover: '%', fondoBlur: 'px' };

    const pintar = () => {
        const fondo = normalizarDrive(leerCampo('fondo'));
        const fondoColor = (leerCampo('fondoColor') || '').trim() || '#111827';
        bg.style.backgroundImage = fondo ? `url('${fondo.replace(/'/g, '%27')}')` : '';
        bg.style.backgroundColor = fondoColor;
        const producto = normalizarDrive(leerCampo('producto'));
        if (producto) { prod.src = producto; prod.style.display = ''; }
        else { prod.removeAttribute('src'); prod.style.display = 'none'; }
        name.textContent = leerCampo('nombre') || 'NOMBRE';
        desc.textContent = leerCampo('descripcion') || 'Descripción';
        cta.textContent = leerCampo('cta') || 'Ver productos';
        card.dataset.alinear = d.alinear;
        card.style.setProperty('--velo', (d.velo / 100).toFixed(2));
        card.style.setProperty('--velo-hover', (d.veloHover / 100).toFixed(2));
        card.style.setProperty('--velo-rgb', hexToRgb(d.veloColor, '10 14 28'));
        bg.style.filter = d.fondoBlur > 0 ? `blur(${d.fondoBlur}px)` : '';
        bg.style.transform = d.fondoBlur > 0 ? 'scale(1.08)' : '';
        name.style.fontSize = d.tituloTam + 'px';
        desc.style.fontSize = d.descTam + 'px';
        name.style.transform = `translate(${d.textoX}%, ${d.textoY}%)`;
        desc.style.transform = `translate(${d.textoX}%, ${d.textoY}%)`;
        prod.style.width = d.prodTam + '%';
        prod.style.transform = `translate(${d.prodX}%, ${d.prodY}%) scale(${d.prodSX}, ${d.prodSY})`;
        ['prodTam', 'prodX', 'prodY', 'tituloTam', 'descTam', 'velo', 'veloHover', 'fondoBlur'].forEach(k => {
            const b = q(`[data-v-${k}]`);
            if (b) b.textContent = d[k] + (SUF[k] || '');
            const r = q(`[data-c-${k}]`);
            if (r && document.activeElement !== r) r.value = d[k];
        });
        if (sub) sub.textContent = 'Banner · ' + (leerCampo('nombre') || 'Bloque');
        const colVelo = q('[data-c-veloColor]');
        if (colVelo && document.activeElement !== colVelo) colVelo.value = d.veloColor;
        const hexVelo = q('[data-v-veloColor]');
        if (hexVelo) hexVelo.textContent = d.veloColor;
        raiz.querySelectorAll('[data-c-alinear] [data-al]').forEach(b2 => {
            b2.classList.toggle('is-sel', b2.dataset.al === d.alinear);
        });
    };

    ['prodTam', 'prodX', 'prodY', 'tituloTam', 'descTam', 'velo', 'veloHover', 'fondoBlur'].forEach(k => {
        const r = q(`[data-c-${k}]`);
        if (r) r.addEventListener('input', () => { d[k] = Number(r.value); pintar(); });
    });
    const colVelo = q('[data-c-veloColor]');
    if (colVelo) colVelo.addEventListener('input', () => { d.veloColor = colVelo.value.toUpperCase(); pintar(); });
    raiz.querySelectorAll('[data-c-alinear] [data-al]').forEach(b2 => {
        b2.addEventListener('click', () => { d.alinear = b2.dataset.al; pintar(); });
    });
    const sim = q('[data-sim-hover]');
    if (sim) sim.addEventListener('change', () => card.classList.toggle('is-hover', sim.checked));

    // Arrastre manual sobre el preview (como en Pixlr): producto y textos se mueven
    // con el mouse/dedo y los sliders se sincronizan solos.
    const limitar = (v, a, b) => Math.min(b, Math.max(a, v));
    const hacerArrastrable = (els, kx, ky, minX, maxX, minY, maxY) => {
        (Array.isArray(els) ? els : [els]).forEach(el => {
            if (!el) return;
            el.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                raiz.querySelectorAll('[data-drag].is-sel').forEach(x => x.classList.remove('is-sel'));
                (Array.isArray(els) ? els : [els]).forEach(x => x && x.classList.add('is-sel'));
                const r = card.getBoundingClientRect();
                if (!r.width || !r.height) return;
                const sx = e.clientX, sy = e.clientY, ox = d[kx], oy = d[ky];
                const mover = (ev) => {
                    d[kx] = Math.round(limitar(ox + (ev.clientX - sx) / r.width * 100, minX, maxX));
                    d[ky] = Math.round(limitar(oy + (ev.clientY - sy) / r.height * 100, minY, maxY));
                    pintar();
                };
                const soltar = () => {
                    window.removeEventListener('pointermove', mover);
                    window.removeEventListener('pointerup', soltar);
                    window.removeEventListener('pointercancel', soltar);
                };
                window.addEventListener('pointermove', mover);
                window.addEventListener('pointerup', soltar);
                window.addEventListener('pointercancel', soltar);
            });
        });
    };
    hacerArrastrable(prod, 'prodX', 'prodY', -60, 60, -50, 50);
    hacerArrastrable([name, desc], 'textoX', 'textoY', -30, 30, -30, 30);

    const cerrar = () => raiz.remove();
    q('[data-diseno-x]').addEventListener('click', cerrar);
    q('[data-diseno-cancel]').addEventListener('click', cerrar);
    raiz.addEventListener('click', (e) => { if (e.target === raiz) cerrar(); });
    raiz.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); cerrar(); } }, true);
    q('[data-diseno-reset]').addEventListener('click', () => {
        d = leerDiseno('');
        pintar();
    });
    q('[data-diseno-ok]').addEventListener('click', () => {
        if (oculto) oculto.value = JSON.stringify(d);
        if (alAplicar) alAplicar();
        cerrar();
        showToast('Diseño aplicado. Pulsa Guardar bloque.', 'success');
    });

    document.body.appendChild(raiz);
    pintar();
}

// Refleja el valor guardado en el cuadrito del picker
function pintarMediaTile(clave, valor) {
    const media = formCampos.querySelector(`[data-media="${clave}"]`);
    if (!media) return;
    const url = normalizarDrive(String(valor || '').trim());
    const img = media.querySelector('[data-media-img]');
    const vacio = media.querySelector('[data-media-vacio]');
    if (img) {
        if (url) { img.src = url; img.hidden = false; }
        else { img.removeAttribute('src'); img.hidden = true; }
    }
    if (vacio) vacio.hidden = !!url;
}

// Pickers visuales fondo/producto: cuadrito con overlay + cuadrito de origen URL/PC
function initMediaPickers() {
    const cerrarTodos = (salvo) => {
        formCampos.querySelectorAll('[data-picker]').forEach(p => {
            if (p !== salvo) p.hidden = true;
        });
    };

    formCampos.querySelectorAll('[data-media]').forEach(media => {
        const clave = media.dataset.media;
        const tile = media.querySelector('[data-media-tile]');
        const picker = media.querySelector('[data-picker]');
        const oculto = media.querySelector(`input[data-k="${clave}"]`);
        const urlInput = media.querySelector('[data-picker-url]');
        const fileInput = media.querySelector('[data-picker-file]');
        const drop = media.querySelector('[data-picker-drop]');
        const estadoEl = media.querySelector('[data-picker-estado]');
        let inicial = oculto ? oculto.value : '';

        const fijar = (valor) => {
            const v = normalizarDrive(String(valor || '').trim());
            if (oculto) {
                oculto.value = v;
                oculto.dispatchEvent(new Event('input', { bubbles: true }));
            }
            pintarMediaTile(clave, v);
        };

        const abrir = () => {
            cerrarTodos(picker);
            inicial = oculto ? oculto.value : '';
            if (urlInput && oculto) urlInput.value = oculto.value || '';
            if (estadoEl) estadoEl.textContent = '';
            picker.hidden = false;
            const tabUrl = picker.querySelector('[data-picker-tab="url"]');
            if (tabUrl) tabUrl.click();
            setTimeout(() => { if (urlInput) urlInput.focus(); }, 30);
        };

        if (tile) tile.addEventListener('click', (e) => {
            e.stopPropagation();
            if (picker.hidden) abrir();
            else picker.hidden = true;
        });
        picker.addEventListener('click', (e) => e.stopPropagation());

        picker.querySelectorAll('[data-picker-tab]').forEach(tab => {
            tab.addEventListener('click', () => {
                picker.querySelectorAll('[data-picker-tab]').forEach(t => t.classList.remove('is-active'));
                tab.classList.add('is-active');
                const cual = tab.dataset.pickerTab;
                picker.querySelectorAll('[data-picker-panel]').forEach(p => {
                    p.hidden = p.dataset.pickerPanel !== cual;
                });
            });
        });

        // Comprueba que la URL cargue como imagen (evita pegar páginas como pinterest.com/...)
        const probarImagen = (url) => new Promise((res) => {
            const im = new Image();
            const t = setTimeout(() => res(false), 9000);
            im.onload = () => { clearTimeout(t); res(true); };
            im.onerror = () => { clearTimeout(t); res(false); };
            im.src = url;
        });

        const btnUsar = picker.querySelector('[data-picker-usar]');
        if (btnUsar) btnUsar.addEventListener('click', async () => {
            if (!urlInput || !urlInput.value.trim()) {
                showToast('Pega primero una URL', 'error');
                return;
            }
            const v = normalizarDrive(urlInput.value.trim());
            btnUsar.disabled = true;
            try {
                const ok = await probarImagen(v);
                if (!ok) {
                    showToast('Esa URL no carga como imagen (usa el enlace directo .jpg/.png)', 'error');
                    if (estadoEl) estadoEl.textContent = 'No carga como imagen. Prueba con enlace directo o súbela desde tu PC.';
                    return;
                }
                fijar(v);
                if (estadoEl) estadoEl.textContent = '';
                showToast('Imagen actualizada. Pulsa Listo.', 'success');
            } finally {
                btnUsar.disabled = false;
            }
        });
        if (urlInput) {
            urlInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); if (btnUsar) btnUsar.click(); }
            });
            // Preview en vivo mientras escribes/pegas (sin guardar hasta Usar enlace/Listo)
            let turno = 0;
            urlInput.addEventListener('input', async () => {
                const v = normalizarDrive(urlInput.value.trim());
                const mi = ++turno;
                const img = media.querySelector('[data-media-img]');
                const vacio = media.querySelector('[data-media-vacio]');
                if (!v) {
                    pintarMediaTile(clave, oculto ? oculto.value : '');
                    if (estadoEl) estadoEl.textContent = '';
                    return;
                }
                const ok = await probarImagen(v);
                if (mi !== turno) return;
                if (ok) {
                    if (img) { img.src = v; img.hidden = false; }
                    if (vacio) vacio.hidden = true;
                    if (estadoEl) estadoEl.textContent = 'Vista previa lista. Pulsa Usar enlace para guardar.';
                } else {
                    if (img) { img.removeAttribute('src'); img.hidden = true; }
                    if (vacio) vacio.hidden = false;
                    if (estadoEl) estadoEl.textContent = 'Esa URL no carga como imagen (usa enlace directo .jpg/.png).';
                }
            });
        }

        const subirArchivoPicker = async (file) => {
            if (!file) return;
            if (estadoEl) estadoEl.textContent = 'Subiendo…';
            try {
                const url = await subirImagen(file);
                fijar(url);
                if (urlInput) urlInput.value = url;
                if (estadoEl) estadoEl.textContent = 'Subido: ' + url;
                showToast('Imagen subida correctamente', 'success');
            } catch (err) {
                if (estadoEl) estadoEl.textContent = '';
                showToast(err.message, 'error');
            }
        };
        if (fileInput) fileInput.addEventListener('change', async () => {
            await subirArchivoPicker(fileInput.files && fileInput.files[0]);
            fileInput.value = '';
        });
        if (drop) {
            drop.addEventListener('click', () => { if (fileInput) fileInput.click(); });
            ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, (e) => {
                e.preventDefault();
                drop.classList.add('is-drag');
            }));
            ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, (e) => {
                e.preventDefault();
                drop.classList.remove('is-drag');
            }));
            drop.addEventListener('drop', async (e) => {
                const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
                await subirArchivoPicker(f);
            });
        }

        const btnListo = picker.querySelector('[data-picker-listo]');
        if (btnListo) btnListo.addEventListener('click', () => { picker.hidden = true; });
        const btnQuitar = picker.querySelector('[data-picker-quitar]');
        if (btnQuitar) btnQuitar.addEventListener('click', () => {
            fijar('');
            if (urlInput) urlInput.value = '';
            picker.hidden = true;
            showToast('Imagen quitada. Se usará el color base.', 'info');
        });
        const btnCancelar = picker.querySelector('[data-picker-cancelar]');
        if (btnCancelar) btnCancelar.addEventListener('click', () => {
            fijar(inicial);
            if (urlInput) urlInput.value = inicial || '';
            picker.hidden = true;
        });
    });

    if (!initMediaPickers._doc) {
        initMediaPickers._doc = true;
        document.addEventListener('click', (e) => {
            if (!modal || modal.classList.contains('hidden')) return;
            if (e.target.closest('[data-picker], [data-media-tile]')) return;
            formCampos.querySelectorAll('[data-picker]').forEach(p => { p.hidden = true; });
        });
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape' || !modal || modal.classList.contains('hidden')) return;
            const abierto = formCampos.querySelector('[data-picker]:not([hidden])');
            if (abierto) { abierto.hidden = true; e.stopPropagation(); }
        }, true);
    }
}

async function subirImagen(file) {
    if (file.size > 5 * 1024 * 1024) throw new Error('El archivo supera los 5MB');
    const fd = new FormData();
    fd.append('archivo', file);
    const token = api.getToken();
    const res = await fetch('/api/sitio/uploads', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: fd
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error((data && data.mensaje) || `Error subiendo (${res.status})`);
    const url = data && data.datos && data.datos.url;
    if (!url) throw new Error('Respuesta inválida del servidor');
    return url;
}

function cerrarEditor() {
    modal.classList.add('hidden');
    bloquearFondo(false);
    editorTipo = null;
    editorIdx = -1;
}

function guardarBloque(e) {
    e.preventDefault();
    if (!editorTipo) return;
    const ed = EDITORES[editorTipo];
    const item = editorIdx >= 0 ? { ...estado[ed.lista][editorIdx] } : {};
    formCampos.querySelectorAll('[data-k]').forEach(input => {
        if (input.type === 'checkbox') {
            item[input.dataset.k] = input.checked;
        } else if (input.dataset.k === 'imagen' || input.dataset.k === 'icono' || input.dataset.k === 'fondo' || input.dataset.k === 'producto') {
            item[input.dataset.k] = normalizarDrive(input.value.trim());
        } else {
            item[input.dataset.k] = input.value.trim();
        }
    });
    // Compat: los campos nuevos mandan; el legacy solo los espeja (vacío también se espeja,
    // así borrar el enlace sí lo borra y el home usa el color base).
    if (editorTipo === 'equipos') {
        item.fondo = item.fondo || '';
        item.producto = item.producto || '';
        item.imagen = item.fondo;
        if (item.producto) item.icono = item.producto;
        else if (!String(item.icono || '').trim().startsWith('<svg')) item.icono = '';
    }
    if (editorIdx >= 0) {
        estado[ed.lista][editorIdx] = item;
    } else {
        estado[ed.lista].push(item);
    }
    cerrarEditor();
    repintarTodo();
    showToast('Bloque listo. Pulsa Guardar en su sección para publicarlo.', 'info');
}

async function guardarSeccion(cual, btn) {
    const payload = {};
    if (cual === 'general') {
        payload['site.nombre'] = document.getElementById('ap-nombre').value.trim() || 'ELECTRONIX';
        payload['site.logo'] = normalizarDrive(document.getElementById('ap-logo').value.trim()) || '/assets/img/logo.svg';
        payload['tema.primario'] = document.getElementById('ap-primario').value;
        payload['tema.secundario'] = document.getElementById('ap-secundario').value;
    } else if (cual === 'hero') {
        payload['hero.slides'] = JSON.stringify(estado.hero);
    } else if (cual === 'cards') {
        payload['home.cards'] = JSON.stringify(estado.cards);
    } else if (cual === 'equipos') {
        payload['home.equipos.titulo'] = document.getElementById('ap-equipos-titulo').value.trim();
        payload['home.equipos'] = JSON.stringify(estado.equipos);
        estado.equiposTitulo = payload['home.equipos.titulo'];
    } else if (cual === 'banners') {
        payload['home.banners'] = JSON.stringify(estado.banners);
    } else if (cual === 'spot') {
        payload['home.spotlight'] = JSON.stringify(estado.spot);
    }

    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Guardando…';
    try {
        await api.put('/api/sitio', payload);
        limpiarCacheSitio();
        showToast('Apariencia publicada correctamente', 'success');
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = original;
    }
}
