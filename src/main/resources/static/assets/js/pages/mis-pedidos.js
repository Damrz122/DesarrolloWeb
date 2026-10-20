import { api } from '/assets/js/api.js';
import { auth } from '/assets/js/auth.js';
import { renderNavbar } from '/assets/js/ui/navbar.js';
import { formatoMoneda } from '/assets/js/money.js';

renderNavbar();

if (!auth.protegerRutaAutenticada()) {
    // Guard
} else {
    cargarPedidos();
}

const container = document.getElementById('orders-container');
const modal = document.getElementById('order-modal');
const modalTitle = document.getElementById('modal-order-title');
const modalDate = document.getElementById('modal-order-date');
const modalBadges = document.getElementById('modal-order-badges');
const modalTimeline = document.getElementById('modal-order-timeline');
const modalContent = document.getElementById('modal-order-content');
const modalClose = document.getElementById('modal-close-btn');

modalClose.addEventListener('click', cerrarModal);
modal.addEventListener('click', (e) => { if (e.target === modal) cerrarModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.classList.contains('hidden')) cerrarModal(); });

function cerrarModal() {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
}

function abrirModal() {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

const SVG = {
    receipt: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>',
    box: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>',
    truck: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"></path></svg>',
    home: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>',
    check: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>',
    checkSm: '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>',
    x: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>',
    card: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>',
    pin: '<svg class="w-4 h-4 text-rose-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>',
    phone: '<svg class="w-4 h-4 text-rose-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>'
};

function esc(v) {
    return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function getEstadoBadge(estado) {
    switch (estado) {
        case 'PENDIENTE':
            return '<span class="px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold">Pendiente</span>';
        case 'EN_PROCESO':
            return '<span class="px-2.5 py-1 bg-blue-100 text-blue-800 border border-blue-300 rounded-lg text-xs font-bold">En preparación</span>';
        case 'ENVIADO':
            return '<span class="px-2.5 py-1 bg-purple-100 text-purple-800 border border-purple-300 rounded-lg text-xs font-bold">En camino</span>';
        case 'ENTREGADO':
            return '<span class="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold">Entregado</span>';
        case 'CANCELADO':
            return '<span class="px-2.5 py-1 bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-xs font-bold">Cancelado</span>';
        default:
            return `<span class="px-2.5 py-1 bg-neutral-100 text-neutral-700 rounded-lg text-xs font-bold">${esc(estado)}</span>`;
    }
}

function metodoLabel(m) {
    const map = { TARJETA_CREDITO: 'Tarjeta', TARJETA_DEBITO: 'Tarjeta', YAPE: 'Yape', PLIN: 'Plin', TRANSFERENCIA_BANCARIA: 'Transferencia', PAGO_CONTRAENTREGA: 'Contra entrega' };
    return map[m] || m || '—';
}

function getPagoBadge(p) {
    const metodo = p.metodoPago;
    const estado = p.estadoPago || 'PENDIENTE';
    if (estado === 'APROBADO') {
        const txt = p.procesamientoPago === 'CONTRA_ENTREGA' ? 'Cobrado contra entrega' : `Pagado · ${p.metodoNombre || metodoLabel(metodo)}`;
        return `<span class="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5"><span class="inline-flex">${SVG.checkSm}</span>${esc(txt)}</span>`;
    }
    if (estado === 'RECHAZADO') return '<span class="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-xs font-bold">Pago rechazado</span>';
    if (p.procesamientoPago === 'CONTRA_ENTREGA') return '<span class="px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold">Pagarás al recibir</span>';
    if (p.procesamientoPago === 'VERIFICACION_MANUAL') return `<span class="px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold">Por verificar · ${esc(p.metodoNombre || metodoLabel(metodo))}</span>`;
    return '<span class="px-2.5 py-1 bg-neutral-100 text-neutral-700 rounded-lg text-xs font-bold">Pago pendiente</span>';
}

function progresoEstado(estado) {
    return { PENDIENTE: 1, EN_PROCESO: 2, ENVIADO: 3, ENTREGADO: 4, CANCELADO: 0 }[estado] ?? 1;
}

function buildTimeline(estado) {
    if (estado === 'CANCELADO') {
        return `
        <div class="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3">
            <span class="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center flex-shrink-0">${SVG.x}</span>
            <div><p class="text-sm font-black text-rose-900">Pedido cancelado</p><p class="text-xs text-rose-700">El pago quedó rechazado. Si pagaste con Yape/Plin, contacta soporte.</p></div>
        </div>`;
    }
    const idx = progresoEstado(estado);
    const pasos = [
        { key: 'PENDIENTE', label: 'Pedido recibido', sub: 'Confirmamos tu compra', icon: SVG.receipt },
        { key: 'EN_PROCESO', label: 'En preparación', sub: 'Alistando productos', icon: SVG.box },
        { key: 'ENVIADO', label: 'En camino', sub: 'Courier en ruta', icon: SVG.truck },
        { key: 'ENTREGADO', label: 'Entregado', sub: 'Recibido · cobrado', icon: SVG.home },
    ];
    const pct = idx <= 1 ? 0 : ((idx - 1) / 3) * 100;
    let html = `<div class="p-4 sm:p-5 bg-gradient-to-br from-[#3564C9]/5 to-emerald-500/5 border border-neutral-200 rounded-2xl"><p class="text-[11px] font-black uppercase tracking-widest text-neutral-500 mb-3">Estado del pedido</p><div class="elx-timeline"><div class="elx-timeline-fill" style="width:${pct}%"></div>`;
    pasos.forEach((s, i) => {
        const n = i + 1;
        const cls = n < idx ? 'done' : (n === idx ? 'current' : '');
        const icon = n < idx ? SVG.check : s.icon;
        html += `<div class="elx-step ${cls}"><div class="elx-dot">${icon}</div><div><div class="elx-step-label">${s.label}</div><div class="elx-step-sub">${n < idx ? 'Completado' : (n === idx ? 'Aquí va tu pedido' : s.sub)}</div></div></div>`;
    });
    html += `</div></div>`;
    return html;
}

async function cargarPedidos() {
    try {
        const res = await api.get('/api/pedidos/mios');
        if (!res.exito || !res.datos || res.datos.length === 0) {
            container.innerHTML = `
                <div class="bg-white rounded-2xl p-12 text-center border border-neutral-200 shadow-sm">
                    <div class="w-14 h-14 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto mb-3">
                        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                    </div>
                    <h3 class="text-base font-bold text-neutral-900 mb-1">Aún no has realizado pedidos</h3>
                    <p class="text-xs text-neutral-500 mb-4">Descubre nuestros productos en tecnología y equipamiento electrónico.</p>
                    <a href="/productos.html" class="inline-flex items-center px-5 py-2.5 rounded-xl bg-[#3564C9] hover:bg-[#2A51A5] text-white font-bold text-xs transition-all shadow-md">Explorar Catálogo</a>
                </div>`;
            return;
        }

        container.innerHTML = '';
        res.datos.forEach(pedido => {
            const formato = v => formatoMoneda(v, pedido.monedaCodigo || 'PEN');
            const total = formato(pedido.total);
            const fechaRaw = pedido.fecha || pedido.fechaCreacion;
            const fecha = fechaRaw ? new Date(fechaRaw).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' }) : 'Fecha no disponible';
            const pct = pedido.estado === 'CANCELADO' ? 0 : (progresoEstado(pedido.estado) / 4) * 100;

            const card = document.createElement('div');
            card.className = 'bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm hover:shadow-md transition-all';
            card.innerHTML = `
                <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div class="space-y-1 flex-1 w-full">
                        <div class="flex flex-wrap items-center gap-2">
                            <span class="font-black text-neutral-900 text-base">Pedido #${pedido.id}</span>
                            ${getEstadoBadge(pedido.estado)}
                            ${getPagoBadge(pedido)}
                        </div>
                        <p class="text-xs text-neutral-500">Fecha de compra: ${esc(fecha)} · ${esc(pedido.metodoNombre || metodoLabel(pedido.metodoPago))}${pedido.referenciaComprobante ? ' · OP ' + esc(pedido.referenciaComprobante) : ''}</p>
                        <p class="text-xs text-neutral-600">Destino: <strong>${esc(pedido.direccionEnvio || 'No especificada')}</strong></p>
                        <div class="elx-mini-progress"><div style="width:${pct}%"></div></div>
                    </div>
                    <div class="flex items-center justify-between w-full md:w-auto md:space-x-6 border-t md:border-t-0 pt-3 md:pt-0 border-neutral-100">
                        <div class="text-left md:text-right">
                            <span class="text-[10px] text-neutral-400 font-bold block uppercase">Total</span>
                            <span class="text-lg font-black text-neutral-900">${total}</span>
                        </div>
                        <button class="btn-ver-detalle px-4 py-2 bg-neutral-900 hover:bg-neutral-700 text-white text-xs font-bold rounded-xl transition-colors" data-id="${pedido.id}">Rastrear pedido</button>
                    </div>
                </div>`;
            container.appendChild(card);
        });

        document.querySelectorAll('.btn-ver-detalle').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const ped = res.datos.find(p => p.id == id);
                if (ped) mostrarModalDetalle(ped);
            });
        });

    } catch (err) {
        container.innerHTML = `<div class="p-8 text-center text-rose-600 text-sm font-bold">Error al cargar historial: ${esc(err.message)}</div>`;
    }
}

