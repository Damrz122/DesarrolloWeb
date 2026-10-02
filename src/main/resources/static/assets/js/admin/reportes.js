import { api } from '/assets/js/api.js';
        import { auth } from '/assets/js/auth.js';
        import { renderAdminShell } from '/assets/js/ui/adminShell.js?v=2';
        import { showToast } from '/assets/js/ui/toast.js';

        const form       = document.getElementById('form-fechas');
        const desdeInput = document.getElementById('rep-desde');
        const hastaInput = document.getElementById('rep-hasta');
        const fechasBody = document.getElementById('rep-fechas-body');
        const stockBody  = document.getElementById('rep-stock-body');
        const btnFiltrar = document.getElementById('btn-filtrar');

        renderAdminShell('reportes');

        if (!auth.protegerRutaAdmin()) {
            // Guard
        } else {
            initReportes();
        }

        function esc(v) {
            return String(v ?? '')
                .replace(/&/g, '&amp;').replace(/</g, '&lt;')
                .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        }
        const fmt = v => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(v);

        function initReportes() {
            const hoy     = new Date().toISOString().split('T')[0];
            const hace30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            desdeInput.value = hace30d;
            hastaInput.value = hoy;
            cargarReporte(hace30d, hoy);

            form.addEventListener('submit', e => {
                e.preventDefault();
                cargarReporte(desdeInput.value, hastaInput.value);
            });
        }

        async function cargarReporte(desde, hasta) {
            btnFiltrar.disabled = true;
            btnFiltrar.textContent = 'Cargando…';
            try {
                let url = '/api/reportes/ventas';
                if (desde && hasta) url += `?desde=${desde}&hasta=${hasta}`;

                const res = await api.get(url);
                if (res.exito && res.datos) {
                    const r = res.datos;

                    document.getElementById('rep-total-ventas').textContent    = fmt(r.totalVentas);
                    document.getElementById('rep-cant-pedidos').textContent    = r.totalPedidos;
                    document.getElementById('rep-ticket-promedio').textContent = fmt(r.ticketPromedio);

                    // ── Tabla fechas ──
                    fechasBody.innerHTML = '';
                    if (r.ventasPorFecha && r.ventasPorFecha.length > 0) {
                        r.ventasPorFecha.forEach(v => {
                            fechasBody.innerHTML += `
                                <tr>
                                    <td><span class="rp-date-strong">${esc(v.fecha)}</span></td>
                                    <td>${v.cantidadPedidos} pedido${v.cantidadPedidos !== 1 ? 's' : ''}</td>
                                    <td class="num"><span class="rp-amount">${fmt(v.total)}</span></td>
                                </tr>`;
                        });
                    } else {
                        fechasBody.innerHTML = `
                            <tr><td colspan="3">
                                <div class="rp-empty">
                                    <svg class="rp-empty-icon" width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                                    </svg>
                                    <p>No hay ventas en este período.</p>
                                </div>
                            </td></tr>`;
                    }

                    // ── Tabla stock ──
                    stockBody.innerHTML = '';
                    if (r.productosBajoStock && r.productosBajoStock.length > 0) {
                        r.productosBajoStock.forEach(p => {
                            stockBody.innerHTML += `
                                <tr>
                                    <td><span class="rp-date-strong">${esc(p.nombre)}</span></td>
                                    <td class="rp-muted">${esc(p.categoriaNombre)}</td>
                                    <td class="num"><span class="adm-badge b-cancelado">${p.stock} uds.</span></td>
                                </tr>`;
                        });
                    } else {
                        stockBody.innerHTML = `
                            <tr><td colspan="3">
                                <div class="rp-empty">
                                    <svg class="rp-empty-icon--ok" width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                    </svg>
                                    <p class="rp-empty-text--ok">Todos los productos tienen stock óptimo.</p>
                                </div>
                            </td></tr>`;
                    }
                }
            } catch (err) {
                showToast('Error al cargar reporte: ' + err.message, 'error');
            } finally {
                btnFiltrar.disabled = false;
                btnFiltrar.innerHTML = `
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"/>
                    </svg>
                    Filtrar`;
            }
        }
