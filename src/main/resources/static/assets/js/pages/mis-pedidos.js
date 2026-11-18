import { api } from '/assets/js/api.js';
import { auth } from '/assets/js/auth.js';
import { formatoMoneda } from '/assets/js/money.js';
import { iniciarShellCompra } from '/assets/js/ui/purchase-shell.js';
import { escapar as esc, estadoPedido, estadoPago, PASOS_PEDIDO, fechaPedido } from '/assets/js/purchase-flow.js';
import { resumenClub } from '/assets/js/ui/club-wallet.js';

await iniciarShellCompra();

const container = document.getElementById('orders-container');
const feedback = document.getElementById('orders-feedback');
const refresh = document.getElementById('orders-refresh');
const filtro = document.getElementById('orders-filter');
let pedidos = [], cargando = false, enlaceAplicado = false;
const abiertos = new Set();
const buscado = new URLSearchParams(location.search).get('pedido');

async function cargarBilletera() {
    if (!auth.tienePermiso('CRM_VER_PUNTOS')) return;
    const card = document.getElementById('billetera-crm-card');
    const status = document.getElementById('orders-wallet-status');
    card.setAttribute('aria-busy', 'true');
    try {
        const res = await api.get('/api/crm/puntos/mi-billetera');
        if (!res?.exito || !res?.datos) throw new Error();
        card.hidden = false;
        card.innerHTML = resumenClub(res.datos, true);
        status.textContent = '';
    } catch (_) {
        status.textContent = 'No pudimos actualizar tus puntos. Tus pedidos se pueden consultar igualmente; vuelve a pulsar «Actualizar pedidos» para reintentar.';
    } finally {
        card.setAttribute('aria-busy', 'false');
    }
}

function timeline(estado) {
    const vista = estadoPedido(estado);
    if (vista.cancelado) return '<p class="flow-message">Este pedido figura como cancelado. El estado del pago se muestra por separado. Consulta con soporte si necesitas ayuda.</p>';
    if (vista.indice < 0) return '<p class="flow-note">No hay un progreso de entrega disponible para este estado.</p>';
    return `<ol class="flow-timeline" aria-label="Progreso del pedido">${PASOS_PEDIDO.map(([, texto], indice) => `
        <li data-done="${indice < vista.indice}" ${indice === vista.indice ? 'aria-current="step"' : ''}>
            ${texto}<span class="flow-note">${indice < vista.indice ? ' · Completado' : indice === vista.indice ? ' · Estado actual' : ''}</span>
        </li>`).join('')}</ol>`;
}

function guardarAbiertos() {
    container.querySelectorAll('.flow-order').forEach(detalle => {
        if (detalle.open) abiertos.add(detalle.dataset.id);
        else abiertos.delete(detalle.dataset.id);
    });
}

