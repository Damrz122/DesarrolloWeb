import { api } from '/assets/js/api.js';
import { auth } from '/assets/js/auth.js';
import { renderAdminShell } from '/assets/js/ui/adminShell.js';
import { showToast } from '/assets/js/ui/toast.js';
import { swapSuave } from '/assets/js/ui/pager.js?v=2';

const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

let usuarioConsultadoId = null;
let nivelesList = [];
let nivelEditandoCodigo = null;

renderAdminShell('fidelizacion');

if (!auth.protegerRutaAdmin()) {
    // Redirección por protección
} else if (!auth.tienePermiso('CRM_GESTIONAR')) {
    showToast('No tienes permiso para gestionar fidelización CRM', 'error');
    setTimeout(() => { window.location.href = '/admin/dashboard.html'; }, 1000);
} else {
    iniciar();
}

async function iniciar() {
    $('btn-recargar-todo')?.addEventListener('click', () => {
        cargarConfig();
        cargarNiveles();
        if (usuarioConsultadoId) consultarBilletera(usuarioConsultadoId);
    });

    $('form-config-puntos')?.addEventListener('submit', guardarConfig);
    $('btn-buscar-billetera')?.addEventListener('click', () => {
        const id = parseInt($('input-buscar-usuario-id')?.value || '0', 10);
        if (id > 0) consultarBilletera(id);
        else showToast('Ingresa un ID de usuario válido', 'warning');
    });
    $('input-buscar-usuario-id')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const id = parseInt($('input-buscar-usuario-id')?.value || '0', 10);
            if (id > 0) consultarBilletera(id);
        }
    });

    $('form-ajuste-manual')?.addEventListener('submit', ejecutarAjusteManual);

    // Modal Niveles
    $('btn-cerrar-modal-nivel')?.addEventListener('click', cerrarModalNivel);
    $('btn-cancelar-modal-nivel')?.addEventListener('click', cerrarModalNivel);
    $('form-editar-nivel')?.addEventListener('submit', guardarNivel);

    await Promise.all([cargarConfig(), cargarNiveles()]);
}

async function cargarConfig() {
    try {
        const res = await api.get('/api/admin/crm/puntos/config');
        if (!res.exito || !res.datos) return;
        const cfg = res.datos;

        $('cfg-factor').value = cfg.factorSolPorPunto;
        $('cfg-valor').value = cfg.valorPenPorPunto;
        $('cfg-minimo').value = cfg.minimoPuntosCanje;
        $('cfg-max-cobertura').value = cfg.maxCoberturaPorcentaje;
        $('cfg-bienvenida').value = cfg.puntosBienvenida;
        $('cfg-activo').value = String(cfg.activo !== false);

        // Actualizar estadísticas rápidas
        $('stat-factor').textContent = `S/ ${Number(cfg.factorSolPorPunto).toFixed(2)} = 1 pt`;
        $('stat-valor').textContent = `1 pt = S/ ${Number(cfg.valorPenPorPunto).toFixed(2)}`;
        $('stat-cobertura').textContent = `Mín ${cfg.minimoPuntosCanje} · Máx ${cfg.maxCoberturaPorcentaje}%`;
        $('stat-bienvenida').textContent = `${cfg.puntosBienvenida} pts`;

        const badge = $('badge-estado-programa');
        if (badge) {
            if (cfg.activo !== false) {
                badge.className = 'adm-badge b-ok';
                badge.textContent = 'ACTIVO';
            } else {
                badge.className = 'adm-badge b-off';
                badge.textContent = 'PAUSADO';
            }
        }
    } catch (e) {
        showToast('Error al cargar configuración de puntos: ' + e.message, 'error');
    }
}

async function guardarConfig(e) {
    e.preventDefault();
    const btn = $('btn-guardar-config');
    btn.disabled = true;

    const payload = {
        factorSolPorPunto: parseFloat($('cfg-factor').value),
        valorPenPorPunto: parseFloat($('cfg-valor').value),
        minimoPuntosCanje: parseInt($('cfg-minimo').value, 10),
        maxCoberturaPorcentaje: parseInt($('cfg-max-cobertura').value, 10),
        puntosBienvenida: parseInt($('cfg-bienvenida').value, 10),
        activo: $('cfg-activo').value === 'true'
    };

    try {
        const res = await api.put('/api/admin/crm/puntos/config', payload);
        if (res.exito) {
            showToast('Configuración de puntos guardada correctamente', 'success');
            await cargarConfig();
        }
    } catch (e) {
        showToast('Error al guardar configuración: ' + e.message, 'error');
    } finally {
        btn.disabled = false;
    }
}

