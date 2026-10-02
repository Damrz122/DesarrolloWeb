import { api } from '/assets/js/api.js';
        import { auth } from '/assets/js/auth.js';
        import { renderNavbar } from '/assets/js/ui/navbar.js';
        import { showToast } from '/assets/js/ui/toast.js';

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
        const modalContent = document.getElementById('modal-order-content');
        const modalClose = document.getElementById('modal-close-btn');

        modalClose.addEventListener('click', () => modal.classList.add('hidden'));

        function getEstadoBadge(estado) {
            switch (estado) {
                case 'PENDIENTE':
                    return '<span class="px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold">Pendiente</span>';
                case 'EN_PROCESO':
                    return '<span class="px-2.5 py-1 bg-blue-100 text-blue-800 border border-blue-300 rounded-lg text-xs font-bold">En Proceso</span>';
                case 'ENVIADO':
                    return '<span class="px-2.5 py-1 bg-purple-100 text-purple-800 border border-purple-300 rounded-lg text-xs font-bold">Enviado</span>';
                case 'ENTREGADO':
                    return '<span class="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold">Entregado</span>';
                case 'CANCELADO':
                    return '<span class="px-2.5 py-1 bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-xs font-bold">Cancelado</span>';
                default:
                    return `<span class="px-2.5 py-1 bg-neutral-100 text-neutral-700 rounded-lg text-xs font-bold">${estado}</span>`;
            }
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
                            <a href="/productos.html" class="inline-flex items-center px-5 py-2.5 rounded-xl bg-[#3564C9] hover:bg-[#2A51A5] text-white font-bold text-xs transition-all shadow-md">
                                Explorar Catálogo
                            </a>
                        </div>
                    `;
                    return;
                }

                container.innerHTML = '';
                res.datos.forEach(pedido => {
                    const total = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(pedido.total);
                    const fechaRaw = pedido.fecha || pedido.fechaCreacion;
                    const fecha = fechaRaw ? new Date(fechaRaw).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' }) : 'Fecha no disponible';

                    const card = document.createElement('div');
                    card.className = 'bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4';

                    card.innerHTML = `
                        <div class="space-y-1">
                            <div class="flex items-center space-x-3">
                                <span class="font-black text-neutral-900 text-base">Pedido #${pedido.id}</span>
                                ${getEstadoBadge(pedido.estado)}
                            </div>
                            <p class="text-xs text-neutral-500">Fecha de compra: ${fecha}</p>
                            <p class="text-xs text-neutral-600">Destino: <strong>${pedido.direccionEnvio || 'No especificada'}</strong></p>
                        </div>

                        <div class="flex items-center justify-between w-full md:w-auto md:space-x-6 border-t md:border-t-0 pt-3 md:pt-0 border-neutral-100">
                            <div class="text-left md:text-right">
                                <span class="text-[10px] text-neutral-400 font-bold block uppercase">Total</span>
                                <span class="text-lg font-black text-neutral-900">${total}</span>
                            </div>

                            <button class="btn-ver-detalle px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold rounded-xl transition-colors" data-id="${pedido.id}">
                                Ver Detalle
                            </button>
                        </div>
                    `;

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
                container.innerHTML = `<div class="p-8 text-center text-rose-600 text-sm font-bold">Error al cargar historial: ${err.message}</div>`;
            }
        }

        function mostrarModalDetalle(pedido) {
            const total = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(pedido.total);
            const fechaRaw = pedido.fecha || pedido.fechaCreacion;
            const fecha = fechaRaw ? new Date(fechaRaw).toLocaleString('es-PE', { dateStyle: 'full', timeStyle: 'short' }) : 'Fecha no disponible';

            modalTitle.textContent = `Pedido #${pedido.id} - ${pedido.estado}`;
            modalDate.textContent = `Registrado el ${fecha}`;

            let itemsList = '';
            const detalles = pedido.detalles || pedido.items || [];
            if (detalles.length > 0) {
                detalles.forEach(it => {
                    const precioUnit = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(it.precioUnitario);
                    const sub = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(it.subtotal);
                    itemsList += `
                        <div class="flex justify-between items-center py-2.5 border-b border-neutral-100 text-xs">
                            <div>
                                <span class="font-bold text-neutral-900 block">${it.productoNombre}</span>
                                <span class="text-neutral-500">${it.cantidad} x ${precioUnit}</span>
                            </div>
                            <span class="font-black text-neutral-900">${sub}</span>
                        </div>
                    `;
                });
            }

            modalContent.innerHTML = `
                <div class="p-4 bg-neutral-50 rounded-xl border border-neutral-200 text-xs space-y-1">
                    <p><strong class="text-neutral-700">Dirección de entrega:</strong> ${pedido.direccionEnvio || '-'}</p>
                    <p><strong class="text-neutral-700">Teléfono:</strong> ${pedido.telefono || '-'}</p>
                </div>

                <div class="space-y-1">
                    <h4 class="font-bold text-neutral-900 text-xs uppercase tracking-wider mb-2">Artículos del Pedido</h4>
                    ${itemsList}
                </div>

                <div class="pt-3 flex justify-between items-baseline border-t border-neutral-200">
                    <span class="text-xs font-bold text-neutral-700 uppercase">Monto Total</span>
                    <span class="text-xl font-black text-neutral-900">${total}</span>
                </div>
            `;

            modal.classList.remove('hidden');
        }
