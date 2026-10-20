import { api } from '/assets/js/api.js';
import { formatoMoneda } from '/assets/js/money.js';
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
                    tbody.innerHTML = `<tr><td colspan="8" class="adm-err">Error: ${msg}</td></tr>`;
                });
            }
        }

        function pintarFilas(lista) {
            tbody.innerHTML = '';

            if (lista.length > 0) {
                lista.forEach(p => {
                        const total = formatoMoneda(p.total, p.monedaCodigo);
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
                            <td>${obtenerPagoCell(p)}</td>
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

                        const btnCobrar = tr.querySelector('.btn-cobrar');
                        if (btnCobrar) btnCobrar.addEventListener('click', () => verificarPago(p.id, 'APROBADO'));
                        const btnRech = tr.querySelector('.btn-rechazar');
                        if (btnRech) btnRech.addEventListener('click', () => verificarPago(p.id, 'RECHAZADO'));

                        tbody.appendChild(tr);
                    });
                } else {
                    tbody.innerHTML = `<tr><td colspan="8" class="adm-empty">No se encontraron pedidos con ese criterio.</td></tr>`;
                }
        }

        async function actualizarEstado(pedidoId, nuevoEstado) {
            try {
                const res = await api.patch(`/api/pedidos/${pedidoId}/estado`, { estado: nuevoEstado });
                const pago = res.datos ? res.datos.estadoPago : null;
                if (nuevoEstado === 'ENTREGADO' && pago === 'APROBADO') {
                    showToast(`Pedido #${pedidoId} entregado y cobrado`, 'success');
                } else {
                    showToast(`Pedido #${pedidoId} actualizado a ${nuevoEstado}`, 'success');
                }
                cargarPedidosAdmin(paginaActual);
            } catch (err) {
                showToast(err.message, 'error');
                cargarPedidosAdmin(paginaActual);
            }
        }

        async function verificarPago(pedidoId, estado) {
            try {
                const res = await api.patch(`/api/pedidos/${pedidoId}/pago`, { estado });
                showToast(estado === 'APROBADO' ? `Pago #${pedidoId} verificado y cobrado` : `Pago #${pedidoId} rechazado`, estado === 'APROBADO' ? 'success' : 'warning');
                cargarPedidosAdmin(paginaActual);
            } catch (err) {
                showToast(err.message, 'error');
            }
        }

        function metodoLabel(m) {
            const map = { TARJETA_CREDITO: 'Tarjeta', TARJETA_DEBITO: 'Tarjeta', YAPE: 'Yape', PLIN: 'Plin', TRANSFERENCIA_BANCARIA: 'Transfer.', PAGO_CONTRAENTREGA: 'Contra entrega' };
            return map[m] || (m || '—');
        }

        function obtenerPagoCell(p) {
            const metodo = p.metodoPago || '—';
            const estadoPago = p.estadoPago || 'PENDIENTE';
            const op = p.referenciaComprobante ? `<div class="adm-sub">OP: <strong>${esc(p.referenciaComprobante)}</strong></div>` : '';
            let badge = '';
            if (estadoPago === 'APROBADO') badge = `<span class="adm-badge b-entregado">Cobrado</span>`;
            else if (estadoPago === 'RECHAZADO') badge = `<span class="adm-badge b-cancelado">Rechazado</span>`;
            else if (estadoPago === 'REEMBOLSADO') badge = `<span class="adm-badge b-off">Reembols.</span>`;
            else badge = `<span class="adm-badge b-pendiente">Por cobrar</span>`;
            const necesitaVerif = estadoPago === 'PENDIENTE' && p.estado !== 'CANCELADO'
                && p.procesamientoPago === 'VERIFICACION_MANUAL';
            const btns = necesitaVerif
                ? `<div style="display:flex;gap:4px;margin-top:6px">
                    <button class="adm-btn adm-btn-sm btn-cobrar" data-id="${p.id}" style="padding:4px 8px;font-size:.7rem;background:#059669;color:#fff;border:0;border-radius:6px;cursor:pointer">Cobrar</button>
                    <button class="adm-btn adm-btn-sm btn-rechazar" data-id="${p.id}" style="padding:4px 8px;font-size:.7rem;background:#fff;color:#be123c;border:1px solid #fecdd3;border-radius:6px;cursor:pointer">Rechazar</button>
                   </div>` : '';
            return `<div><div class="adm-sub">${esc(p.metodoNombre || metodoLabel(metodo))}</div><div style="margin:2px 0">${badge}</div>${op}${btns}</div>`;
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
            modalTitle.textContent = `Artículos de orden #${p.id} · ${p.metodoNombre || metodoLabel(p.metodoPago)} · ${p.estadoPago === 'APROBADO' ? 'Cobrado' : (p.estadoPago || 'PENDIENTE')}`;
            let html = '';
            if (p.referenciaComprobante) {
                html += `<div style="margin-bottom:10px;padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:.78rem">N° operación: <strong>${esc(p.referenciaComprobante)}</strong> <span style="color:#64748b">(${esc(p.codigoTransaccion || '')})</span></div>`;
            }
            html += '<div class="adm-detalle-lista">';
            if (p.detalles && p.detalles.length > 0) {
                p.detalles.forEach(d => {
                    const moneda = d.monedaCodigo || p.monedaCodigo || 'PEN';
                    const sub = formatoMoneda(d.subtotal, moneda);
                    const pu = formatoMoneda(d.precioUnitario, moneda);
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