function pintarPedidos() {
    guardarAbiertos();
    const lista = pedidos.filter(p => filtro.value === 'activos' ? ['PENDIENTE', 'EN_PROCESO', 'ENVIADO'].includes(p.estado)
        : filtro.value === 'entregados' ? p.estado === 'ENTREGADO'
            : filtro.value === 'cancelados' ? p.estado === 'CANCELADO' : true);
    if (!lista.length) {
        container.innerHTML = pedidos.length
            ? '<div class="flow-state"><h2>No hay pedidos con ese estado.</h2><p>Prueba con otra vista para consultar tus compras.</p><button type="button" id="orders-show-all" class="store-button">Ver todos los pedidos</button></div>'
            : '<div class="flow-state"><h2>Tu próxima experiencia empieza aquí.</h2><p>Aún no tienes pedidos en esta cuenta.</p><a href="/productos.html" class="store-button">Explorar el catálogo</a></div>';
        document.getElementById('orders-show-all')?.addEventListener('click', () => { filtro.value = 'todos'; pintarPedidos(); });
        return;
    }
    container.innerHTML = lista.map(pedido => {
        const estado = estadoPedido(pedido.estado), pago = estadoPago(pedido);
        const formato = valor => formatoMoneda(valor, pedido.monedaCodigo || 'PEN');
        const items = Array.isArray(pedido.detalles) ? pedido.detalles : Array.isArray(pedido.items) ? pedido.items : [];
        const tieneDescuentoCupon = pedido.cuponCodigo && Number(pedido.descuentoPen || 0) > 0;
        const tieneDescuentoPuntos = Number(pedido.puntosCanjeados || 0) > 0;
        return `
            <details class="flow-order" id="pedido-${Number(pedido.id)}" data-id="${Number(pedido.id)}" ${abiertos.has(String(pedido.id)) ? 'open' : ''}>
                <summary>
                    <span><span class="flow-order-id">Pedido #${esc(pedido.id)} <span class="flow-badge" data-tone="${estado.tono}">${esc(estado.texto)}</span></span>
                        <span class="flow-order-meta">${esc(fechaPedido(pedido.fecha || pedido.fechaCreacion))} · ${esc(pago.texto)}</span>
                    </span>
                    <span class="flow-order-cost">${formato(pedido.total)}<small>Consultar progreso</small></span>
                </summary>
                <div class="flow-order-body">
                    ${timeline(pedido.estado)}
                    <p class="flow-note">Estado registrado por la tienda. Usa «Actualizar pedidos» para consultar cambios; no es un seguimiento de transporte en tiempo real.</p>
                    <dl class="flow-facts">
                        <div><dt>Entrega</dt><dd>${esc(pedido.direccionEnvio || 'Dirección no disponible')}</dd></div>
                        <div><dt>Teléfono de contacto</dt><dd>${esc(pedido.telefono || 'No disponible')}</dd></div>
                        <div><dt>Método de pago</dt><dd>${esc(pedido.metodoNombre || pedido.metodoPago || 'No disponible')}</dd></div>
                        <div><dt>Estado del pago</dt><dd><span class="flow-badge" data-tone="${pago.tono}">${esc(pago.texto)}</span><p class="flow-note">${esc(pago.detalle)}</p></dd></div>
                        ${pedido.referenciaComprobante ? `<div><dt>Referencia de pago</dt><dd>${esc(pedido.referenciaComprobante)}</dd></div>` : ''}
                    </dl>
                    <h3>Tu selección.</h3>
                    <div class="flow-order-items">${items.length ? items.map(item => `
                        <div class="flow-order-item"><span>${esc(item.productoNombre || item.nombre)}
                            <small>${Number(item.cantidad)} × ${formato(item.precioUnitario)}${Number(item.impuestoPorcentaje) > 0 ? ` · Impuesto ${esc(item.impuestoPorcentaje)}% incluido` : ''}</small>
                        </span><span>${formato(item.subtotal)}</span></div>`).join('') : '<p class="flow-note">No hay artículos disponibles para mostrar en este pedido.</p>'}</div>
                    ${tieneDescuentoCupon || tieneDescuentoPuntos ? `
                    <dl class="flow-totals flow-order-totals">
                        ${tieneDescuentoCupon ? `
                        <div class="flow-saving">
                            <dt>Cupón ${esc(pedido.cuponCodigo)} · descuento en PEN</dt>
                            <dd>−${formatoMoneda(pedido.descuentoPen, 'PEN')}</dd>
                        </div>` : ''}
                        ${tieneDescuentoPuntos ? `
                        <div class="flow-saving">
                            <dt>${Number(pedido.puntosCanjeados)} puntos utilizados · descuento en PEN</dt>
                            <dd>−${formatoMoneda(pedido.descuentoPuntosPen, 'PEN')}</dd>
                        </div>` : ''}
                    <div class="flow-total"><dt>Total registrado (${esc(pedido.monedaCodigo || 'PEN')})</dt><dd>${formato(pedido.total)}</dd></div>
                    </dl>` : ''}
                    <div class="flow-actions"><a href="/informacion.html#chat" class="flow-link">Ayuda con este pedido</a><a href="/informacion.html#despachos" class="flow-link">Información de despacho</a></div>
                </div>
            </details>`;
    }).join('');
}

async function cargarPedidos() {
    if (cargando) return;
    cargando = true;
    container.setAttribute('aria-busy', 'true');
    refresh.disabled = true;
    refresh.textContent = 'Actualizando…';
    feedback.dataset.tone = '';
    feedback.textContent = '';
    try {
        const res = await api.get('/api/pedidos/mios');
        if (!res?.exito || !Array.isArray(res.datos)) throw new Error(res?.mensaje || 'No pudimos consultar tus pedidos.');
        pedidos = res.datos;
        if (!enlaceAplicado && buscado && /^[1-9]\d*$/.test(buscado)) {
            if (pedidos.some(p => String(p.id) === buscado)) abiertos.add(buscado);
            else feedback.textContent = 'No encontramos ese pedido en tu cuenta. Puedes consultar las compras disponibles debajo.';
        }
        pintarPedidos();
        const updatedEl = document.getElementById('orders-updated');
        if (updatedEl) updatedEl.textContent = `Última consulta: ${new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}.`;
        if (!enlaceAplicado && buscado) {
            await document.fonts.ready;
            document.getElementById(`pedido-${Number(buscado)}`)?.scrollIntoView({ block: 'start' });
        }
        enlaceAplicado = true;
    } catch (err) {
        feedback.dataset.tone = 'error';
        feedback.textContent = err.message || 'No se pudieron cargar los pedidos. Vuelve a intentarlo.';
        if (err.status === 401 || err.status === 403) {
            container.innerHTML = '<div class="flow-state"><h2>Vuelve a iniciar sesión.</h2><p>Necesitamos confirmar tu acceso para consultar tus compras.</p><a class="store-button" href="/login.html?redirect=%2Fmis-pedidos.html">Iniciar sesión</a></div>';
        } else if (!pedidos.length) {
            container.innerHTML = '<div class="flow-state"><h2>No pudimos consultar tus pedidos.</h2><p>Revisa tu conexión y pulsa «Actualizar pedidos» para intentarlo otra vez.</p></div>';
        }
    } finally {
        cargando = false;
        container.setAttribute('aria-busy', 'false');
        refresh.disabled = false;
        refresh.textContent = 'Actualizar pedidos';
    }
}

filtro.addEventListener('change', pintarPedidos);
refresh.addEventListener('click', () => {
    cargarPedidos();
    cargarBilletera().catch(() => {});
});

if (auth.protegerRutaAutenticada()) {
    await cargarPedidos();
    cargarBilletera().catch(() => {});
}
