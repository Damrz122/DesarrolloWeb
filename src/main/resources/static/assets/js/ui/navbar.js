// navbar.js - Hidratación y lógica interactiva de la barra de navegación de ELECTRONIX

import { auth } from '../auth.js';
import { cart } from '../cart.js';
import { initFloatingChat } from '../chat.js';
import { api } from '../api.js';

export function getElectronixLogo() {
    return `
        <div class="flex items-center space-x-2.5 select-none">
            <svg class="w-11 h-10 text-slate-200" viewBox="0 0 100 90" fill="currentColor">
                <path d="M15 12h65c4 0 7 3 7 7s-3 7-7 7H38l-4 12h32c3 0 6 3 5 7l-4 10c-1 3-3 5-6 5H24l-6 18c-1 3-4 5-8 5s-6-3-5-7L15 12z" />
                <polygon points="68,28 48,50 62,50 42,75 50,56 36,56" fill="#1ca299" />
                <circle cx="42" cy="82" r="6" fill="#1ca299" />
                <circle cx="68" cy="82" r="6" fill="#1ca299" />
            </svg>
        </div>
    `;
}

export function renderNavbar() {
    const authContainer = document.getElementById('nav-auth-container');
    const user = auth.getUser();
    const isAdmin = auth.isAdmin();

    // Si el usuario está autenticado, renderizar menú de usuario
    if (authContainer && user) {
        authContainer.innerHTML = `
            <div class="relative group">
                <button id="user-menu-btn" class="flex items-center space-x-2 py-1 px-2.5 rounded-lg bg-[#2d2d2d] hover:bg-[#383838] border border-neutral-700 text-xs font-bold text-slate-100 transition-all">
                    <div class="w-6 h-6 rounded-md bg-[#14635c] flex items-center justify-center text-white font-black text-xs">
                        ${user.nombre ? user.nombre.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <span class="max-w-[90px] truncate hidden md:inline">${user.nombre}</span>
                    <svg class="w-3 h-3 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </button>
                
                <div id="user-dropdown" class="hidden group-hover:block absolute right-0 mt-1 w-48 bg-[#1e1e1e] border border-neutral-700 rounded-xl shadow-2xl py-1.5 z-50 text-xs">
                    <div class="px-4 py-2 border-b border-neutral-800 text-[11px] text-neutral-400">
                        Conectado como <br/><strong class="text-white">${user.email}</strong>
                    </div>
                    <a href="/mis-pedidos.html" class="block px-4 py-2 text-neutral-200 hover:text-white hover:bg-neutral-800 font-semibold">Mis Pedidos</a>
                    ${isAdmin ? `<a href="/admin/dashboard.html" class="block px-4 py-2 text-[#1ca299] font-black hover:bg-neutral-800">Panel Administrador</a>` : ''}
                    <button id="logout-btn" class="w-full text-left px-4 py-2 text-rose-400 hover:bg-rose-950/40 font-bold">Cerrar Sesión</button>
                </div>
            </div>
        `;

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
                <a href="/index.html" class="block px-4 py-2 hover:bg-neutral-800 text-neutral-300 hover:text-white font-bold border-b border-neutral-800">
                    Todas las categorías
                </a>
            `;
            res.datos.forEach(c => {
                const a = document.createElement('a');
                a.href = `/index.html?categoriaId=${c.id}`;
                a.className = 'block px-4 py-2 hover:bg-[#14635c]/30 text-neutral-300 hover:text-[#1ca299] font-medium transition-colors';
                a.textContent = c.nombre;
                dropdown.appendChild(a);
            });
        }
    } catch (e) {
        console.warn('Categorías cargadas con fallback estático');
    }
}
