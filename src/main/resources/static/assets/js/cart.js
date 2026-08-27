// cart.js - Lógica de cliente para gestión de carrito de compras

import { api } from './api.js';
import { auth } from './auth.js';
import { showToast } from './ui/toast.js';

export const cart = {
    async obtenerCarrito() {
        if (!auth.isAuthenticated()) {
            return { items: [], total: 0, cantidadTotal: 0 };
        }
        try {
            const res = await api.get('/api/carrito');
            if (res.exito && res.datos) {
                this.actualizarBadge(res.datos.cantidadTotal);
                return res.datos;
            }
            return { items: [], total: 0, cantidadTotal: 0 };
        } catch (err) {
            console.error('Error al cargar carrito:', err);
            return { items: [], total: 0, cantidadTotal: 0 };
        }
    },

    async agregarItem(productoId, cantidad = 1) {
        if (!auth.isAuthenticated()) {
            showToast('Debes iniciar sesión para agregar productos al carrito', 'warning');
            setTimeout(() => {
                window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
            }, 1000);
            return null;
        }

        try {
            const res = await api.post('/api/carrito/items', { productoId, cantidad });
            if (res.exito && res.datos) {
                this.actualizarBadge(res.datos.cantidadTotal);
                showToast('¡Producto agregado al carrito!', 'success');
                return res.datos;
            }
            throw new Error(res.mensaje || 'No se pudo agregar el producto');
        } catch (err) {
            showToast(err.message, 'error');
            throw err;
        }
    },

    async actualizarCantidad(itemId, cantidad) {
        try {
            const res = await api.put(`/api/carrito/items/${itemId}`, { cantidad });
            if (res.exito && res.datos) {
                this.actualizarBadge(res.datos.cantidadTotal);
                showToast('Cantidad actualizada', 'info');
                return res.datos;
            }
            throw new Error(res.mensaje || 'Error al actualizar cantidad');
        } catch (err) {
            showToast(err.message, 'error');
            throw err;
        }
    },

    async removerItem(itemId) {
        try {
            const res = await api.delete(`/api/carrito/items/${itemId}`);
            if (res.exito && res.datos) {
                this.actualizarBadge(res.datos.cantidadTotal);
                showToast('Producto eliminado del carrito', 'info');
                return res.datos;
            }
            throw new Error(res.mensaje || 'Error al eliminar ítem');
        } catch (err) {
            showToast(err.message, 'error');
            throw err;
        }
    },

    actualizarBadge(cantidad) {
        const badge = document.getElementById('cart-badge');
        if (badge) {
            badge.textContent = cantidad || '0';
            if (cantidad > 0) {
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    }
};
