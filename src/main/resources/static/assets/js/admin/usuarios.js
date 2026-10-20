import { api } from '/assets/js/api.js';
import { auth } from '/assets/js/auth.js';
import { renderAdminShell } from '/assets/js/ui/adminShell.js?v=2';
import { showToast } from '/assets/js/ui/toast.js';
import { renderPager, swapSuave } from '/assets/js/ui/pager.js?v=2';

const tbody = document.getElementById('usuarios-table-body');
const pager = document.getElementById('usuarios-pager');
const filtroRol = document.getElementById('filtro-rol');
const filtroBuscar = document.getElementById('filtro-buscar');
const btnNuevo = document.getElementById('btn-nuevo-usuario');
const modal = document.getElementById('modal-usuario');
const modalClose = document.getElementById('modal-usr-close');
const modalCancel = document.getElementById('modal-usr-cancel');
const formNuevo = document.getElementById('form-nuevo-usuario');

const TAMANO_PAGINA = 10;
let paginaActual = 0;
let todosUsuarios = [];
let rolesDisponibles = [];

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

async function initUsuariosAdmin() {
    try {
        rolesDisponibles = (await api.get('/api/roles')).datos || [];
        filtroRol.innerHTML = '<option value="">Todos los roles</option>' + opcionesRoles('');
        document.getElementById('nu-rol').innerHTML = opcionesRoles('CLIENTE');
    } catch(e) { showToast(e.message,'error'); return; }
    cargarUsuarios();
    filtroRol.addEventListener('change', () => { paginaActual = 0; pintar(); });
    let t = null;
    filtroBuscar.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => { paginaActual = 0; pintar(); }, 250);
    });
    if (btnNuevo) btnNuevo.addEventListener('click', () => abrirModalCrear());
    if (modalClose) modalClose.addEventListener('click', () => cerrarModal());
    if (modalCancel) modalCancel.addEventListener('click', () => cerrarModal());
    if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) cerrarModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) cerrarModal(); });
    if (formNuevo) formNuevo.addEventListener('submit', guardarUsuario);
}
function opcionesRoles(actual) {
    return rolesDisponibles.map(r => `<option value="${esc(r.codigo)}"${r.codigo===actual?' selected':''}${!r.activo?' disabled':''}>${esc(r.nombre)}${!r.activo?' (inactivo)':''}</option>`).join('');
}

let editandoId = null;

function setVal(id, v) {
    const el = document.getElementById(id);
    if (el) el.value = v ?? '';
}

