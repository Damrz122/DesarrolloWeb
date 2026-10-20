import { api } from '/assets/js/api.js';
import { auth } from '/assets/js/auth.js';
import { renderAdminShell } from '/assets/js/ui/adminShell.js';
import { showToast } from '/assets/js/ui/toast.js';

const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const pencil = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
const lock = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>';
const power = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v10"/><path d="M6.2 5.2a9 9 0 1 0 11.6 0"/></svg>';
let monedas = [], metodos = [], roles = [], permisos = [], tasas = [];
let modalState = null;

renderAdminShell('configuracion');
if (auth.protegerRutaAdmin()) init();

function init() {
    $('cfg-refresh').onclick = () => cargar().catch(mostrarError);
    $('btn-nueva-moneda').onclick = () => abrirModal('moneda');
    $('btn-nueva-tasa').onclick = () => abrirModal('tasa');
    $('btn-nuevo-metodo').onclick = () => abrirModal('metodo');
    $('btn-nuevo-rol').onclick = () => abrirModal('rol');
    $('cfg-modal-close').onclick = cerrarModal;
    $('cfg-modal-cancel').onclick = cerrarModal;
    $('cfg-modal').onclick = e => { if (e.target === $('cfg-modal')) cerrarModal(); };
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && modalState) cerrarModal(); });
    $('cfg-form').onsubmit = guardar;
    cargar().catch(mostrarError);
}

function mostrarError(error) { const mensaje = error?.message || 'No se pudo cargar la configuración'; $('cfg-error').textContent = mensaje; showToast(mensaje, 'error'); }
async function cargar() {
    const respuestas = await Promise.all(['monedas','metodos-pago','roles','permisos','tipos-cambio'].map(x => api.get('/api/admin/configuracion/' + x)));
    [monedas, metodos, roles, permisos, tasas] = respuestas.map(x => x.datos || []);
    $('cfg-error').textContent = ''; renderizar();
}

function renderizar() {
    pintarMonedas(); pintarTasas(); pintarMetodos(); pintarRoles();
}
function vacio(texto) { return `<div class="cfg-empty">${esc(texto)}</div>`; }
function tarjeta({icono, titulo, codigo, clave = codigo, detalle, estado, accion, bloqueada = false, accionTitulo = 'Editar'}) {
    return `<article class="cfg-item-card"><div class="cfg-item-top"><span class="cfg-item-icon">${icono}</span><div class="cfg-item-title"><strong>${esc(titulo)}</strong><code>${esc(codigo)}</code></div>${bloqueada ? `<span class="cfg-lock" title="Elemento protegido">${lock}</span>` : `<button class="cfg-icon-btn" type="button" data-action="${accion}" data-code="${esc(clave)}" aria-label="${accionTitulo} ${esc(titulo)}" title="${accionTitulo}">${accion === 'toggle-rate' ? power : pencil}</button>`}</div><p class="cfg-item-detail">${esc(detalle)}</p><span class="cfg-status ${estado ? 'is-active' : 'is-inactive'}"><i></i>${estado ? 'Activo' : 'Inactivo'}</span></article>`;
}
function enlazar(contenedor, selector, callback) { $(contenedor).querySelectorAll(selector).forEach(b => b.onclick = () => callback(b.dataset.code)); }
function pintarMonedas() {
    $('lista-monedas').innerHTML = monedas.length ? monedas.map(m => tarjeta({icono:'¤',titulo:m.nombre,codigo:m.codigo,detalle:`${m.simbolo} · ${m.decimales} decimales · ${m.locale}`,estado:m.activa,accion:'edit-moneda'})).join('') : vacio('Aún no hay monedas registradas.');
    enlazar('lista-monedas','[data-action="edit-moneda"]', codigo => abrirModal('moneda', monedas.find(m => m.codigo === codigo)));
}
function pintarTasas() {
    $('lista-tasas').innerHTML = tasas.length ? [...tasas].sort((a,b) => String(b.vigenteDesde).localeCompare(String(a.vigenteDesde))).map(t => tarjeta({icono:'↔',titulo:`1 ${t.monedaOrigen}`,codigo:`${t.tasa} ${t.monedaDestino}`,clave:t.id,detalle:`Vigente desde ${formatearFecha(t.vigenteDesde)}`,estado:t.activo,accion:'toggle-rate',accionTitulo:t.activo ? 'Desactivar cotización' : 'Activar cotización'})).join('') : vacio('Registra una cotización cuando uses más de una moneda.');
    enlazar('lista-tasas','[data-action="toggle-rate"]', codigo => cambiarTasa(Number(codigo)));
}
function pintarMetodos() {
    $('lista-metodos').innerHTML = metodos.length ? [...metodos].sort((a,b) => a.orden - b.orden).map(m => tarjeta({icono:iconoMetodo(m.icono),titulo:m.nombre,codigo:m.codigo,detalle:`${(m.monedas || []).join(' · ') || 'Sin monedas'} · ${textoProceso(m.procesamiento)}`,estado:m.activo,accion:'edit-metodo'})).join('') : vacio('Aún no hay métodos de pago.');
    enlazar('lista-metodos','[data-action="edit-metodo"]', codigo => abrirModal('metodo', metodos.find(m => m.codigo === codigo)));
}
function pintarRoles() {
    $('lista-roles').innerHTML = roles.length ? roles.map(r => tarjeta({icono:r.sistema ? '★' : '♙',titulo:r.nombre,codigo:r.codigo,detalle:`${(r.permisos || []).length} permisos${r.sistema ? ' · Rol del sistema' : ''}`,estado:r.activo,accion:'edit-rol',bloqueada:r.sistema})).join('') : vacio('Aún no hay roles creados.');
    enlazar('lista-roles','[data-action="edit-rol"]', codigo => abrirModal('rol', roles.find(r => r.codigo === codigo)));
}
function formatearFecha(valor) { try { return new Intl.DateTimeFormat('es-PE',{dateStyle:'medium',timeStyle:'short'}).format(new Date(valor)); } catch { return valor || '—'; } }
function textoProceso(valor) { return ({SIMULADO:'Simulado', VERIFICACION_MANUAL:'Verificación manual', CONTRA_ENTREGA:'Contra entrega'})[valor] || valor; }
function iconoMetodo(icono) { return ({TARJETA:'▣',TRANSFERENCIA:'⇄',ENTREGA:'□',YAPE:'Y',PLIN:'P'})[icono] || '¤'; }
function opcionesMoneda(seleccionada = '') { return monedas.map(m => `<option value="${esc(m.codigo)}" ${m.codigo === seleccionada ? 'selected' : ''}>${esc(m.codigo)} · ${esc(m.nombre)}</option>`).join(''); }
function campo(id, etiqueta, tipo = 'text', valor = '', extras = '') { return `<label class="adm-field"><span class="adm-label">${etiqueta}</span><input id="${id}" class="adm-input" type="${tipo}" value="${esc(valor)}" ${extras}></label>`; }