async function consultarBilletera(usuarioId) {
    usuarioConsultadoId = usuarioId;
    const wrap = $('fid-wallet-active');
    const hint = $('fid-wallet-empty');

    try {
        const res = await api.get(`/api/admin/crm/puntos/usuarios/${usuarioId}`);
        if (!res.exito || !res.datos) {
            showToast('No se encontró billetera para el usuario #' + usuarioId, 'warning');
            return;
        }
        const b = res.datos;

        hint.classList.add('hidden');
        wrap.classList.remove('hidden');

        $('fid-nombre-usuario').textContent = `${b.usuarioNombre || 'Usuario'} (ID #${b.usuarioId})`;
        if ($('fid-avatar')) {
            $('fid-avatar').textContent = (b.usuarioNombre ? b.usuarioNombre.charAt(0) : 'U').toUpperCase();
        }
        $('fid-email-usuario').textContent = b.usuarioEmail || 'Sin email registrado';
        $('fid-saldo-puntos').textContent = `${b.saldoPuntos} pts`;
        const valPen = Number(b.valorEstimadoPen ?? b.equivalentePen ?? 0).toFixed(2);
        $('fid-valor-pen').textContent = `S/ ${valPen}`;

        const nivelBadge = $('fid-badge-nivel');
        if (nivelBadge) {
            const nivelCod = (b.nivelCodigo || 'BRONCE').toUpperCase();
            nivelBadge.textContent = b.nivelNombre || nivelCod;
            if (nivelCod === 'ORO') {
                nivelBadge.className = 'badge-tier badge-tier--oro';
            } else if (nivelCod === 'PLATA') {
                nivelBadge.className = 'badge-tier badge-tier--plata';
            } else {
                nivelBadge.className = 'badge-tier badge-tier--bronce';
            }
        }

        const tbody = $('tbody-ledger-usuario');
        const txs = b.transaccionesRecientes ?? b.transacciones ?? [];
        if (txs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="adm-empty">Sin movimientos registrados para esta billetera.</td></tr>';
        } else {
            tbody.innerHTML = txs.map(t => {
                const esPos = t.puntos > 0;
                const ptsCls = esPos ? 'color: #059669; font-weight: 800;' : 'color: #d97706; font-weight: 800;';
                const ptsSign = esPos ? `+${t.puntos}` : `${t.puntos}`;
                const fecha = t.fecha ? new Date(t.fecha).toLocaleString('es-PE', { dateStyle:'short', timeStyle:'short' }) : '—';
                return `<tr>
                    <td class="adm-sub">${fecha}</td>
                    <td><span class="adm-id" style="font-size: 0.72rem;">${esc(t.tipo)}</span></td>
                    <td><span class="adm-strong">${esc(t.descripcion || '—')}</span></td>
                    <td class="num" style="${ptsCls}">${ptsSign} pts</td>
                    <td class="num"><strong class="adm-strong">${t.saldoResultante} pts</strong></td>
                </tr>`;
            }).join('');
        }
    } catch (e) {
        showToast('Error al consultar billetera: ' + e.message, 'error');
    }
}

async function ejecutarAjusteManual(e) {
    e.preventDefault();
    if (!usuarioConsultadoId) {
        showToast('Debes buscar un cliente primero', 'warning');
        return;
    }

    const puntos = parseInt($('ajuste-puntos').value, 10);
    const motivo = $('ajuste-motivo').value.trim();

    if (!puntos) {
        showToast('Indica la cantidad de puntos a ajustar', 'warning');
        return;
    }
    if (!motivo) {
        showToast('El motivo del ajuste es obligatorio para auditoría', 'warning');
        return;
    }

    const btn = $('btn-ejecutar-ajuste');
    btn.disabled = true;

    try {
        const res = await api.post('/api/admin/crm/puntos/ajuste', {
            usuarioId: usuarioConsultadoId,
            puntos,
            motivo
        });
        if (res.exito) {
            showToast('Ajuste de puntos aplicado correctamente', 'success');
            $('ajuste-puntos').value = '';
            $('ajuste-motivo').value = '';
            await consultarBilletera(usuarioConsultadoId);
        }
    } catch (e) {
        showToast('Error al realizar ajuste: ' + e.message, 'error');
    } finally {
        btn.disabled = false;
    }
}

