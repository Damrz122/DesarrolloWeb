// navbar.js - Hidratación y lógica interactiva de la barra de navegación de ELECTRONIX

import { auth } from '../auth.js';
import { cart } from '../cart.js';
import { initFloatingChat } from '../chat.js';
import { initSideDrawer } from './drawer.js';
import { api } from '../api.js?v=2';
import { aplicarSitio } from '../sitio.js?v=5';

export function getElectronixLogo() {
    return `
        <div class="elx-logo-row">
            <svg width="48" height="32" viewBox="0 0 153.17 95.56" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="ELECTRONIX">
                <path fill="#0076e8" d="M72.25,33.47c-3.7,3.15-7.2,8.66-11.01,11.48-.4.3-.75.53-1.25.63l-35.48.09c-.6.01-1.12.37-1.44.86-1.6,5.39-4.71,11.12-6.13,16.47-.16.61-.41,1.1.15,1.61l38.91.32c.1.66-.25,1.26-.62,1.77-1.99,2.71-6.02,6.79-8.47,9.31-1.22,1.26-2.46,2.86-4.39,2.93H6.95c-5.19-.69-8.14-6.03-6.49-10.89,4.69-12.77,9.23-25.59,13.96-38.34,2.32-6.25,4.53-13.18,7.11-19.25C24.24,4.1,29.79.67,36.65.26c11.81-.7,24.74.22,36.63.23,6.88.01,14.98-.85,21.77-.24,1.89.17,1.91,1.25.93,2.62-1.91,2.68-5.99,6.93-8.36,9.42-.94.99-2.19,2.45-3.55,2.73l-46.36.08c-2.78.29-3.48,1.88-4.44,4.14-1.54,3.63-2.59,7.51-4.15,11.13-.17.46-.1.89.33,1.16l42.68.21c.59.29.52,1.26.13,1.71Z"/>
                <path fill="#0076e8" d="M76.93,66.39c3.38-5.08,7.24-9.86,10.85-14.78.57-.34-.3-1.33-.5-1.33h-10.98c-.2-1.13.28-1.53,1.06-2.18,3.98-3.29,9.86-6.84,14.27-9.79,3.13-2.1,6.33-4.1,9.41-6.28,1.72-.51,1.91.45,1.16,1.79-.82,1.45-2.32,3.09-3.31,4.42-1.34,1.8-3.94,4.54-4.94,6.26-.32.54-.8,1.34-.2,1.83.47.38.83-.05,1.27-.02s.8.2,1.25.22c2.19.08,5.81-.37,7.74,0,.86.16.8.83.41,1.44l-22.57,17.39c-.3.23-.59.73-.74.83-.58.4-3.27.2-4.18.21Z"/>
                <path fill="#dfe2e6" d="M66.11,95.41c-.61-.26-1.55-.67-2.23-1-3.2-1.53-5.02-6.56-4.08-9.88.05-.18,1.57-3.01,1.73-3.21,2.6-3.3,7.68-3.91,11.17-1.79,6.04,3.67,5.06,12.89-1.47,15.36-1.08.41-4.13.94-5.11.52ZM67.04,82.34c-4.77.89-4.65,8.77.79,9.16,6.84.49,6.49-10.51-.79-9.16Z"/>
                <path fill="#dfe2e6" d="M108.47,78.37c5.97-.76,10.8,4.61,9.4,10.45-1.27,5.34-7.31,8.41-12.25,5.68-7.3-4.03-5.58-15.06,2.85-16.13ZM108.47,82.34c-5.35.93-4.42,10.21,1.99,9.11,5.78-.99,4.63-10.25-1.99-9.11Z"/>
                <path fill="#dfe2e6" d="M65.35,66.38l46.97-.09,6.05-3.67,19.4-33.45c.05-.13.3-.75.01-1.43-.39-.94-1.43-1.1-1.49-1.11-16.38,0-32.76-.02-49.14-.02l9.06-9.81h52.82c1.42-.15,2.79.44,3.54,1.55.75,1.1.6,2.29.55,2.6-8.72,15.08-17.44,30.16-26.15,45.24-.6,1.4-2.12,4.39-5.43,6.7-2.19,1.53-4.33,2.17-5.69,2.46h-59.62c.53-1.25,1.47-3.08,3.15-4.88,2.19-2.35,4.57-3.52,5.96-4.08Z"/>
            </svg>
        </div>
    `;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function renderNavbar() {
    // marca y colores editables en todas las paginas publicas (no bloquea el resto)
    aplicarSitio().catch(() => {});
    const authContainer = document.getElementById('nav-auth-container');
    const user = auth.getUser();
    const isAdmin = auth.isAdmin();

    // Si el usuario está autenticado, renderizar menú de usuario.
    // Usa solo clases elx-* (output.css) + estilos inline: las utilidades Tailwind
    // no existen en output.css y el CDN no carga en todas las páginas.
    if (authContainer && user) {
        const initial = user.nombre ? user.nombre.charAt(0).toUpperCase() : 'U';
        authContainer.innerHTML = `
            <div class="elx-user-menu" id="user-menu">
                <button id="user-menu-btn" class="elx-user-btn" aria-haspopup="true" aria-expanded="false">
                    <span class="elx-user-avatar">${escapeHtml(initial)}</span>
                    <span class="elx-user-name">${escapeHtml(user.nombre)}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 9l-7 7-7-7"></path></svg>
                </button>

                <div id="user-dropdown" class="elx-dropdown">
                    <div class="elx-user-meta">
                        Conectado como<br/><strong>${escapeHtml(user.email)}</strong>
                    </div>
                    <a href="/mis-pedidos.html">Mis Pedidos</a>
                    ${isAdmin ? `<a href="${auth.inicioAdmin()}" class="elx-admin-link">Panel Administrativo</a>` : ''}
                    <button id="logout-btn" class="elx-logout-btn">Cerrar Sesión</button>
                </div>
            </div>
        `;

        const menu = document.getElementById('user-menu');
        const menuBtn = document.getElementById('user-menu-btn');
        const dropdown = document.getElementById('user-dropdown');
        if (menuBtn && dropdown) {
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const open = dropdown.classList.toggle('elx-open');
                menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
            });
            document.addEventListener('click', (e) => {
                if (menu && !menu.contains(e.target)) {
                    dropdown.classList.remove('elx-open');
                    menuBtn.setAttribute('aria-expanded', 'false');
                }
            });
        }

        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                auth.logout(true);
            });
        }
    }

    // Cargar categorías en el dropdown
    cargarCategoriasDropdown();

    // Actualizar badge del carrito
    cart.obtenerCarrito();

    // Panel lateral TODO / CATEGORIAS / OFERTAS
    initSideDrawer();

    // Inicializar chat flotante
    initFloatingChat();
}

async function cargarCategoriasDropdown() {
    const dropdown = document.getElementById('nav-categories-dropdown');
    if (!dropdown) return;

    try {
        const res = await api.get('/api/categorias');
        if (res.exito && res.datos && res.datos.length > 0) {
            dropdown.innerHTML = `
                <a href="/productos.html">
                    Todas las categorías
                </a>
            `;
            res.datos.forEach(c => {
                const a = document.createElement('a');
                a.href = `/productos.html?categoriaId=${c.id}`;
                a.textContent = c.nombre;
                dropdown.appendChild(a);
            });
        }
    } catch (e) {
        console.warn('Categorías cargadas con fallback estático');
    }
}
