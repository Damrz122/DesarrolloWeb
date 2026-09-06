// navbar.js - Hidratación y lógica interactiva de la barra de navegación de ELECTRONIX

import { auth } from '../auth.js';
import { cart } from '../cart.js';
import { initFloatingChat } from '../chat.js';
import { api } from '../api.js';

export function getElectronixLogo() {
    return `
        <div style="display:flex;align-items:center;gap:10px;user-select:none;">
            <svg width="44" height="40" viewBox="0 0 100 90" fill="currentColor" style="color:#e5e7eb;">
                <path d="M15 12h65c4 0 7 3 7 7s-3 7-7 7H38l-4 12h32c3 0 6 3 5 7l-4 10c-1 3-3 5-6 5H24l-6 18c-1 3-4 5-8 5s-6-3-5-7L15 12z" />
                <polygon points="68,28 48,50 62,50 42,75 50,56 36,56" fill="#1ca299" />
                <circle cx="42" cy="82" r="6" fill="#1ca299" />
                <circle cx="68" cy="82" r="6" fill="#1ca299" />
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
                    ${isAdmin ? `<a href="/admin/dashboard.html" class="elx-admin-link">Panel Administrador</a>` : ''}
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
                <a href="/index.html">
                    Todas las categorías
                </a>
            `;
            res.datos.forEach(c => {
                const a = document.createElement('a');
                a.href = `/index.html?categoriaId=${c.id}`;
                a.textContent = c.nombre;
                dropdown.appendChild(a);
            });
        }
    } catch (e) {
        console.warn('Categorías cargadas con fallback estático');
    }
}