// =========================================================================
// GESTIÓN DE NIVELES VIP (FASE 3)
// =========================================================================

async function cargarNiveles() {
    const tbody = $('tbody-niveles');
    if (!tbody) return;

    try {
        const res = await api.get('/api/admin/crm/niveles');
        if (!res.exito || !Array.isArray(res.datos)) return;
        nivelesList = res.datos;

        if (nivelesList.length === 0) {
            await swapSuave(tbody, () => {
                tbody.innerHTML = '<tr><td colspan="6" class="adm-empty">No se encontraron niveles configurados.</td></tr>';
            });
            return;
        }

        await swapSuave(tbody, () => {
            tbody.innerHTML = nivelesList.map(n => {
                const mult = Number(n.multiplicador || 1).toFixed(2);
                const umbral = Number(n.umbralPenAnual || 0).toFixed(2);
                const envioBadge = n.beneficioEnvio
                    ? '<span class="adm-badge b-ok">Sí (Gratis)</span>'
                    : '<span class="adm-badge b-off">No</span>';

                let nivelBadge = `<span class="badge-tier badge-tier--bronce">${esc(n.nombre)} (${esc(n.codigo)})</span>`;
                if (n.codigo === 'ORO') {
                    nivelBadge = `<span class="badge-tier badge-tier--oro">${esc(n.nombre)} (${esc(n.codigo)})</span>`;
                } else if (n.codigo === 'PLATA') {
                    nivelBadge = `<span class="badge-tier badge-tier--plata">${esc(n.nombre)} (${esc(n.codigo)})</span>`;
                }

                return `<tr>
                    <td><span class="adm-id">${n.orden}</span></td>
                    <td>${nivelBadge}</td>
                    <td><span class="adm-strong">S/ ${umbral}</span></td>
                    <td><span class="adm-strong" style="color: var(--adm-teal);">${mult}x</span></td>
                    <td class="center">${envioBadge}</td>
                    <td class="num adm-celda-num">
                        <button type="button" class="btn-editar-nivel adm-btn adm-btn-edit adm-btn-sm" data-codigo="${esc(n.codigo)}">
                            Editar
                        </button>
                    </td>
                </tr>`;
            }).join('');

            tbody.querySelectorAll('.btn-editar-nivel').forEach(btn => {
                btn.addEventListener('click', () => {
                    const codigo = btn.dataset.codigo;
                    abrirModalNivel(codigo);
                });
            });
        });
    } catch (e) {
        showToast('Error al cargar niveles VIP: ' + e.message, 'error');
    }
}

function abrirModalNivel(codigo) {
    const nivel = nivelesList.find(n => n.codigo === codigo);
    if (!nivel) return;

    nivelEditandoCodigo = codigo;
    $('modal-nivel-codigo').textContent = codigo;
    $('modal-nivel-nombre').value = nivel.nombre;
    $('modal-nivel-umbral').value = nivel.umbralPenAnual;
    $('modal-nivel-mult').value = nivel.multiplicador;
    $('modal-nivel-envio').checked = !!nivel.beneficioEnvio;

    $('modal-editar-nivel')?.classList.remove('hidden');
}

function cerrarModalNivel() {
    $('modal-editar-nivel')?.classList.add('hidden');
    nivelEditandoCodigo = null;
}

async function guardarNivel(e) {
    e.preventDefault();
    if (!nivelEditandoCodigo) return;

    const btn = $('btn-guardar-modal-nivel');
    btn.disabled = true;

    const payload = {
        nombre: $('modal-nivel-nombre').value.trim(),
        umbralPenAnual: parseFloat($('modal-nivel-umbral').value),
        multiplicador: parseFloat($('modal-nivel-mult').value),
        beneficioEnvio: $('modal-nivel-envio').checked
    };

    try {
        const res = await api.put(`/api/admin/crm/niveles/${nivelEditandoCodigo}`, payload);
        if (res.exito) {
            showToast(`Nivel ${nivelEditandoCodigo} actualizado correctamente`, 'success');
            cerrarModalNivel();
            await cargarNiveles();
        }
    } catch (e) {
        showToast('Error al actualizar nivel: ' + e.message, 'error');
    } finally {
        btn.disabled = false;
    }
}
import '/assets/js/ui/crm-dialogs.js';