function abrirModalCrear() {
    editandoId = null;
    if (!modal) return;
    const title = document.getElementById('modal-usr-title');
    if (title) title.textContent = 'Nuevo usuario';
    const rolWrap = document.getElementById('nu-rol-wrap');
    if (rolWrap) rolWrap.style.display = '';
    const passLabel = document.getElementById('nu-pass-label');
    if (passLabel) passLabel.textContent = 'Contraseña * (mín. 6)';
    const pass = document.getElementById('nu-pass');
    if (pass) { pass.required = true; pass.placeholder = '••••••••'; }
    const btn = document.getElementById('btn-crear-usuario');
    if (btn) btn.textContent = 'Crear usuario';
    setVal('nu-id', '');
    if (formNuevo) formNuevo.reset();
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function abrirModalEditar(u) {
    editandoId = u.id;
    if (!modal) return;
    const title = document.getElementById('modal-usr-title');
    if (title) title.textContent = `Editar usuario #${u.id}`;
    const rolWrap = document.getElementById('nu-rol-wrap');
    if (rolWrap) rolWrap.style.display = 'none';
    const passLabel = document.getElementById('nu-pass-label');
    if (passLabel) passLabel.textContent = 'Nueva contraseña (opcional, mín. 6)';
    setVal('nu-id', u.id);
    setVal('nu-nombres', u.nombres || '');
    setVal('nu-paterno', u.apellidoPaterno || '');
    setVal('nu-materno', u.apellidoMaterno || '');
    setVal('nu-tipodoc', u.tipoDocumento || 'DNI');
    setVal('nu-doc', u.numeroDocumento || '');
    setVal('nu-email', u.email || '');
    setVal('nu-rol', u.rol || 'CLIENTE');
    const pass = document.getElementById('nu-pass');
    if (pass) { pass.required = false; pass.value = ''; pass.placeholder = 'Dejar vacío para no cambiar'; }
    const btn = document.getElementById('btn-crear-usuario');
    if (btn) btn.textContent = 'Guardar cambios';
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function abrirModal() {
    abrirModalCrear();
}

function cerrarModal() {
    if (!modal) return;
    modal.classList.add('hidden');
    document.body.style.overflow = '';
    if (formNuevo) formNuevo.reset();
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
                        ${opcionesRoles(u.rol)}
                    </select>
                </td>
                <td>
                    <span class="adm-badge ${u.activo ? 'b-ok' : 'b-off'}">${u.activo ? 'Activo' : 'Inactivo'}</span>
                </td>
                <td class="adm-sub">${fmtFecha(u.fechaRegistro)}</td>
                <td class="num adm-celda-num">
                    <div style="display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap">
                    <button class="adm-btn adm-btn-edit adm-btn-sm btn-editar" title="Editar usuario">Editar</button>
                    ${u.activo
                        ? '<button class="adm-btn adm-btn-del adm-btn-sm btn-estado">Desactivar</button>'
                        : '<button class="adm-btn adm-btn-edit adm-btn-sm btn-estado">Activar</button>'}
                    <button class="adm-btn adm-btn-sm btn-eliminar" title="Eliminar usuario">Eliminar</button>
                    </div>
                </td>`;
            tr.querySelector('.select-rol').addEventListener('change', async e => {
                await cambiarRol(u.id, e.target.value);
            });
            tr.querySelector('.btn-editar').addEventListener('click', () => abrirModalEditar(u));
            tr.querySelector('.btn-estado').addEventListener('click', async () => {
                const accion = u.activo ? 'desactivar' : 'activar';
                if (u.activo && !confirm(`¿Desactivar a "${u.email}"? No podrá ingresar.`)) return;
                await cambiarEstado(u.id, !u.activo, accion);
            });
            tr.querySelector('.btn-eliminar').addEventListener('click', async () => {
                if (!confirm(`¿Eliminar a "${u.email}"?\nSolo es posible si no tiene pedidos. Si tiene historial, desactívalo.`)) return;
                await eliminarUsuario(u.id);
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

async function eliminarUsuario(id) {
    try {
        await api.delete(`/api/usuarios/${id}`);
        showToast('Usuario eliminado correctamente', 'success');
        await cargarUsuarios();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function val(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
}

async function guardarUsuario(e) {
    e.preventDefault();
    if (editandoId) {
        await actualizarUsuario();
        return;
    }
    await crearUsuario();
}

function validarDoc(tipoDocumento, numeroDocumento) {
    return tipoDocumento === 'DNI' ? /^[0-9]{8}$/.test(numeroDocumento) : /^[A-Za-z0-9]{9}$/.test(numeroDocumento);
}

async function actualizarUsuario() {
    const nombres = val('nu-nombres');
    const apellidoPaterno = val('nu-paterno');
    const apellidoMaterno = val('nu-materno');
    const tipoDocumento = val('nu-tipodoc') || 'DNI';
    const numeroDocumento = val('nu-doc');
    const email = val('nu-email');
    const password = document.getElementById('nu-pass') ? document.getElementById('nu-pass').value : '';

    if (nombres.length < 2 || apellidoPaterno.length < 2) {
        showToast('Nombres y apellido paterno (mín. 2 letras)', 'warning');
        return;
    }
    if (!validarDoc(tipoDocumento, numeroDocumento)) {
        showToast(tipoDocumento === 'DNI' ? 'DNI: 8 dígitos' : 'CE: 9 alfanuméricos', 'warning');
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast('Email no válido', 'warning');
        return;
    }
    if (password && password.length < 6) {
        showToast('Nueva contraseña mínima de 6 caracteres', 'warning');
        return;
    }

    const btn = document.getElementById('btn-crear-usuario');
    if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }
    try {
        const payload = {
            nombres, apellidoPaterno,
            apellidoMaterno: apellidoMaterno || null,
            tipoDocumento, numeroDocumento, email
        };
        if (password) payload.password = password;
        await api.put(`/api/usuarios/${editandoId}`, payload);
        showToast('Usuario actualizado correctamente', 'success');
        cerrarModal();
        await cargarUsuarios();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Guardar cambios'; }
    }
}

async function crearUsuario() {
    const nombres = val('nu-nombres');
    const apellidoPaterno = val('nu-paterno');
    const apellidoMaterno = val('nu-materno');
    const rol = val('nu-rol') || 'CLIENTE';
    const tipoDocumento = val('nu-tipodoc') || 'DNI';
    const numeroDocumento = val('nu-doc');
    const email = val('nu-email');
    const password = document.getElementById('nu-pass') ? document.getElementById('nu-pass').value : '';

    if (nombres.length < 2 || apellidoPaterno.length < 2) {
        showToast('Nombres y apellido paterno (mín. 2 letras)', 'warning');
        return;
    }
    const docOk = tipoDocumento === 'DNI' ? /^[0-9]{8}$/.test(numeroDocumento) : /^[A-Za-z0-9]{9}$/.test(numeroDocumento);
    if (!docOk) {
        showToast(tipoDocumento === 'DNI' ? 'DNI: 8 dígitos' : 'CE: 9 alfanuméricos', 'warning');
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast('Email no válido', 'warning');
        return;
    }
    if (password.length < 6) {
        showToast('Contraseña mínima de 6 caracteres', 'warning');
        return;
    }

    const btn = document.getElementById('btn-crear-usuario');
    if (btn) { btn.disabled = true; btn.textContent = 'Creando…'; }
    try {
        await api.post('/api/usuarios', {
            nombres, apellidoPaterno,
            apellidoMaterno: apellidoMaterno || null,
            tipoDocumento, numeroDocumento, email, password, rol
        });
        showToast('Usuario creado correctamente', 'success');
        cerrarModal();
        await cargarUsuarios();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Crear usuario'; }
    }
}
