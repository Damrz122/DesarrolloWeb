import { api } from '/assets/js/api.js';
        import { auth } from '/assets/js/auth.js';
        import { renderAdminShell } from '/assets/js/ui/adminShell.js?v=2';
        import { showToast } from '/assets/js/ui/toast.js';
        import { renderPager, swapSuave } from '/assets/js/ui/pager.js?v=2';

        // NOTA: referencias DOM primero (evita TDZ si init las toca antes del await).
        const tbody = document.getElementById('pedidos-table-body');
        const filtroEstado = document.getElementById('filtro-estado');
        const modal = document.getElementById('modal-pedido');
        const modalClose = document.getElementById('modal-ped-close');
        const modalTitle = document.getElementById('modal-ped-title');
        const modalContent = document.getElementById('modal-ped-content');

        // paginacion: 10 por pagina
        const pager = document.getElementById('pedidos-pager');
        const TAMANO_PAGINA = 10;
        let paginaActual = 0;

        renderAdminShell('pedidos');

        if (!auth.protegerRutaAdmin()) {
            // Redirige
        } else {
            initPedidosAdmin();
        }

        modalClose.addEventListener('click', () => { modal.classList.add('hidden'); bloquearFondo(false); });

        // modal scroll: bloquea el scroll del fondo mientras el detalle esta abierto
        function bloquearFondo(bloquear) {
            document.body.style.overflow = bloquear ? 'hidden' : '';
        }

        function esc(value) {
            return String(value ?? '')
                .replace(/&/g, '&amp;').replace(/</g, '&lt;')
                .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function initPedidosAdmin() {
            cargarPedidosAdmin(0);
            filtroEstado.addEventListener('change', () => {
                cargarPedidosAdmin(0);
            });
        }

        async function cargarPedidosAdmin(pagina = paginaActual) {
            paginaActual = Math.max(0, pagina);
            const estado = filtroEstado.value;
            let url = `/api/pedidos?page=${paginaActual}&size=${TAMANO_PAGINA}`;
            if (estado) url += `&estado=${estado}`;

            try {
                const res = await api.get(url);
                const datos = (res.exito && res.datos) ? res.datos : null;
                const lista = (datos && datos.contenido) ? datos.contenido : [];
                const totalPaginas = (datos && datos.totalPaginas) ? datos.totalPaginas : 0;

                await swapSuave(tbody, () => pintarFilas(lista));
                renderPager(pager, { pagina: paginaActual, totalPaginas, onPage: p => cargarPedidosAdmin(p) });
            } catch (err) {
                const msg = esc(err.message);
                await swapSuave(tbody, () => {
                    tbody.innerHTML = `<tr><td colspan="7" class="adm-err">Error: ${msg}</td></tr>`;
                });
            }
        }

        function pintarFilas(lista) {
            tbody.innerHTML = '';

            if (lista.length > 0) {
                lista.forEach(p => {
                        const total = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(p.total);
                        const fecha = new Date(p.fecha).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>
                                <span class="adm-id">#${p.id}</span>
                                <div class="adm-sub">${fecha}</div>
                            </td>
                            <td>
                                <div class="adm-strong">${esc(p.usuarioNombre) || 'Cliente'}</div>
                                <div class="adm-sub">${esc(p.usuarioEmail) || ''}</div>
                            </td>
                            <td class="adm-strong adm-total">${total}</td>
                            <td>
                                <div>${esc(p.direccionEnvio) || '—'}</div>
                                <div class="adm-sub">Tel: ${esc(p.telefono) || '—'}</div>
                            </td>
                            <td>${obtenerBadge(p.estado)}</td>
                            <td>
                                <select class="adm-select select-cambiar-estado adm-select--estado">
                                    <option value="PENDIENTE" ${p.estado === 'PENDIENTE' ? 'selected' : ''}>Pendiente</option>
                                    <option value="EN_PROCESO" ${p.estado === 'EN_PROCESO' ? 'selected' : ''}>En proceso</option>
                                    <option value="ENVIADO" ${p.estado === 'ENVIADO' ? 'selected' : ''}>Enviado</option>
                                    <option value="ENTREGADO" ${p.estado === 'ENTREGADO' ? 'selected' : ''}>Entregado</option>
                                    <option value="CANCELADO" ${p.estado === 'CANCELADO' ? 'selected' : ''}>Cancelado</option>
                                </select>
                            </td>
                            <td class="num">
                                <button class="adm-btn adm-btn-ghost adm-btn-sm btn-ver-detalle">Artículos</button>
                            </td>
                        `;

                        tr.querySelector('.select-cambiar-estado').addEventListener('change', async (e) => {
                            const nuevoEstado = e.target.value;
                            await actualizarEstado(p.id, nuevoEstado);
                        });

                        tr.querySelector('.btn-ver-detalle').addEventListener('click', () => {
                            abrirModal(p);
                        });

                        tbody.appendChild(tr);
                    });
                } else {
                    tbody.innerHTML = `<tr><td colspan="7" class="adm-empty">No se encontraron pedidos con ese criterio.</td></tr>`;
                }
        }

        async function actualizarEstado(pedidoId, nuevoEstado) {
            try {
                await api.patch(`/api/pedidos/${pedidoId}/estado`, { estado: nuevoEstado });
                showToast(`Pedido #${pedidoId} actualizado a ${nuevoEstado}`, 'success');
                cargarPedidosAdmin(paginaActual);
            } catch (err) {
                showToast(err.message, 'error');
                cargarPedidosAdmin(paginaActual);
            }
        }

        function obtenerBadge(estado) {
            switch (estado) {
                case 'PENDIENTE': return `<span class="adm-badge b-pendiente">Pendiente</span>`;
                case 'EN_PROCESO': return `<span class="adm-badge b-proceso">En proceso</span>`;
                case 'ENVIADO': return `<span class="adm-badge b-enviado">Enviado</span>`;
                case 'ENTREGADO': return `<span class="adm-badge b-entregado">Entregado</span>`;
                case 'CANCELADO': return `<span class="adm-badge b-cancelado">Cancelado</span>`;
                default: return `<span class="adm-badge b-off">${esc(estado)}</span>`;
            }
        }

        function abrirModal(p) {
            modalTitle.textContent = `Artículos de orden #${p.id}`;
            let html = '<div class="adm-detalle-lista">';
            if (p.detalles && p.detalles.length > 0) {
                p.detalles.forEach(d => {
                    const sub = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(d.subtotal);
                    const pu = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(d.precioUnitario);
                    html += `
                        <div class="adm-detail-row">
                            <div>
                                <span class="adm-strong adm-detalle-nombre">${esc(d.productoNombre)}</span>
                                <span class="adm-sub">${d.cantidad} uds. × ${pu}</span>
                            </div>
                            <span class="adm-strong adm-detalle-sub">${sub}</span>
                        </div>
                    `;
                });
            } else {
                html += '<p class="adm-detalle-vacio">Sin detalles.</p>';
            }
            html += '</div>';
            modalContent.innerHTML = html;
            modal.classList.remove('hidden');
            bloquearFondo(true);
        }
