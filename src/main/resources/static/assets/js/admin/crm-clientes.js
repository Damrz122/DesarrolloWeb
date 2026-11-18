import { api } from '/assets/js/api.js';
import { auth } from '/assets/js/auth.js';
import { renderAdminShell } from '/assets/js/ui/adminShell.js';
import { showToast } from '/assets/js/ui/toast.js';
import { renderPager, swapSuave } from '/assets/js/ui/pager.js?v=2';

const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

let clientesData = [];
let listaFiltradaActual = [];
let filtroSegmentoActual = '';
let clienteActivoId = null;
let paginaActual = 0;
let TAMANO_PAGINA = 12;
let temporizadorResize;

renderAdminShell('crm-clientes');

if (!auth.protegerRutaAdmin()) {
    // Redirige al login si no está autenticado o no es admin
} else if (!auth.tienePermiso('CRM_GESTIONAR')) {
    showToast('No tienes permiso para gestionar CRM Clientes', 'error');
    setTimeout(() => { window.location.href = '/admin/dashboard.html'; }, 1000);
} else {
    iniciar();
}

function filasPorViewport() {
    const tableWrap = document.querySelector('.adm-table-wrap');
    const tbody = $('tbody-clientes');
    if (!window.matchMedia('(min-width: 901px)').matches || !tableWrap || !tbody) return 12;
    const fila = tbody.querySelector('tr');
    const cabecera = tableWrap.querySelector('thead');
    if (!fila || !cabecera) return TAMANO_PAGINA;
    const altoDisponible = tableWrap.clientHeight - cabecera.getBoundingClientRect().height;
    const altoFila = Math.max(1, fila.getBoundingClientRect().height);
    return Math.max(1, Math.min(50, Math.floor(altoDisponible / altoFila)));
}

function ajustarFilasAlViewport() {
    const siguienteTamano = filasPorViewport();
    if (siguienteTamano === TAMANO_PAGINA) return;
    const primerRegistro = paginaActual * TAMANO_PAGINA;
    TAMANO_PAGINA = siguienteTamano;
    paginaActual = Math.floor(primerRegistro / TAMANO_PAGINA);
    renderizarTablaClientes(listaFiltradaActual);
}

async function iniciar() {
    $('btn-refrescar-clientes')?.addEventListener('click', () => cargarClientes());
    $('btn-exportar-csv')?.addEventListener('click', exportarCSV);

    // Filtros por chips
    document.querySelectorAll('.btn-filtro-seg').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-filtro-seg').forEach(b => {
                b.classList.remove('is-active');
                b.setAttribute('aria-selected', 'false');
            });
            btn.classList.add('is-active');
            btn.setAttribute('aria-selected', 'true');
            filtroSegmentoActual = btn.dataset.segmento || '';
            paginaActual = 0;
            aplicarFiltros();
        });
    });

    // Buscador con debounce
    let debounceTimer;
    $('input-buscar-cliente')?.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            paginaActual = 0;
            aplicarFiltros();
        }, 250);
    });

    // Eventos del modal 360°
    $('btn-cerrar-modal-360')?.addEventListener('click', cerrarModal360);
    $('modal-360')?.addEventListener('click', e => {
        if (e.target === $('modal-360')) cerrarModal360();
    });

    // Pestañas del modal
    document.querySelectorAll('.crm-tab-btn').forEach(tabBtn => {
        tabBtn.addEventListener('click', () => {
            document.querySelectorAll('.crm-tab-btn').forEach(b => {
                b.classList.remove('active', 'is-active');
                b.setAttribute('aria-selected', 'false');
            });
            document.querySelectorAll('.crm-tab-content').forEach(c => c.classList.add('hidden'));

            tabBtn.classList.add('active', 'is-active');
            tabBtn.setAttribute('aria-selected', 'true');
            const targetId = tabBtn.dataset.tab;
            const targetEl = $(targetId);
            if (targetEl) targetEl.classList.remove('hidden');
        });
    });

    // Formulario de nota
    $('form-nueva-nota')?.addEventListener('submit', registrarNota);

    window.addEventListener('resize', () => {
        clearTimeout(temporizadorResize);
        temporizadorResize = setTimeout(ajustarFilasAlViewport, 150);
    });

    await cargarClientes();
}

