import { api } from '/assets/js/api.js';
        import { auth } from '/assets/js/auth.js';
        import { renderAdminShell } from '/assets/js/ui/adminShell.js?v=2';
        import { showToast } from '/assets/js/ui/toast.js';

        renderAdminShell('dashboard');

        if (!auth.protegerRutaAdmin()) {
            // redirige
        } else {
            cargarDashboard();
        }

        const fmt = v => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(v);
        const fmtFecha = iso => new Date(iso).toLocaleString('es-PE', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        function esc(v) {
            return String(v ?? '')
                .replace(/&/g,'&amp;').replace(/</g,'&lt;')
                .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
        }

        async function cargarDashboard() {
            try {
                // 1. Estadísticas de reporte
                const repRes = await api.get('/api/reportes/ventas');
                if (repRes.exito && repRes.datos) {
                    const r = repRes.datos;
                    document.getElementById('stat-ventas').textContent  = fmt(r.totalVentas);
                    document.getElementById('stat-pedidos').textContent = r.totalPedidos;
                    document.getElementById('stat-ticket').textContent  = fmt(r.ticketPromedio);
                    document.getElementById('stat-stock-bajo').textContent =
                        r.productosBajoStock ? r.productosBajoStock.length : 0;

                    // Sparkline en tarjeta de ticket
                    if (r.ventasPorDia && r.ventasPorDia.length > 0) {
                        renderSparklineSvg(r.ventasPorDia);
                    }
                }

                // 2. Últimas órdenes (máx. 5)
                const pedRes = await api.get('/api/pedidos?size=5');
                const tbody = document.getElementById('table-pedidos-body');

                if (pedRes.exito && pedRes.datos && pedRes.datos.contenido.length > 0) {
                    const items = pedRes.datos.contenido;
                    document.getElementById('orders-count').textContent = items.length;
                    tbody.innerHTML = '';
                    items.forEach(p => {
                        tbody.innerHTML += `
                            <tr>
                                <td><span class="db-order-id">#${esc(p.id)}</span></td>
                                <td><span class="db-client-name">${esc(p.usuarioNombre) || 'Cliente'}</span></td>
                                <td class="num"><span class="db-amount">${fmt(p.total)}</span></td>
                                <td>${badge(p.estado)}</td>
                                <td class="db-date-cell">${fmtFecha(p.fecha)}</td>
                                <td>
                                    <div class="db-row-actions">
                                        <a href="/admin/pedidos.html?id=${esc(p.id)}"
                                           class="db-row-btn db-row-btn--view" title="Ver detalle">
                                            <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                            </svg>
                                            Ver
                                        </a>
                                        <a href="/admin/pedidos.html?id=${esc(p.id)}&accion=estado"
                                           class="db-row-btn db-row-btn--estado" title="Cambiar estado">
                                            <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                                            </svg>
                                            Estado
                                        </a>
                                    </div>
                                </td>
                            </tr>
                        `;
                    });
                } else {
                    tbody.innerHTML = `
                        <tr><td colspan="6">
                            <div class="db-empty">
                                <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="db-error-icono">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                                </svg>
                                <p>No hay órdenes registradas aún.</p>
                            </div>
                        </td></tr>
                    `;
                }

                // 3. Chats activos con mensajes de clientes sin atender
                try {
                    const chatRes = await api.get('/api/chat/conversaciones');
                    if (chatRes.exito && chatRes.datos) {
                        // Solo cuenta conversaciones donde hay mensajes de clientes sin leer
                        const conMensajesCliente = chatRes.datos.filter(c =>
                            // conteo chat: es para contar mensajes sin leer
                            (c.mensajesNoLeidos && c.mensajesNoLeidos > 0) ||
                            (c.ultimoRemitenteRol && c.ultimoRemitenteRol === 'CLIENTE' && !c.respondido)
                        );
                        const totalNoLeidos = chatRes.datos.reduce((sum, c) =>
                            sum + (c.mensajesNoLeidos || 0), 0);

                        const badge  = document.getElementById('chat-badge');
                        const action = document.getElementById('action-chat');
                        const icon   = action.querySelector('.db-action-icon');

                        if (conMensajesCliente.length > 0 || totalNoLeidos > 0) {
                            const n = totalNoLeidos > 0 ? totalNoLeidos : conMensajesCliente.length;
                            badge.textContent = n > 9 ? '9+' : n;
                            badge.removeAttribute('hidden');
                        } else {
                            badge.setAttribute('hidden', '');
                            // Sin urgencia: quitar estilo crítico
                            const action = document.getElementById('action-chat');
                            action.classList.remove('db-action-item--urgent');
                            const icon = action.querySelector('.db-action-icon');
                            icon.className = 'db-action-icon db-action-icon--teal';
                        }
                    }
                } catch (_) {
                    document.getElementById('action-chat').classList.remove('db-action-item--urgent');
                }

            } catch (err) {
                console.error('Error cargando dashboard:', err);
                showToast('Error cargando datos del dashboard', 'error');
            }
        }

        // sparkline: es para dibujar la mini grafica del ticket
        function renderSparklineSvg(datos) {
            const W = 120, H = 36;
            const vals = datos.map(d => d.total);
            const max  = Math.max(...vals, 1);
            const step = W / Math.max(vals.length - 1, 1);

            const pts = vals.map((v, i) => {
                const x = i * step;
                const y = H - (v / max) * (H - 4) - 2;
                return `${x.toFixed(1)},${y.toFixed(1)}`;
            }).join(' ');

            const firstPt = `0,${H}`;
            const lastPt  = `${W},${H}`;
            const fillPts = `${firstPt} ${pts} ${lastPt}`;

            document.getElementById('sparkline-line').setAttribute('points', pts);
            document.getElementById('sparkline-fill').setAttribute('points', fillPts);
        }

        // badge pedido: es para el estado en la tabla
        function badge(estado) {
            const map = {
                'PENDIENTE':  ['adm-badge b-pendiente', 'Pendiente'],
                'EN_PROCESO': ['adm-badge b-proceso',   'En proceso'],
                'ENVIADO':    ['adm-badge b-enviado',   'Enviado'],
                'ENTREGADO':  ['adm-badge b-entregado', 'Entregado'],
                'CANCELADO':  ['adm-badge b-cancelado', 'Cancelado'],
            };
            const [cls, label] = map[estado] ?? ['adm-badge b-off', esc(estado)];
            return `<span class="${cls}" aria-label="Estado: ${label}">${label}</span>`;
        }
