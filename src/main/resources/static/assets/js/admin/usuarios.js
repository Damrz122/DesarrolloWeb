import { api } from '/assets/js/api.js';
import { auth } from '/assets/js/auth.js';
import { renderAdminShell } from '/assets/js/ui/adminShell.js?v=2';
import { showToast } from '/assets/js/ui/toast.js';
import { renderPager, swapSuave } from '/assets/js/ui/pager.js?v=2';

const tbody = document.getElementById('usuarios-table-body');
const pager = document.getElementById('usuarios-pager');
const filtroRol = document.getElementById('filtro-rol');
const filtroBuscar = document.getElementById('filtro-buscar');

const TAMANO_PAGINA = 10;
let paginaActual = 0;
let todosUsuarios = [];

renderAdminShell('usuarios');

if (!auth.protegerRutaAdmin()) {
    // Guard
} else {
    initUsuariosAdmin();
}

function esc(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

const fmtFecha = iso => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
};

function initUsuariosAdmin() {
    cargarUsuarios();
    filtroRol.addEventListener('change', () => { paginaActual = 0; pintar(); });
    let t = null;
    filtroBuscar.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => { paginaActual = 0; pintar(); }, 250);
    });
}

async function cargarUsuarios() {
    try {
        const res = await api.get('/api/usuarios');
        todosUsuarios = (res.exito && res.datos) ? res.datos : [];
        const totalPaginas = Math.ceil(filtrados().length / TAMANO_PAGINA);
        if (paginaActual > totalPaginas - 1) paginaActual = Math.max(0, totalPaginas - 1);
        pintar();
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" class="adm-err">Error: ${esc(err.message)}</td></tr>`;
    }
}

function filtrados() {
    const rol = filtroRol.value;
    const q = filtroBuscar.value.trim().toLowerCase();
    return todosUsuarios.filter(u => {
        if (rol && u.rol !== rol) return false;
        if (q) {
            const texto = `${u.nombre || ''} ${u.nombres || ''} ${u.apellidoPaterno || ''} ${u.email || ''}`.toLowerCase();
            if (!texto.includes(q)) return false;
        }
        return true;
    });
}

async function pintar() {
    const lista = filtrados();
    const totalPaginas = Math.ceil(lista.length / TAMANO_PAGINA);
    if (paginaActual > totalPaginas - 1) paginaActual = Math.max(0, totalPaginas - 1);
    const inicio = paginaActual * TAMANO_PAGINA;
    const pagina = lista.slice(inicio, inicio + TAMANO_PAGINA);

    await swapSuave(tbody, () => {
        tbody.innerHTML = '';
        if (!pagina.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="adm-empty">No se encontraron usuarios.</td></tr>';
            return;
        }
        pagina.forEach(u => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div class="adm-prod">
                        <span class="adm-avatar">${esc((u.nombre || u.email || '?').charAt(0).toUpperCase())}</span>
                        <div>
                            <div class="adm-strong">${esc(u.nombre || 'Sin nombre')}</div>
                            <div class="adm-sub">${esc(u.email || '')}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <div>${esc(u.numeroDocumento || '—')}</div>
                    <div class="adm-sub">${esc(u.tipoDocumento || '')}</div>
                </td>
                <td>
                    <select class="adm-select adm-select--estado select-rol">
                        <option value="CLIENTE"${u.rol === 'CLIENTE' ? ' selected' : ''}>Cliente</option>
                        <option value="ADMIN"${u.rol === 'ADMIN' ? ' selected' : ''}>Admin</option>
                    </select>
                </td>
                <td>
                    <span class="adm-badge ${u.activo ? 'b-ok' : 'b-off'}">${u.activo ? 'Activo' : 'Inactivo'}</span>
                </td>
                <td class="adm-sub">${fmtFecha(u.fechaRegistro)}</td>
                <td class="num adm-celda-num">
                    ${u.activo
                        ? '<button class="adm-btn adm-btn-del adm-btn-sm btn-estado">Desactivar</button>'
                        : '<button class="adm-btn adm-btn-edit adm-btn-sm btn-estado">Activar</button>'}
                </td>`;
            tr.querySelector('.select-rol').addEventListener('change', async e => {
                await cambiarRol(u.id, e.target.value);
            });
            tr.querySelector('.btn-estado').addEventListener('click', async () => {
                const accion = u.activo ? 'desactivar' : 'activar';
                if (u.activo && !confirm(`¿Desactivar a "${u.email}"? No podrá ingresar.`)) return;
                await cambiarEstado(u.id, !u.activo, accion);
            });
            tbody.appendChild(tr);
        });
    });
    renderPager(pager, {
        pagina: paginaActual,
        totalPaginas,
        onPage: p => { paginaActual = p; pintar(); }
    });
}

async function cambiarRol(id, rol) {
    try {
        await api.patch(`/api/usuarios/${id}/rol`, { rol });
        showToast('Rol actualizado a ' + rol, 'success');
        await cargarUsuarios();
    } catch (err) {
        showToast(err.message, 'error');
        await cargarUsuarios();
    }
}

async function cambiarEstado(id, activo, accion) {
    try {
        await api.patch(`/api/usuarios/${id}/estado`, { activo });
        showToast(`Usuario ${accion === 'activar' ? 'activado' : 'desactivado'} correctamente`, 'success');
        await cargarUsuarios();
    } catch (err) {
        showToast(err.message, 'error');
    }
}