async function cargarClientes() {
    const tbody = $('tbody-clientes');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="8" class="adm-empty">Cargando base de clientes…</td></tr>';
    }

    try {
        const res = await api.get('/api/admin/crm/clientes');
        if (!res.exito || !Array.isArray(res.datos)) {
            throw new Error(res.mensaje || 'Error al obtener clientes');
        }
        clientesData = res.datos;
        aplicarFiltros();
    } catch (err) {
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="8" class="adm-err">Error al cargar clientes: ${esc(err.message)}</td></tr>`;
        }
        showToast('Error al cargar clientes CRM: ' + err.message, 'error');
    }
}

function aplicarFiltros() {
    const q = ($('input-buscar-cliente')?.value || '').trim().toLowerCase();

    let lista = clientesData.filter(c => {
        if (filtroSegmentoActual && c.segmento !== filtroSegmentoActual) {
            return false;
        }
        if (q) {
            const nom = (c.nombre || '').toLowerCase();
            const em = (c.email || '').toLowerCase();
            const doc = (c.numeroDocumento || '').toLowerCase();
            return nom.includes(q) || em.includes(q) || doc.includes(q);
        }
        return true;
    });

    renderizarTablaClientes(lista);
}

function obtenerBadgeNivel(nivel) {
    const n = (nivel || 'BRONCE').toUpperCase();
    if (n === 'ORO') return '<span class="badge-tier badge-tier--oro">Oro</span>';
    if (n === 'PLATA') return '<span class="badge-tier badge-tier--plata">Plata</span>';
    return '<span class="badge-tier badge-tier--bronce">Bronce</span>';
}

function obtenerBadgeSegmento(segmento, label) {
    const s = (segmento || '').toUpperCase();
    const txt = esc(label || s || 'Inactivo');
    if (s === 'VIP') {
        return `<span class="adm-badge b-vip">${txt}</span>`;
    } else if (s === 'ACTIVO') {
        return `<span class="adm-badge b-ok">${txt}</span>`;
    } else if (s === 'EN_RIESGO') {
        return `<span class="adm-badge b-pendiente">${txt}</span>`;
    } else if (s === 'PROSPECTO') {
        return `<span class="adm-badge b-proceso">${txt}</span>`;
    } else if (s === 'INACTIVO') {
        return `<span class="adm-badge b-off">${txt}</span>`;
    }
    return `<span class="adm-badge b-off">${txt}</span>`;
}

async function renderizarTablaClientes(lista) {
    listaFiltradaActual = lista;
    const tbody = $('tbody-clientes');
    const pager = $('crm-pager');
    if (!tbody) return;

    if (!lista || lista.length === 0) {
        await swapSuave(tbody, () => {
            tbody.innerHTML = '<tr><td colspan="8" class="adm-empty">No se encontraron clientes que coincidan con el criterio seleccionado.</td></tr>';
        });
        if (pager) pager.setAttribute('hidden', '');
        return;
    }

    const totalPaginas = Math.ceil(lista.length / TAMANO_PAGINA);
    if (paginaActual >= totalPaginas) paginaActual = Math.max(0, totalPaginas - 1);
    if (paginaActual < 0) paginaActual = 0;

    const inicio = paginaActual * TAMANO_PAGINA;
    const fin = inicio + TAMANO_PAGINA;
    const paginaItems = lista.slice(inicio, fin);

    await swapSuave(tbody, () => {
        tbody.innerHTML = paginaItems.map(c => {
            const ltv = Number(c.ltvPen || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const dias = c.diasDesdeUltimaCompra !== null ? `${c.diasDesdeUltimaCompra}d` : '—';
            const fechaUltima = c.fechaUltimaCompra ? new Date(c.fechaUltimaCompra).toLocaleDateString('es-PE', { day:'2-digit', month:'short' }) : 'Sin compras';
            const initial = (c.nombre || c.email || 'U').charAt(0).toUpperCase();

            return `<tr>
                <td>
                    <div class="adm-prod">
                        <span class="adm-avatar">${esc(initial)}</span>
                        <div>
                            <div class="adm-strong">${esc(c.nombre)}</div>
                            <div class="adm-sub">${esc(c.email)}</div>
                        </div>
                    </div>
                </td>
                <td>${obtenerBadgeNivel(c.nivel)}</td>
                <td>${obtenerBadgeSegmento(c.segmento, c.segmentoLabel)}</td>
                <td class="num">
                    <span class="adm-strong adm-total" style="font-size: 0.88rem;">S/ ${ltv}</span>
                </td>
                <td class="center">
                    <span class="adm-strong">${c.totalPedidos || 0}</span>
                </td>
                <td class="center">
                    <span class="adm-strong">${dias}</span>
                    <div class="adm-sub">${fechaUltima}</div>
                </td>
                <td class="num">
                    <span class="crm-pts-cell">${c.saldoPuntos || 0} <small>pts</small></span>
                </td>
                <td class="num adm-celda-num">
                    <button type="button" class="btn-ver-360 adm-btn adm-btn-edit adm-btn-sm" data-id="${c.usuarioId}">
                        Ver 360°
                    </button>
                </td>
            </tr>`;
        }).join('');

        tbody.querySelectorAll('.btn-ver-360').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id, 10);
                abrirFicha360(id);
            });
        });
    });

    if (pager) {
        renderPager(pager, {
            pagina: paginaActual,
            totalPaginas,
            onPage: p => {
                paginaActual = p;
                renderizarTablaClientes(listaFiltradaActual);
            }
        });
    }
}

async function abrirFicha360(usuarioId) {
    clienteActivoId = usuarioId;
    const modal = $('modal-360');
    if (!modal) return;

    modal.classList.remove('hidden');

    // Resetear a pestaña inicial
    const primerTab = document.querySelector('.crm-tab-btn[data-tab="tab-resumen"]');
    if (primerTab) primerTab.click();

    // Resetear notas input
    $('input-nueva-nota').value = '';

    try {
        const res = await api.get(`/api/admin/crm/clientes/${usuarioId}/360`);
        if (!res.exito || !res.datos) {
            throw new Error(res.mensaje || 'Error al obtener ficha 360°');
        }
        pintarFicha360(res.datos);
    } catch (err) {
        showToast('Error al abrir cliente: ' + err.message, 'error');
        cerrarModal360();
    }
}

function pintarFicha360(c) {
    const initial = (c.nombre || c.email || 'U').charAt(0).toUpperCase();
    $('m360-avatar').textContent = initial;
    $('m360-nombre').textContent = c.nombre || 'Sin nombre';

    const nivelBadge = $('m360-badge-nivel');
    const n = (c.nivelActual || c.nivel || 'BRONCE').toUpperCase();
    nivelBadge.className = `badge-tier badge-tier--${n.toLowerCase()}`;
    nivelBadge.textContent = n.charAt(0) + n.slice(1).toLowerCase();

    const segBadge = $('m360-badge-segmento');
    segBadge.outerHTML = `<span id="m360-badge-segmento">${obtenerBadgeSegmento(c.segmento, c.segmentoLabel)}</span>`;

    const fechaReg = c.fechaRegistro ? new Date(c.fechaRegistro).toLocaleDateString('es-PE', { year:'numeric', month:'short' }) : 'Reciente';
    $('m360-meta').textContent = `${c.email} · DNI/Doc: ${c.numeroDocumento || 'No registrado'} · Miembro desde ${fechaReg}`;

    // KPI Cards
    const ltv = Number(c.ltvPen || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    $('m360-ltv').textContent = `S/ ${ltv}`;
    const ticket = Number(c.ticketPromedioPen || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    $('m360-ticket').textContent = `S/ ${ticket}`;
    $('m360-recencia').textContent = c.diasDesdeUltimaCompra !== null ? `${c.diasDesdeUltimaCompra} d` : '—';
    $('m360-puntos').textContent = c.saldoPuntos || 0;
    const puntosPen = Number(c.valorEstimadoPuntosPen ?? c.puntosEquivalentePen ?? 0).toFixed(2);
    $('m360-puntos-pen').textContent = `≈ S/ ${puntosPen} en saldo`;

    // Diagnóstico
    $('m360-diag-desc').textContent = c.diagnosticoRfm || 'Cliente con comportamiento estándar de compra.';
    const diagBadge = $('m360-diag-badge');
    if (diagBadge) {
        diagBadge.outerHTML = `<span id="m360-diag-badge">${obtenerBadgeSegmento(c.segmento, c.segmentoLabel)}</span>`;
    }

    // Pedidos
    const pedidos = c.ultimosPedidos || [];
    $('m360-badge-num-pedidos').textContent = pedidos.length;
    const tbodyPed = $('m360-tbody-pedidos');
    if (tbodyPed) {
        if (pedidos.length === 0) {
            tbodyPed.innerHTML = '<tr><td colspan="6" class="adm-empty">Sin pedidos registrados</td></tr>';
        } else {
            tbodyPed.innerHTML = pedidos.map(p => {
                const total = Number(p.total || 0).toFixed(2);
                const fecha = p.fecha ? new Date(p.fecha).toLocaleDateString('es-PE', { day:'2-digit', month:'short', year:'numeric' }) : '—';
                const estadoClass = p.estado === 'ENTREGADO' ? 'b-ok' : (p.estado === 'CANCELADO' ? 'b-cancelado' : 'b-pendiente');
                const pagoClass = p.estadoPago === 'APROBADO' ? 'b-ok' : (p.estadoPago === 'RECHAZADO' ? 'b-cancelado' : 'b-pendiente');
                return `<tr>
                    <td class="adm-strong">#${p.id}</td>
                    <td>${fecha}</td>
                    <td class="adm-strong">S/ ${total}</td>
                    <td><span class="adm-badge ${estadoClass}">${esc(p.estado)}</span></td>
                    <td><span class="adm-badge ${pagoClass}">${esc(p.estadoPago)}</span></td>
                    <td class="num">
                        <a href="/admin/pedidos.html" class="adm-link">Ver orden</a>
                    </td>
                </tr>`;
            }).join('');
        }
    }

    // Transacciones de puntos
    const txs = c.ultimasTransacciones || c.transaccionesPuntos || [];
    const tbodyTxs = $('m360-tbody-transacciones');
    if (tbodyTxs) {
        if (txs.length === 0) {
            tbodyTxs.innerHTML = '<tr><td colspan="5" class="adm-empty">Sin movimientos de puntos</td></tr>';
        } else {
            tbodyTxs.innerHTML = txs.map(t => {
                const esPos = t.puntos > 0;
                const ptsClass = esPos ? 'style="color:#059669; font-weight:800;"' : 'style="color:#d97706; font-weight:800;"';
                const ptsSign = esPos ? `+${t.puntos}` : `${t.puntos}`;
                const fecha = t.fecha ? new Date(t.fecha).toLocaleDateString('es-PE', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '—';
                return `<tr>
                    <td>${fecha}</td>
                    <td><span class="adm-badge b-off">${esc(t.tipo)}</span></td>
                    <td>${esc(t.descripcion || '-')}</td>
                    <td class="num" ${ptsClass}>${ptsSign} pts</td>
                    <td class="num adm-strong">${t.saldoResultante} pts</td>
                </tr>`;
            }).join('');
        }
    }

    // Notas de soporte
    const notas = c.notas || [];
    $('m360-badge-num-notas').textContent = notas.length;
    pintarListaNotas(notas);
}

function pintarListaNotas(notas) {
    const cont = $('m360-lista-notas');
    if (!cont) return;

    if (!notas || notas.length === 0) {
        cont.innerHTML = '<p class="adm-empty">No hay notas registradas para este cliente.</p>';
        return;
    }

    cont.innerHTML = notas.map(n => {
        const fecha = n.fechaCreacion ? new Date(n.fechaCreacion).toLocaleString('es-PE', { dateStyle:'medium', timeStyle:'short' }) : '—';
        return `<div class="crm-note-card">
            <div class="crm-note-meta">
                <span class="crm-note-author">${esc(n.autorNombre || 'Staff')}</span>
                <span>${fecha}</span>
            </div>
            <p class="crm-note-text">${esc(n.contenido)}</p>
        </div>`;
    }).join('');
}

async function registrarNota(e) {
    e.preventDefault();
    if (!clienteActivoId) return;

    const input = $('input-nueva-nota');
    const contenido = (input.value || '').trim();
    if (!contenido) return;

    const btn = $('btn-guardar-nota');
    btn.disabled = true;

    try {
        const res = await api.post(`/api/admin/crm/clientes/${clienteActivoId}/notas`, { contenido });
        if (!res.exito || !res.datos) {
            throw new Error(res.mensaje || 'Error al registrar nota');
        }
        input.value = '';
        showToast('Nota registrada correctamente', 'success');

        // Recargar ficha activa
        const recarga = await api.get(`/api/admin/crm/clientes/${clienteActivoId}/360`);
        if (recarga.exito && recarga.datos) {
            pintarFicha360(recarga.datos);
        }
    } catch (err) {
        showToast('Error al registrar nota: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
    }
}

function cerrarModal360() {
    const modal = $('modal-360');
    if (modal) modal.classList.add('hidden');
    clienteActivoId = null;
}

function exportarCSV() {
    if (!clientesData || clientesData.length === 0) {
        showToast('No hay datos para exportar', 'warning');
        return;
    }

    const headers = ['ID', 'Nombre', 'Email', 'Documento', 'Nivel', 'Segmento', 'LTV_PEN', 'Total_Pedidos', 'Dias_Ultima_Compra', 'Saldo_Puntos'];
    const rows = clientesData.map(c => [
        c.usuarioId,
        `"${(c.nombre || '').replace(/"/g, '""')}"`,
        `"${(c.email || '').replace(/"/g, '""')}"`,
        `"${(c.numeroDocumento || '').replace(/"/g, '""')}"`,
        c.nivel || 'Bronce',
        c.segmento || 'INACTIVO',
        Number(c.ltvPen || 0).toFixed(2),
        c.totalPedidos || 0,
        c.diasDesdeUltimaCompra !== null ? c.diasDesdeUltimaCompra : '',
        c.saldoPuntos || 0
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `clientes_crm_electronix_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exportación CSV completada', 'success');
}
import '/assets/js/ui/crm-dialogs.js';