function mostrarModalDetalle(pedido) {
    const formato = v => formatoMoneda(v, pedido.monedaCodigo || 'PEN');
    const total = formato(pedido.total);
    const fechaRaw = pedido.fecha || pedido.fechaCreacion;
    const fecha = fechaRaw ? new Date(fechaRaw).toLocaleString('es-PE', { dateStyle: 'full', timeStyle: 'short' }) : 'Fecha no disponible';

    modalTitle.textContent = `Pedido #${pedido.id} · ${pedido.metodoNombre || metodoLabel(pedido.metodoPago)}`;
    modalDate.textContent = `Registrado el ${fecha}`;
    modalBadges.innerHTML = `${getEstadoBadge(pedido.estado)} ${getPagoBadge(pedido)}`;
    modalTimeline.innerHTML = buildTimeline(pedido.estado);

    let itemsList = '';
    const detalles = pedido.detalles || pedido.items || [];
    if (detalles.length > 0) {
        detalles.forEach(it => {
            const precioUnit = formato(it.precioUnitario);
            const sub = formato(it.subtotal);
            itemsList += `
                <div class="flex justify-between items-center py-2.5 border-b border-neutral-100 text-xs gap-3">
                    <div class="flex items-center gap-3 min-w-0">
                        <span class="w-9 h-9 rounded-xl bg-neutral-100 text-neutral-500 flex items-center justify-center flex-shrink-0">${SVG.box}</span>
                        <div class="min-w-0"><span class="font-bold text-neutral-900 block truncate">${esc(it.productoNombre)}</span><span class="text-neutral-500">${it.cantidad} x ${precioUnit}</span></div>
                    </div>
                    <span class="font-black text-neutral-900 flex-shrink-0">${sub}</span>
                </div>`;
        });
    } else {
        itemsList = '<p class="text-xs text-neutral-400">Sin artículos.</p>';
    }

    let payHint = '';
    if (pedido.procesamientoPago === 'CONTRA_ENTREGA') {
        payHint = pedido.estadoPago === 'APROBADO'
            ? '<p class="text-[11px] text-emerald-700 font-bold mt-1 inline-flex items-center gap-1"><span class="inline-flex">Cobrado al entregar. Gracias por tu compra.</span></p>'
            : '<p class="text-[11px] text-amber-700 font-bold mt-1">Pagarás en efectivo o tarjeta cuando el courier llegue. Ten el monto listo.</p>';
    } else if (pedido.procesamientoPago === 'VERIFICACION_MANUAL') {
        payHint = pedido.estadoPago === 'APROBADO'
            ? `<p class="text-[11px] text-emerald-700 font-bold mt-1">Cobro verificado${pedido.referenciaComprobante ? ' · OP ' + esc(pedido.referenciaComprobante) : ''}.</p>`
            : `<p class="text-[11px] text-amber-700 font-bold mt-1">Estamos verificando tu OP ${esc(pedido.referenciaComprobante || '')} en nuestra cuenta. Te avisaremos al aprobarse.</p>`;
    }

    modalContent.innerHTML = `
        <div class="elx-paybox">
            <span class="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center flex-shrink-0">${SVG.card}</span>
            <div class="text-xs">
                <p class="font-black text-neutral-900">${esc(metodoLabel(pedido.metodoPago))} ${pedido.referenciaComprobante ? '· OP ' + esc(pedido.referenciaComprobante) : ''}</p>
                <p class="text-neutral-500">${pedido.estadoPago === 'APROBADO' ? 'Pago confirmado' : (pedido.estadoPago === 'RECHAZADO' ? 'Pago rechazado' : 'Pago por confirmar')}</p>
                ${payHint}
            </div>
        </div>
        <div class="p-4 bg-neutral-50 rounded-xl border border-neutral-200 text-xs space-y-2">
            <p class="flex gap-2 items-start"><span class="mt-0.5">${SVG.pin}</span><span><strong class="text-neutral-700">Dirección de entrega:</strong> ${esc(pedido.direccionEnvio || '-')}</span></p>
            <p class="flex gap-2 items-start"><span class="mt-0.5">${SVG.phone}</span><span><strong class="text-neutral-700">Teléfono:</strong> ${esc(pedido.telefono || '-')}</span></p>
        </div>
        <div class="space-y-1">
            <h4 class="font-bold text-neutral-900 text-xs uppercase tracking-wider mb-2">Artículos del pedido</h4>
            ${itemsList}
        </div>
        <div class="pt-3 flex justify-between items-baseline border-t border-neutral-200">
            <span class="text-xs font-bold text-neutral-700 uppercase">Monto total</span>
            <span class="text-xl font-black text-neutral-900">${total}</span>
        </div>`;

    abrirModal();
}