function abrirModal(tipo, datos = null) {
    modalState = { tipo, id: datos?.codigo || null };
    $('cfg-modal-error').textContent = ''; $('cfg-form').innerHTML = '';
    const editando = Boolean(datos);
    const titulos = {moneda: editando ? 'Editar moneda' : 'Nueva moneda', tasa:'Registrar cotización', metodo: editando ? 'Editar método de pago' : 'Nuevo método de pago', rol: editando ? 'Editar rol' : 'Nuevo rol'};
    $('cfg-modal-title').textContent = titulos[tipo];
    $('cfg-modal-kicker').textContent = editando ? 'EDITAR CONFIGURACIÓN' : 'NUEVA CONFIGURACIÓN';
    $('cfg-modal-help').textContent = ({moneda:'PEN es la moneda contable base.',tasa:'Una nueva tasa no modifica pedidos ya registrados.',metodo:'No solicites datos de tarjeta, CVV ni contraseñas.',rol:'Los permisos se aplican en la siguiente petición.'})[tipo];
    if (tipo === 'moneda') formularioMoneda(datos || {});
    if (tipo === 'tasa') formularioTasa();
    if (tipo === 'metodo') formularioMetodo(datos || {});
    if (tipo === 'rol') formularioRol(datos || {});
    $('cfg-modal').classList.remove('hidden'); document.body.style.overflow = 'hidden';
    $('cfg-form').querySelector('input,select,textarea')?.focus();
}
function cerrarModal() { $('cfg-modal').classList.add('hidden'); document.body.style.overflow = ''; modalState = null; }
function formularioMoneda(m = {}) {
    $('cfg-form').innerHTML = `<div class="cfg-form-grid">${campo('mon-codigo','Código ISO','text',m.codigo || '','maxlength="3" required')}${campo('mon-nombre','Nombre','text',m.nombre || '','required')}${campo('mon-simbolo','Símbolo','text',m.simbolo || '','required')}${campo('mon-locale','Locale','text',m.locale || 'es-PE','required')}${campo('mon-decimales','Decimales','number',m.decimales ?? 2,'min="0" max="4" required')}<label class="cfg-switch"><input id="mon-activa" type="checkbox" ${m.activa !== false ? 'checked' : ''}><span></span>Moneda activa</label></div>`;
    if (m.codigo) $('mon-codigo').disabled = true;
    $('mon-codigo').onchange = () => { try { $('mon-decimales').value = new Intl.NumberFormat('es-PE',{style:'currency',currency:$('mon-codigo').value.toUpperCase()}).resolvedOptions().maximumFractionDigits; } catch {} };
}
function formularioTasa() {
    $('cfg-form').innerHTML = `<div class="cfg-form-grid"><label class="adm-field"><span class="adm-label">Moneda de origen</span><select id="tasa-origen" class="adm-select">${opcionesMoneda()}</select></label><label class="adm-field"><span class="adm-label">Moneda de destino</span><select id="tasa-destino" class="adm-select">${opcionesMoneda(monedas[1]?.codigo || '')}</select></label>${campo('tasa-valor','Tasa','number','','min="0.00000001" step="0.00000001" required')}${campo('tasa-fecha','Vigente desde (opcional)','datetime-local')}</div>`;
}
function formularioMetodo(m = {}) {
    const aceptadas = new Set(m.monedas || []);
    $('cfg-form').innerHTML = `<div class="cfg-form-grid">${campo('met-codigo','Código','text',m.codigo || '','maxlength="50" required')}${campo('met-nombre','Nombre visible','text',m.nombre || '','required')}<label class="adm-field"><span class="adm-label">Procesamiento</span><select id="met-procesamiento" class="adm-select"><option value="VERIFICACION_MANUAL" ${m.procesamiento === 'VERIFICACION_MANUAL' ? 'selected' : ''}>Verificación manual</option><option value="SIMULADO" ${m.procesamiento === 'SIMULADO' ? 'selected' : ''}>Simulado</option><option value="CONTRA_ENTREGA" ${m.procesamiento === 'CONTRA_ENTREGA' ? 'selected' : ''}>Contra entrega</option></select></label>${campo('met-orden','Orden','number',m.orden ?? 10,'min="0" required')}${campo('met-prefijo','Prefijo de transacción','text',m.prefijoTransaccion || 'TX-')}${campo('met-referencia','Etiqueta de referencia','text',m.etiquetaReferencia || '')}<label class="adm-field"><span class="adm-label">Icono</span><select id="met-icono" class="adm-select">${['PAGO','TARJETA','TRANSFERENCIA','ENTREGA','YAPE','PLIN'].map(x => `<option value="${x}" ${m.icono === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label><label class="adm-field adm-field--full"><span class="adm-label">Descripción</span><input id="met-descripcion" class="adm-input" value="${esc(m.descripcion || '')}"></label><label class="adm-field adm-field--full"><span class="adm-label">Instrucciones para el cliente</span><textarea id="met-instrucciones" class="adm-textarea" rows="3">${esc(m.instrucciones || '')}</textarea></label><div class="cfg-check-row adm-field--full"><label class="cfg-switch"><input id="met-activo" type="checkbox" ${m.activo !== false ? 'checked' : ''}><span></span>Activo</label><label class="cfg-switch"><input id="met-requiere" type="checkbox" ${m.requiereReferencia ? 'checked' : ''}><span></span>Exigir referencia</label></div><fieldset class="cfg-fieldset adm-field--full"><legend>Monedas aceptadas</legend><div class="cfg-check-grid">${monedas.map(x => `<label><input type="checkbox" value="${esc(x.codigo)}" ${aceptadas.has(x.codigo) ? 'checked' : ''}>${esc(x.codigo)}</label>`).join('')}</div></fieldset><section class="cfg-extra-fields adm-field--full"><div><strong>Campos adicionales</strong><p>Solo datos no sensibles, como número de operación.</p></div><div id="met-campos"></div><button id="campo-agregar" type="button" class="adm-btn adm-btn-ghost">+ Agregar campo</button></section></div>`;
    if (m.codigo) $('met-codigo').disabled = true;
    $('campo-agregar').onclick = () => agregarCampo();
    try { JSON.parse(m.formularioJson || '[]').forEach(agregarCampo); } catch { showToast('El formulario guardado tiene formato inválido', 'warning'); }
}
function formularioRol(r = {}) {
    const asignados = new Set(r.permisos || []);
    $('cfg-form').innerHTML = `<div class="cfg-form-grid">${campo('rol-codigo','Código','text',r.codigo || '','maxlength="40" required')}${campo('rol-nombre','Nombre','text',r.nombre || '','required')}<label class="adm-field adm-field--full"><span class="adm-label">Descripción</span><input id="rol-descripcion" class="adm-input" value="${esc(r.descripcion || '')}"></label><label class="cfg-switch"><input id="rol-activo" type="checkbox" ${r.activo !== false ? 'checked' : ''}><span></span>Rol activo</label><fieldset class="cfg-fieldset adm-field--full"><legend>Permisos</legend><div id="rol-permisos" class="cfg-check-grid">${[...permisos].sort().map(p => `<label><input type="checkbox" value="${esc(p)}" ${asignados.has(p) ? 'checked' : ''}>${esc(p.replaceAll('_',' '))}</label>`).join('')}</div></fieldset></div>`;
    if (r.codigo) $('rol-codigo').disabled = true;
}
function agregarCampo(c = {}) {
    const fila = document.createElement('div'); fila.className = 'cfg-extra-row';
    fila.innerHTML = `<input class="adm-input" placeholder="Clave" data-k="clave" value="${esc(c.clave || '')}"><input class="adm-input" placeholder="Etiqueta" data-k="etiqueta" value="${esc(c.etiqueta || '')}"><select class="adm-select" data-k="tipo">${['text','tel','select','date','textarea'].map(t => `<option value="${t}" ${c.tipo === t ? 'selected' : ''}>${t}</option>`).join('')}</select><label class="cfg-required"><input type="checkbox" data-k="obligatorio" ${c.obligatorio ? 'checked' : ''}> Oblig.</label><input class="adm-input" type="number" min="1" max="1000" placeholder="Máx." data-k="maxLongitud" value="${Number(c.maxLongitud) || 100}"><input class="adm-input" placeholder="Opciones con |" data-k="opciones" value="${esc((c.opciones || []).join('|'))}"><button class="cfg-remove-field" type="button" aria-label="Quitar campo">×</button>`;
    fila.querySelector('button').onclick = () => fila.remove(); $('met-campos').append(fila);
}
function valor(id) { return $(id).value.trim(); }
async function guardar(e) {
    e.preventDefault(); if (!modalState) return;
    const {tipo, id} = modalState; const boton = $('cfg-modal-save'); boton.disabled = true; $('cfg-modal-error').textContent = '';
    try {
        let endpoint, datos, metodo = id ? 'put' : 'post';
        if (tipo === 'moneda') { endpoint = 'monedas'; datos = {codigo:valor('mon-codigo'),nombre:valor('mon-nombre'),simbolo:valor('mon-simbolo'),locale:valor('mon-locale'),decimales:Number(valor('mon-decimales')),activa:$('mon-activa').checked}; }
        if (tipo === 'tasa') { endpoint = 'tipos-cambio'; datos = {monedaOrigen:valor('tasa-origen'),monedaDestino:valor('tasa-destino'),tasa:valor('tasa-valor'),vigenteDesde:valor('tasa-fecha') || null}; metodo = 'post'; }
        if (tipo === 'rol') { endpoint = 'roles'; datos = {codigo:valor('rol-codigo'),nombre:valor('rol-nombre'),descripcion:valor('rol-descripcion'),activo:$('rol-activo').checked,permisos:[...document.querySelectorAll('#rol-permisos input:checked')].map(x => x.value)}; }
        if (tipo === 'metodo') { endpoint = 'metodos-pago'; datos = datosMetodo(); }
        await api[metodo]('/api/admin/configuracion/' + endpoint + (id ? '/' + encodeURIComponent(id) : ''), datos);
        showToast(tipo === 'tasa' ? 'Cotización registrada' : 'Configuración guardada', 'success'); cerrarModal(); await cargar();
    } catch (error) { $('cfg-modal-error').textContent = error.message || 'No se pudo guardar'; } finally { boton.disabled = false; }
}
function datosMetodo() {
    const campos = [...$('met-campos').children].map(f => { const dato = k => f.querySelector(`[data-k="${k}"]`); return {clave:dato('clave').value.trim(),etiqueta:dato('etiqueta').value.trim(),tipo:dato('tipo').value,obligatorio:dato('obligatorio').checked,maxLongitud:Number(dato('maxLongitud').value),opciones:dato('opciones').value ? dato('opciones').value.split('|').map(x => x.trim()) : []}; });
    return {codigo:valor('met-codigo'),nombre:valor('met-nombre'),descripcion:valor('met-descripcion'),instrucciones:valor('met-instrucciones'),procesamiento:valor('met-procesamiento'),requiereReferencia:$('met-requiere').checked,etiquetaReferencia:valor('met-referencia'),prefijoTransaccion:valor('met-prefijo'),icono:valor('met-icono'),orden:Number(valor('met-orden')),activo:$('met-activo').checked,monedas:[...document.querySelectorAll('.cfg-fieldset input:checked')].map(x => x.value),formularioJson:JSON.stringify(campos)};
}
async function cambiarTasa(id) { const tasa = tasas.find(t => Number(t.id) === id); if (!tasa) return; try { await api.patch('/api/admin/configuracion/tipos-cambio/' + id, {activo:!tasa.activo}); showToast('Estado de cotización actualizado','success'); await cargar(); } catch (error) { mostrarError(error); } }
