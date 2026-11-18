import { api } from '../api.js';
import { auth } from '../auth.js';
import { renderAdminShell } from '../ui/adminShell.js';
import { showToast } from '../ui/toast.js';
import { formatoMoneda } from '../money.js';
import { swapSuave } from '../ui/pager.js?v=2';

renderAdminShell('promociones');

const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

if (auth.protegerRutaAutenticada()) {
    if (!auth.tienePermiso('CRM_GESTIONAR')) {
        showToast('No tienes permisos para gestionar promociones y cupones CRM', 'error');
        setTimeout(() => location.href = auth.inicioAdmin(), 1500);
    } else {
        iniciar();
    }
}

let cupones = [];

function iniciar() {
    $('btn-nuevo-cupon')?.addEventListener('click', abrirModalCrear);
    $('cupon-modal-close')?.addEventListener('click', cerrarModalCrear);
    $('btn-cupon-cancelar')?.addEventListener('click', cerrarModalCrear);
    $('cupon-form')?.addEventListener('submit', guardarCupon);

    $('usos-modal-close')?.addEventListener('click', cerrarModalUsos);
    $('btn-usos-cerrar')?.addEventListener('click', cerrarModalUsos);

    cargarCupones();
}

async function cargarCupones() {
    const tbody = $('cupones-table-body');
    try {
        const res = await api.get('/api/admin/crm/cupones');
        cupones = res.datos || [];
        await renderizarTabla();
        renderizarEstadisticas();
    } catch (e) {
        showToast(e.message || 'Error al cargar cupones', 'error');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" class="adm-err">${esc(e.message)}</td></tr>`;
        }
    }
}

function renderizarEstadisticas() {
    const total = cupones.length;
    const activos = cupones.filter(c => c.activo && c.vigente && !c.agotado).length;
    const totalUsos = cupones.reduce((acc, c) => acc + (c.usosActuales || 0), 0);

    if ($('stat-total')) $('stat-total').textContent = total;
    if ($('stat-activos')) $('stat-activos').textContent = activos;
    if ($('stat-usos')) $('stat-usos').textContent = totalUsos;
}

