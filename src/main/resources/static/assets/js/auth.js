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
        storage.setItem('ecommerce_user', JSON.stringify(usuario));
    },

    isAuthenticated() {
        return !!api.getToken();
    },

    isAdmin() {
        const user = this.getUser();
        return user && user.rol === 'ADMIN';
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
                    rol: res.datos.rol
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

    async registro(nombre, email, password) {
        try {
            const res = await api.post('/api/auth/registro', { nombre, email, password });
            if (res.exito && res.datos) {
                api.setToken(res.datos.token, true);
                this.setUser({
                    id: res.datos.id,
                    nombre: res.datos.nombre,
                    email: res.datos.email,
                    rol: res.datos.rol
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
        if (!this.isAuthenticated() || !this.isAdmin()) {
            showToast('Acceso restringido: Se requieren permisos de Administrador', 'error');
            setTimeout(() => {
                window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
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
