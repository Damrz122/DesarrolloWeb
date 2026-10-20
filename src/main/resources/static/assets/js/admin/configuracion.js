import { api } from '/assets/js/api.js';
import { auth } from '/assets/js/auth.js';
import { renderAdminShell } from '/assets/js/ui/adminShell.js';
import { showToast } from '/assets/js/ui/toast.js';

const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
let monedas = [], metodos = [], roles = [], permisos = [], tasas = [];
let monedaEditada = null, metodoEditado = null, rolEditado = null;
const campo = (id,label,tipo='text',valor='') => `<div class="adm-field"><label class="adm-label" for="${id}">${label}</label><input id="${id}" class="adm-input" type="${tipo}" value="${esc(valor)}"></div>`;
const acciones = texto => `<div class="adm-field adm-field--full cfg-actions"><button class="adm-btn adm-btn-primary" type="submit">${texto}</button><button class="adm-btn" type="reset">Cancelar edición</button></div>`;
const opcionesMoneda = () => monedas.map(m=>`<option value="${esc(m.codigo)}">${esc(m.codigo)} · ${esc(m.nombre)}</option>`).join('');
const val = id => $(id).value.trim();

renderAdminShell('configuracion');
if (auth.protegerRutaAdmin()) {
    $('cfg-refresh').onclick = () => cargar().catch(error);
    await cargar().catch(error);
}
function error(e) { $('cfg-error').textContent = e.message; showToast(e.message,'error'); }
async function cargar() {
    const r = await Promise.all(['monedas','metodos-pago','roles','permisos','tipos-cambio'].map(x=>api.get('/api/admin/configuracion/'+x)));
    [monedas, metodos, roles, permisos, tasas] = r.map(x=>x.datos || []);
    $('cfg-error').textContent = ''; formularios(); listas();
}
function formularios() {
    monedaEditada = metodoEditado = rolEditado = null;
    $('form-moneda').innerHTML = campo('mon-codigo','Código ISO')+campo('mon-nombre','Nombre')+campo('mon-simbolo','Símbolo')+campo('mon-locale','Locale','text','es-PE')+campo('mon-decimales','Decimales','number',2)+`<label><input id="mon-activa" type="checkbox" checked> Activa</label>`+acciones('Guardar moneda');
    $('mon-decimales').min=0; $('mon-decimales').max=4;
    $('mon-codigo').onchange = () => { try { $('mon-decimales').value = new Intl.NumberFormat('es-PE',{style:'currency',currency:val('mon-codigo').toUpperCase()}).resolvedOptions().maximumFractionDigits; } catch {} };
    $('form-tasa').innerHTML = `<div class="adm-field"><label class="adm-label" for="tasa-origen">Origen</label><select class="adm-select" id="tasa-origen">${opcionesMoneda()}</select></div><div class="adm-field"><label class="adm-label" for="tasa-destino">Destino</label><select class="adm-select" id="tasa-destino">${opcionesMoneda()}</select></div>`+campo('tasa-valor','Tasa','number')+campo('tasa-fecha','Vigente desde (opcional)','datetime-local')+acciones('Registrar cotización');
    $('tasa-valor').step='0.00000001'; $('tasa-valor').min='0.00000001';
    $('form-metodo').innerHTML = campo('met-codigo','Código')+campo('met-nombre','Nombre')+campo('met-descripcion','Descripción')+`<div class="adm-field"><label class="adm-label" for="met-procesamiento">Procesamiento</label><select class="adm-select" id="met-procesamiento"><option value="VERIFICACION_MANUAL">Verificación manual</option><option value="SIMULADO">Simulado</option><option value="CONTRA_ENTREGA">Contra entrega</option></select></div>`+campo('met-orden','Orden','number',10)+campo('met-prefijo','Prefijo de transacción','text','TX-')+campo('met-referencia','Etiqueta de referencia')+`<div class="adm-field"><label class="adm-label" for="met-icono">Icono</label><select id="met-icono" class="adm-select">${['PAGO','TARJETA','TRANSFERENCIA','ENTREGA','YAPE','PLIN'].map(x=>`<option>${x}</option>`).join('')}</select></div><div class="adm-field adm-field--full"><label class="adm-label" for="met-instrucciones">Instrucciones</label><textarea id="met-instrucciones" class="adm-textarea"></textarea></div><div class="cfg-checks adm-field--full"><label><input id="met-activo" type="checkbox" checked> Activo</label><label><input id="met-requiere" type="checkbox"> Exigir referencia (6–100 caracteres)</label></div><fieldset class="adm-field--full"><legend>Monedas aceptadas</legend><div id="met-monedas" class="cfg-checks">${monedas.map(m=>`<label><input type="checkbox" value="${esc(m.codigo)}">${esc(m.codigo)}</label>`).join('')}</div></fieldset><div class="adm-field--full"><p class="cfg-hint">Campos adicionales: clave, etiqueta, tipo, obligatorio, longitud máxima y opciones separadas por |. No solicites datos de tarjeta o CVV.</p><div style="overflow:auto" id="met-campos"></div><button id="campo-agregar" class="adm-btn" type="button">Agregar campo</button></div>`+acciones('Guardar método');
    $('campo-agregar').onclick = () => agregarCampo();
    $('form-rol').innerHTML = campo('rol-codigo','Código')+campo('rol-nombre','Nombre')+campo('rol-descripcion','Descripción')+`<label><input id="rol-activo" type="checkbox" checked> Activo</label><fieldset class="adm-field--full"><legend>Permisos</legend><div id="rol-permisos" class="cfg-checks">${[...permisos].sort().map(p=>`<label><input type="checkbox" value="${esc(p)}">${esc(p.replaceAll('_',' '))}</label>`).join('')}</div></fieldset>`+acciones('Guardar rol');
    for (const id of ['form-moneda','form-tasa','form-metodo','form-rol']) $(id).onreset = () => setTimeout(formularios,0);
    $('form-moneda').onsubmit = guardarMoneda; $('form-metodo').onsubmit = guardarMetodo; $('form-rol').onsubmit = guardarRol; $('form-tasa').onsubmit = guardarTasa;
}
function agregarCampo(c={}) {
    const fila=document.createElement('div'); fila.className='cfg-field-row';
    fila.innerHTML=`<input class="adm-input" aria-label="Clave" placeholder="operacion" data-k="clave" value="${esc(c.clave)}"><input class="adm-input" aria-label="Etiqueta" placeholder="Etiqueta" data-k="etiqueta" value="${esc(c.etiqueta)}"><select class="adm-select" aria-label="Tipo" data-k="tipo">${['text','tel','select','date','textarea'].map(t=>`<option ${c.tipo===t?'selected':''}>${t}</option>`).join('')}</select><label><input type="checkbox" data-k="obligatorio" ${c.obligatorio?'checked':''}> Req.</label><input class="adm-input" type="number" aria-label="Longitud máxima" data-k="maxLongitud" min="1" max="1000" value="${Number(c.maxLongitud)||100}"><input class="adm-input" aria-label="Opciones" placeholder="Opción 1|Opción 2" data-k="opciones" value="${esc((c.opciones||[]).join('|'))}"><button type="button" class="adm-btn" aria-label="Quitar campo">×</button>`;
    fila.querySelector('button').onclick=()=>fila.remove(); $('met-campos').append(fila);
}
function filaLista(contenedor, texto, editar, cambioEstado) {
    const fila=document.createElement('div'); fila.className='cfg-row';
    const info=document.createElement('span'); info.textContent=texto; fila.append(info);
    const actions=document.createElement('div'); actions.className='cfg-actions'; fila.append(actions);
    if(editar){const b=document.createElement('button'); b.className='adm-btn';b.textContent='Editar';b.onclick=editar;actions.append(b);}
    if(cambioEstado){const b=document.createElement('button');b.className='adm-btn';b.textContent='Cambiar estado';b.onclick=()=>cambioEstado().catch(error);actions.append(b);}
    $(contenedor).append(fila);
}
function listas() {
    for(const id of ['lista-monedas','lista-metodos','lista-roles','lista-tasas']) $(id).replaceChildren();
    for(const m of monedas) filaLista('lista-monedas',`${m.codigo} · ${m.nombre} · ${m.decimales} decimales · ${m.activa?'Activa':'Inactiva'}`,()=>{ monedaEditada=m.codigo;for(const [k,v] of Object.entries({codigo:m.codigo,nombre:m.nombre,simbolo:m.simbolo,locale:m.locale,decimales:m.decimales})) $('mon-'+k).value=v;$('mon-activa').checked=m.activa;$('mon-codigo').disabled=true;$('form-moneda').scrollIntoView({block:'center'}); });
    for(const m of metodos.sort((a,b)=>a.orden-b.orden)) filaLista('lista-metodos',`${m.codigo} · ${m.nombre} · ${(m.monedas||[]).join(', ')} · ${m.activo?'Activo':'Inactivo'}`,()=>{metodoEditado=m.codigo;for(const [k,v] of Object.entries({codigo:m.codigo,nombre:m.nombre,descripcion:m.descripcion,procesamiento:m.procesamiento,orden:m.orden,prefijo:m.prefijoTransaccion,referencia:m.etiquetaReferencia,instrucciones:m.instrucciones,icono:m.icono})) $('met-'+k).value=v??'';$('met-activo').checked=m.activo;$('met-requiere').checked=m.requiereReferencia;$('met-codigo').disabled=true;document.querySelectorAll('#met-monedas input').forEach(i=>i.checked=m.monedas.includes(i.value));$('met-campos').replaceChildren();try{JSON.parse(m.formularioJson).forEach(agregarCampo);}catch{error(new Error('Formulario inválido en la base de datos'));}$('form-metodo').scrollIntoView({block:'center'});});
    for(const r of roles) filaLista('lista-roles',`${r.codigo} · ${r.nombre} · ${r.activo?'Activo':'Inactivo'}${r.sistema?' · Protegido':''}`,r.sistema?null:()=>{rolEditado=r.codigo;for(const k of ['codigo','nombre','descripcion']) $('rol-'+k).value=r[k]??'';$('rol-activo').checked=r.activo;$('rol-codigo').disabled=true;document.querySelectorAll('#rol-permisos input').forEach(i=>i.checked=r.permisos.includes(i.value));$('form-rol').scrollIntoView({block:'center'});});
    for(const t of tasas) filaLista('lista-tasas',`1 ${t.monedaOrigen} = ${t.tasa} ${t.monedaDestino} · ${t.vigenteDesde} · ${t.activo?'Activa':'Inactiva'}`,null,async()=>{await api.patch('/api/admin/configuracion/tipos-cambio/'+t.id,{activo:!t.activo});await cargar();});
}
async function enviar(form,tipo,editado,datos) {
    const b=form.querySelector('[type="submit"]'); b.disabled=true;
    try { const url='/api/admin/configuracion/'+tipo;await (editado?api.put(url+'/'+encodeURIComponent(editado),datos):api.post(url,datos));showToast('Configuración guardada','success');await cargar(); } catch(e){error(e);}finally{b.disabled=false;}
}
function guardarMoneda(e){e.preventDefault();return enviar(e.target,'monedas',monedaEditada,{codigo:val('mon-codigo'),nombre:val('mon-nombre'),simbolo:val('mon-simbolo'),locale:val('mon-locale'),decimales:Number(val('mon-decimales')),activa:$('mon-activa').checked});}
function guardarTasa(e){e.preventDefault();return enviar(e.target,'tipos-cambio',null,{monedaOrigen:val('tasa-origen'),monedaDestino:val('tasa-destino'),tasa:val('tasa-valor'),vigenteDesde:val('tasa-fecha')||null});}
function guardarRol(e){e.preventDefault();return enviar(e.target,'roles',rolEditado,{codigo:val('rol-codigo'),nombre:val('rol-nombre'),descripcion:val('rol-descripcion'),activo:$('rol-activo').checked,permisos:[...document.querySelectorAll('#rol-permisos input:checked')].map(i=>i.value)});}
function guardarMetodo(e){e.preventDefault();const campos=[...$('met-campos').children].map(f=>{const v=k=>f.querySelector(`[data-k="${k}"]`);return{clave:v('clave').value.trim(),etiqueta:v('etiqueta').value.trim(),tipo:v('tipo').value,obligatorio:v('obligatorio').checked,maxLongitud:Number(v('maxLongitud').value),opciones:v('opciones').value?v('opciones').value.split('|').map(x=>x.trim()):[]};});return enviar(e.target,'metodos-pago',metodoEditado,{codigo:val('met-codigo'),nombre:val('met-nombre'),descripcion:val('met-descripcion'),instrucciones:val('met-instrucciones'),procesamiento:val('met-procesamiento'),requiereReferencia:$('met-requiere').checked,etiquetaReferencia:val('met-referencia'),prefijoTransaccion:val('met-prefijo'),icono:val('met-icono'),orden:Number(val('met-orden')),activo:$('met-activo').checked,monedas:[...document.querySelectorAll('#met-monedas input:checked')].map(i=>i.value),formularioJson:JSON.stringify(campos)});}
