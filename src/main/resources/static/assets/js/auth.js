// auth.js - Gestión de autenticación, roles y guardias de ruta

import { api } from './api.js';
import { showToast } from './ui/toast.js';

export const auth = {
    getUser() {
        const userStr = localStorage.getItem('ecommerce_user') || sessionStorage.getItem('ecommerce_user');
        if (!userStr) return null;
        try {
            return JSON.parse(userStr);
        } catch {
            return null;
        }
    },

    setUser(usuario, persistir = true) {
        const storage = persistir ? localStorage : sessionStorage;
        (persistir ? sessionStorage : localStorage).removeItem('ecommerce_user');
        storage.setItem('ecommerce_user', JSON.stringify(usuario));
    },

    isAuthenticated() {
        const token = api.getToken();
        if (!token) return false;
        // Valida expiración del JWT (exp en segundos). Si expiró, limpia sesión.
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return !!token;
            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            if (payload.exp && Date.now() >= payload.exp * 1000) {
                this.logout(false);
                return false;
            }
            return true;
        } catch {
            return !!token;
        }
    },

    isAdmin() {
        return this.tienePermiso('ADMIN_ACCESO');
    },
    tienePermiso(codigo) { return (this.getUser()?.permisos || []).includes(codigo); },
    inicioAdmin() {
        const rutas = [['REPORTES_VER','dashboard'],['PEDIDOS_GESTIONAR','dashboard'],['PRODUCTOS_VER','productos'],['INVENTARIO_GESTIONAR','productos'],['PRODUCTOS_GESTIONAR','productos'],['CONFIGURACION_GESTIONAR','configuracion'],['USUARIOS_GESTIONAR','usuarios'],['CHAT_ATENDER','chat'],['APARIENCIA_GESTIONAR','apariencia']];
        return '/admin/' + (rutas.find(([p]) => this.tienePermiso(p))?.[1] || 'dashboard') + '.html';
    },

    async login(email, password, recordar = true) {
        try {
            const res = await api.post('/api/auth/login', { email, password });
            if (res.exito && res.datos) {
                api.setToken(res.datos.token, recordar);
                this.setUser({
                    id: res.datos.id,
                    nombre: res.datos.nombre,
                    email: res.datos.email,
                    rol: res.datos.rol,
                    permisos: res.datos.permisos || []
                }, recordar);
                showToast('¡Bienvenido de vuelta, ' + res.datos.nombre + '!', 'success');
                return res.datos;
            }
            throw new Error(res.mensaje || 'Error al iniciar sesión');
        } catch (err) {
            showToast(err.message, 'error');
            throw err;
        }
    },

    async registro(nombreOrDatos, email, password) {
        // Nuevo: objeto {nombres, apellidoPaterno, apellidoMaterno, tipoDocumento,
        // numeroDocumento, email, password}. Legado: (nombre, email, password).
        const payload = (nombreOrDatos && typeof nombreOrDatos === 'object')
            ? nombreOrDatos
            : { nombre: nombreOrDatos, email, password };
        try {
            const res = await api.post('/api/auth/registro', payload);
            if (res.exito && res.datos) {
                api.setToken(res.datos.token, true);
                this.setUser({
                    id: res.datos.id,
                    nombre: res.datos.nombre,
                    email: res.datos.email,
                    rol: res.datos.rol,
                    permisos: res.datos.permisos || []
                }, true);
                showToast('¡Cuenta creada exitosamente!', 'success');
                return res.datos;
            }
            throw new Error(res.mensaje || 'Error al crear la cuenta');
        } catch (err) {
            showToast(err.message, 'error');
            throw err;
        }
    },

    logout(redirigir = true) {
        api.removeToken();
        localStorage.removeItem('ecommerce_user');
        sessionStorage.removeItem('ecommerce_user');
        showToast('Sesión cerrada correctamente', 'info');
        if (redirigir) {
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 500);
        }
    },

    protegerRutaAdmin() {
        const pagina = location.pathname.split('/').pop();
        const permisos = {
            'productos.html': ['PRODUCTOS_VER','PRODUCTOS_GESTIONAR','INVENTARIO_GESTIONAR'],
            'categorias.html': ['CATEGORIAS_GESTIONAR'], 'usuarios.html': ['USUARIOS_GESTIONAR'],
            'pedidos.html': ['PEDIDOS_GESTIONAR'], 'reportes.html': ['REPORTES_VER'],
            'dashboard.html': ['REPORTES_VER','PEDIDOS_GESTIONAR'], 'chat.html': ['CHAT_ATENDER'],
            'configuracion.html': ['CONFIGURACION_GESTIONAR'], 'apariencia.html': ['APARIENCIA_GESTIONAR'], 'estudio.html': ['APARIENCIA_GESTIONAR']
        };
        if (!this.isAuthenticated() || !this.isAdmin() || !(permisos[pagina] || []).some(p => this.tienePermiso(p))) {
            showToast('Acceso restringido: Se requieren permisos de Administrador', 'error');
            setTimeout(() => {
                window.location.href = this.isAuthenticated() ? '/index.html' : '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
            }, 800);
            return false;
        }
        return true;
    },

    protegerRutaAutenticada() {
        if (!this.isAuthenticated()) {
            showToast('Debes iniciar sesión para acceder a esta sección', 'warning');
            setTimeout(() => {
                window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
            }, 800);
            return false;
        }
        return true;
    }
};

// Los permisos y el estado se refrescan en cada navegación; el backend hace lo
// mismo en cada petición. Un token antiguo no conserva privilegios retirados.
if (api.getToken() && auth.isAuthenticated()) {
    try {
        const r = await api.get('/api/usuarios/me');
        if (r.exito && r.datos) auth.setUser(r.datos, !!localStorage.getItem('ecommerce_user'));
    } catch (e) { if (e.status === 401 || e.status === 403) auth.logout(false); }
}