async function renderizarTabla() {
    const tbody = $('cupones-table-body');
    if (!tbody) return;

    if (!cupones.length) {
        await swapSuave(tbody, () => {
            tbody.innerHTML = `<tr><td colspan="7" class="adm-empty">No hay cupones registrados. Haz clic en "Crear nuevo cupón" para empezar.</td></tr>`;
        });
        return;
    }

    await swapSuave(tbody, () => {
        tbody.innerHTML = cupones.map(c => {
            let badgeEstado = '<span class="adm-badge b-ok">Activo</span>';
            if (!c.activo) {
                badgeEstado = '<span class="adm-badge b-off">Pausado</span>';
            } else if (c.agotado) {
                badgeEstado = '<span class="adm-badge b-cancelado">Agotado</span>';
            } else if (!c.vigente) {
                badgeEstado = '<span class="adm-badge b-pendiente">Expirado</span>';
            }

            let tipoHtml = '';
            if (c.tipoDescuento === 'PORCENTAJE') {
                tipoHtml = `<span class="promo-discount-badge">${c.valor}% OFF</span>`;
                if (c.topeDescuentoPen) {
                    tipoHtml += `<div class="adm-sub">Tope: ${esc(formatoMoneda(c.topeDescuentoPen, 'PEN'))}</div>`;
                }
            } else if (c.tipoDescuento === 'MONTO_FIJO') {
                tipoHtml = `<span class="promo-discount-badge fijo">${esc(formatoMoneda(c.valor, 'PEN'))} FIJO</span>`;
            } else {
                tipoHtml = `<span class="promo-discount-badge">Envío Gratis</span>`;
            }

            const minCompra = Number(c.montoMinimoPen) > 0 ? `Mínimo: ${esc(formatoMoneda(c.montoMinimoPen, 'PEN'))}` : 'Sin mínimo de compra';
            const limiteUser = `Máx ${c.limitePorUsuario} / cliente`;
            const combinarPts = c.permiteCombinarPuntos ? 'Combinable con puntos' : 'Solo cupón';

            const usosTxt = c.limiteUsosTotal ? `${c.usosActuales} / ${c.limiteUsosTotal}` : `${c.usosActuales} / ∞`;

            const inicio = new Date(c.fechaInicio).toLocaleDateString('es-PE', { day:'2-digit', month:'short', year:'numeric' });
            const fin = new Date(c.fechaFin).toLocaleDateString('es-PE', { day:'2-digit', month:'short', year:'numeric' });

            return `
                <tr>
                    <td>
                        <span class="promo-code-badge">
                            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>
                            ${esc(c.codigo)}
                        </span>
                        ${c.descripcion ? `<div class="adm-sub">${esc(c.descripcion)}</div>` : ''}
                    </td>
                    <td>${tipoHtml}</td>
                    <td>
                        <div>
                            <span class="adm-strong" style="font-size: 0.78rem;">${esc(minCompra)}</span>
                            <div class="adm-sub">${esc(limiteUser)} · ${esc(combinarPts)}</div>
                        </div>
                    </td>
                    <td class="center">
                        <button type="button" class="promo-canjes-btn btn-ver-usos" data-id="${c.id}" data-codigo="${esc(c.codigo)}">
                            <span>${esc(usosTxt)} canjes</span>
                            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                        </button>
                    </td>
                    <td>
                        <span class="adm-strong" style="font-size: 0.75rem;">${inicio}</span>
                        <div class="adm-sub">hasta ${fin}</div>
                    </td>
                    <td>${badgeEstado}</td>
                    <td class="num adm-celda-num">
                        <div class="promo-actions-wrap">
                            <button type="button" class="adm-btn adm-btn-sm ${c.activo ? 'adm-btn-ghost' : 'adm-btn-primary'} btn-toggle-estado" data-id="${c.id}" data-activo="${c.activo}">
                                ${c.activo ? 'Pausar' : 'Activar'}
                            </button>
                            <button type="button" class="adm-btn adm-btn-sm adm-btn-del btn-eliminar-cupon" data-id="${c.id}" data-codigo="${esc(c.codigo)}" title="Eliminar cupón">
                                Eliminar
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Event listeners en las filas
        tbody.querySelectorAll('.btn-toggle-estado').forEach(btn => {
            btn.addEventListener('click', () => toggleEstadoCupon(btn.dataset.id, btn.dataset.activo === 'true'));
        });

        tbody.querySelectorAll('.btn-eliminar-cupon').forEach(btn => {
            btn.addEventListener('click', () => eliminarCupon(btn.dataset.id, btn.dataset.codigo));
        });

        tbody.querySelectorAll('.btn-ver-usos').forEach(btn => {
            btn.addEventListener('click', () => abrirModalUsos(btn.dataset.id, btn.dataset.codigo));
        });
    });
}

function abrirModalCrear() {
    $('cupon-form').reset();
    $('cupon-tipo').value = 'PORCENTAJE';
    $('cupon-minimo').value = 0;
    $('cupon-limite-usuario').value = 1;

    // Configurar fechas por defecto: hoy y +30 días
    const ahora = new Date();
    const despues = new Date();
    despues.setDate(despues.getDate() + 30);

    const formatDt = d => d.toISOString().slice(0, 16);
    $('cupon-fecha-inicio').value = formatDt(ahora);
    $('cupon-fecha-fin').value = formatDt(despues);

    $('cupon-modal').classList.remove('hidden');
}

function cerrarModalCrear() {
    $('cupon-modal').classList.add('hidden');
}

async function guardarCupon(e) {
    e.preventDefault();

    const codigo = ($('cupon-codigo').value || '').trim().toUpperCase();
    const descripcion = ($('cupon-descripcion').value || '').trim();
    const tipo = $('cupon-tipo').value;
    const valor = parseFloat($('cupon-valor').value);
    const montoMinimo = parseFloat($('cupon-minimo').value || '0');
    const tope = $('cupon-tope').value ? parseFloat($('cupon-tope').value) : null;
    const limiteTotal = $('cupon-limite-total').value ? parseInt($('cupon-limite-total').value) : null;
    const limiteUsuario = parseInt($('cupon-limite-usuario').value || '1');
    const fechaInicio = $('cupon-fecha-inicio').value;
    const fechaFin = $('cupon-fecha-fin').value;
    const combinarPuntos = $('cupon-combinar-puntos').checked;

    if (!codigo) {
        showToast('El código es obligatorio', 'warning');
        return;
    }

    const payload = {
        codigo,
        descripcion,
        tipoDescuento: tipo,
        valor,
        montoMinimoPen: montoMinimo,
        topeDescuentoPen: tope,
        limiteUsosTotal: limiteTotal,
        limitePorUsuario: limiteUsuario,
        fechaInicio: new Date(fechaInicio).toISOString(),
        fechaFin: new Date(fechaFin).toISOString(),
        permiteCombinarPuntos: combinarPuntos,
        activo: true
    };

    const btnSubmit = $('btn-cupon-guardar');
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Guardando…';

    try {
        const res = await api.post('/api/admin/crm/cupones', payload);
        if (res.exito) {
            showToast('Cupón creado con éxito', 'success');
            cerrarModalCrear();
            cargarCupones();
        } else {
            showToast(res.mensaje || 'Error al guardar el cupón', 'error');
        }
    } catch (err) {
        showToast(err.message || 'Error al conectar con el servidor', 'error');
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Crear Cupón';
    }
}

async function toggleEstadoCupon(id, activoActual) {
    const accion = activoActual ? 'pausar' : 'activar';
    try {
        const res = await api.patch(`/api/admin/crm/cupones/${id}/${accion}`);
        if (res.exito) {
            showToast(`Cupón ${activoActual ? 'pausado' : 'activado'} correctamente`, 'success');
            cargarCupones();
        } else {
            showToast(res.mensaje || 'No se pudo cambiar el estado', 'error');
        }
    } catch (e) {
        showToast(e.message || 'Error al cambiar estado', 'error');
    }
}

async function eliminarCupon(id, codigo) {
    if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente el cupón ${codigo}?`)) {
        return;
    }

    try {
        const res = await api.delete(`/api/admin/crm/cupones/${id}`);
        if (res.exito) {
            showToast(`Cupón ${codigo} eliminado`, 'success');
            cargarCupones();
        } else {
            showToast(res.mensaje || 'Error al eliminar cupón', 'error');
        }
    } catch (e) {
        showToast(e.message || 'Error al eliminar cupón', 'error');
    }
}

async function abrirModalUsos(id, codigo) {
    $('usos-modal-title').textContent = `Historial de Usos · Cupón ${codigo}`;
    $('usos-table-body').innerHTML = `<tr><td colspan="5" class="adm-empty">Cargando usos…</td></tr>`;
    $('usos-modal').classList.remove('hidden');

    try {
        const res = await api.get(`/api/admin/crm/cupones/${id}/usos`);
        const usos = res.datos || [];
        if (!usos.length) {
            $('usos-table-body').innerHTML = `<tr><td colspan="5" class="adm-empty">Este cupón aún no ha sido canjeado en compras.</td></tr>`;
            return;
        }

        $('usos-table-body').innerHTML = usos.map(u => {
            const fecha = new Date(u.fechaUso).toLocaleString('es-PE', { dateStyle:'medium', timeStyle:'short' });
            return `
                <tr>
                    <td>
                        <span class="adm-strong">${esc(u.usuarioNombre || 'Cliente')}</span>
                        <div class="adm-sub">${esc(u.usuarioEmail || '-')}</div>
                    </td>
                    <td>
                        <a href="/admin/pedidos.html" class="adm-link">Pedido #${u.pedidoId}</a>
                    </td>
                    <td class="num adm-strong" style="color: #059669;">
                        -${esc(formatoMoneda(u.descuentoAplicadoPen, 'PEN'))}
                    </td>
                    <td class="adm-sub">${fecha}</td>
                    <td>
                        <span class="adm-badge ${u.pedidoEstado === 'CANCELADO' ? 'b-cancelado' : 'b-ok'}">
                            ${esc(u.pedidoEstado || 'APROBADO')}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (e) {
        $('usos-table-body').innerHTML = `<tr><td colspan="5" class="adm-err">${esc(e.message || 'Error al cargar historial')}</td></tr>`;
    }
}

function cerrarModalUsos() {
    $('usos-modal').classList.add('hidden');
}
import '/assets/js/ui/crm-dialogs.js';
