import { api } from '/assets/js/api.js';
import { auth } from '/assets/js/auth.js';
import { cart } from '/assets/js/cart.js';
import { renderNavbar } from '/assets/js/ui/navbar.js';
import { showToast } from '/assets/js/ui/toast.js';
import { formatoMoneda, catalogoMonedas } from '/assets/js/money.js';

renderNavbar();
const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const icono = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/></svg>`;
let cotizacion = null, metodos = [], metodo = null, secuencia = 0, ocupado = false;
if (auth.protegerRutaAutenticada()) iniciar().catch(errorInicial);

async function iniciar() {
    $('payment-methods').replaceChildren();
    if (!auth.tienePermiso('COMPRAR')) throw new Error('Tu rol no permite realizar compras');
    const carrito = await cart.obtenerCarrito();
    if (!carrito?.items?.length) throw new Error('Tu carrito está vacío');
    const contenedor = document.createElement('div');
    contenedor.className = 'mb-4';
    contenedor.innerHTML = `<label class="block text-xs font-bold mb-1" for="checkout-currency">Moneda de cobro</label><select id="checkout-currency" class="w-full border rounded-lg p-2">${catalogoMonedas().map(m=>`<option value="${esc(m.codigo)}">${esc(m.codigo)} · ${esc(m.nombre)}</option>`).join('')}</select><p id="quote-note" role="status" class="text-xs text-neutral-500 mt-2"></p><button id="quote-refresh" type="button" class="text-xs text-blue-700 underline mt-2">Actualizar cotización</button>`;
    $('payment-methods').before(contenedor);
    $('checkout-currency').value = carrito.monedaCodigo || 'PEN';
    $('checkout-currency').onchange = () => actualizar().catch(errorCotizacion);
    $('quote-refresh').onclick = () => actualizar().catch(errorCotizacion);
    $('checkout-form').onsubmit = confirmar;
    await actualizar();
}
async function actualizar() {
    const revision = ++secuencia;
    $('btn-confirm-order').disabled = true; cotizacion = null;
    $('quote-note').textContent = 'Calculando en el servidor…';
    const moneda = $('checkout-currency').value;
    const [q,m] = await Promise.all([
        api.post('/api/checkout/cotizacion',{monedaCodigo:moneda}),
        api.get('/api/pagos/metodos?moneda='+encodeURIComponent(moneda))
    ]);
    if (revision !== secuencia) return;
    if (!m.datos?.length) throw new Error('No hay métodos de pago habilitados para '+moneda);
    cotizacion = q.datos; metodos = m.datos;
    const datos = cotizacion.datos, formato = v=>formatoMoneda(v,datos.monedaCodigo);
    const subtotal = datos.items.reduce((s,i)=>s + Number(i.precioBaseUnitario) * i.cantidad, 0);
    const impuestos = datos.items.reduce((s,i)=>s + Number(i.impuestoMonto || 0), 0);
    for(const id of ['checkout-total','btn-total']) if($(id)) $(id).textContent=formato(datos.total);
    if($('checkout-subtotal')) $('checkout-subtotal').textContent=formato(subtotal);
    if($('checkout-tax')) $('checkout-tax').textContent=formato(impuestos);
    $('checkout-items').innerHTML = datos.items.map(i=>`<div class="flex justify-between items-center py-2 border-b border-neutral-100"><div><span class="font-bold block text-xs">${esc(i.nombre)}</span><span class="text-xs text-neutral-500">${i.cantidad} × ${esc(formato(i.precioUnitario))}${Number(i.impuestoPorcentaje)>0 ? ` · Impuesto ${esc(i.impuestoPorcentaje)}%` : ''}${i.monedaOriginal!==datos.monedaCodigo ? ' · Original: '+esc(formatoMoneda(i.precioOriginal,i.monedaOriginal)):''}</span></div><span class="font-bold text-xs">${esc(formato(i.subtotal))}</span></div>`).join('');
    $('quote-note').textContent = `Cotización válida hasta ${new Date(cotizacion.venceEn).toLocaleTimeString()}. El importe queda fijado durante esos 5 minutos.`;
    $('payment-methods').innerHTML = metodos.map((m,i)=>`<label class="flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer mb-2"><input type="radio" name="paymethod" value="${esc(m.codigo)}" ${i===0?'checked':''}><span class="text-blue-700">${icono}</span><span><strong class="block text-sm">${esc(m.nombre)}</strong><span class="text-xs text-neutral-500">${esc(m.descripcion)}</span></span></label>`).join('')+'<div id="payment-fields" class="space-y-3 mt-3"></div>';
    document.querySelectorAll('[name="paymethod"]').forEach(r=>r.onchange=pintarCampos);
    pintarCampos(); $('btn-confirm-order').disabled = false;
}
function pintarCampos() {
    metodo = metodos.find(m=>m.codigo===document.querySelector('[name="paymethod"]:checked')?.value);
    const box=$('payment-fields'); box.replaceChildren();
    if(!metodo) return;
    if(metodo.instrucciones) { const p=document.createElement('p');p.className='text-sm text-neutral-600 whitespace-pre-line';p.textContent=metodo.instrucciones;box.append(p); }
    if(metodo.requiereReferencia) box.insertAdjacentHTML('beforeend',`<div><label for="payment-reference" class="block text-xs font-bold mb-1">${esc(metodo.etiquetaReferencia||'Referencia de pago')} *</label><input id="payment-reference" class="w-full border rounded-lg p-2" required minlength="6" maxlength="100"></div>`);
    for(const c of metodo.campos||[]) {
        const wrap=document.createElement('div'), label=document.createElement('label');
        label.htmlFor='pago-'+c.clave;label.className='block text-xs font-bold mb-1';label.textContent=c.etiqueta+(c.obligatorio?' *':'');
        const input=document.createElement(c.tipo==='select'?'select':c.tipo==='textarea'?'textarea':'input');
        input.id='pago-'+c.clave;input.dataset.pago=c.clave;input.className='w-full border rounded-lg p-2';input.required=c.obligatorio;
        if(c.tipo==='select') { const vacia=new Option('Selecciona una opción','');input.add(vacia);for(const o of c.opciones||[]) input.add(new Option(o,o)); }
        else { if(c.tipo!=='textarea') input.type=c.tipo;input.maxLength=c.maxLongitud||100; }
        wrap.append(label,input);box.append(wrap);
    }
    const p=document.createElement('p');p.className='text-xs text-neutral-500';p.textContent=metodo.procesamiento==='SIMULADO'?'Simulación: no ingreses datos reales de tarjeta. No se realiza ningún cargo.':metodo.procesamiento==='CONTRA_ENTREGA'?'El pago quedará pendiente hasta la entrega.':'El pago quedará pendiente de verificación por personal autorizado.';box.append(p);
}
async function confirmar(e) {
    e.preventDefault();
    if(ocupado || !cotizacion || !metodo) return;
    if(Date.now()>=Date.parse(cotizacion.venceEn)){await actualizar().catch(errorCotizacion);showToast('Cotización actualizada: revisa el total antes de confirmar','warning');return;}
    const form=$('checkout-form');if(!form.reportValidity())return;
    const telefono=$('checkout-phone').value.replace(/\D/g,'');
    if(!/^9\d{8}$/.test(telefono)){showToast('Ingresa un celular de 9 dígitos que empiece con 9','warning');return;}
    const datosPago=Object.fromEntries([...document.querySelectorAll('[data-pago]')].map(i=>[i.dataset.pago,i.value.trim()]));
    let direccion=[$('checkout-address').value.trim(),$('checkout-dist').value.trim(),$('checkout-prov').value.trim(),$('checkout-depto').value].join(', ');
    if(direccion.length<8){showToast('Completa la dirección','warning');return;}
    if($('checkout-ref').value.trim())direccion+=' (Ref: '+$('checkout-ref').value.trim()+')';
    ocupado=true;$('btn-confirm-order').disabled=true;$('checkout-currency').disabled=true;$('quote-refresh').disabled=true;
    try {
        const r=await api.post('/api/pedidos',{direccionEnvio:direccion,telefono,metodoPago:metodo.codigo,versionMetodo:metodo.version,cotizacionToken:cotizacion.token,referenciaComprobante:$('payment-reference')?.value.trim()||null,datosPago});
        cart.actualizarBadge(0);showToast(`Pedido #${r.datos.id} generado en ${r.datos.monedaCodigo}`,'success');location.href='/mis-pedidos.html';
    } catch(e){showToast(e.message,'error');}
    finally {ocupado=false;$('btn-confirm-order').disabled=false;$('checkout-currency').disabled=false;$('quote-refresh').disabled=false;}
}
function errorCotizacion(e){cotizacion=null;$('btn-confirm-order').disabled=true;$('quote-note').textContent=e.message;showToast(e.message,'warning');}
function errorInicial(e){$('btn-confirm-order').disabled=true;const p=document.createElement('p');p.textContent=e.message;p.className='text-red-700 p-4';$('checkout-form').prepend(p);showToast(e.message,'error');}
