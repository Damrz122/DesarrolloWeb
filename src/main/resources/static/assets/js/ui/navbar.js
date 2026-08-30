// navbar.js - Barra de navegación inspirada en Electronix / Mercado Libre

import { auth } from '../auth.js';
import { cart } from '../cart.js';
import { initFloatingChat } from '../chat.js';
import { api } from '../api.js';

export function getElectronixLogo(size = 'normal') {
    const isSmall = size === 'small';
    return `
        <div class="flex items-center space-x-2.5 group select-none">
            <!-- Icono E con Rayo y Ruedas -->
            <div class="relative ${isSmall ? 'w-8 h-8' : 'w-10 h-10'} flex items-center justify-center">
                <svg class="w-full h-full text-slate-200" viewBox="0 0 100 90" fill="currentColor">
                    <!-- E estilizada con rayo -->
                    <path d="M15 12h65c4 0 7 3 7 7s-3 7-7 7H38l-4 12h32c3 0 6 3 5 7l-4 10c-1 3-3 5-6 5H24l-6 18c-1 3-4 5-8 5s-6-3-5-7L15 12z" />
                    <!-- Rayo eléctrico -->
                    <polygon points="68,28 48,50 62,50 42,75 50,56 36,56" fill="#1ca299" />
                    <!-- Ruedas de carrito -->
                    <circle cx="42" cy="82" r="6" fill="#1ca299" />
                    <circle cx="68" cy="82" r="6" fill="#1ca299" />
                </svg>
            </div>
            <span class="${isSmall ? 'text-lg' : 'text-xl sm:text-2xl'} font-black tracking-wider text-white uppercase">
                ELECTRONI<span class="text-[#1ca299]">X</span>
            </span>
        </div>
    `;
}

export async function renderNavbar() {
    const navContainer = document.getElementById('main-navbar');
    if (!navContainer) return;

    const user = auth.getUser();
    const isAdmin = auth.isAdmin();

    navContainer.innerHTML = `
        <header class="w-full sticky top-0 z-50 shadow-md">
            
            <!-- 1. Top Bar Verde/Teal Oscuro (#0b2e2b) -->
            <div class="bg-[#0b2e2b] text-xs text-slate-200 py-1.5 px-4 sm:px-8 border-b border-[#0f3d39]">
                <div class="max-w-7xl mx-auto flex items-center justify-between">
                    <span class="font-black text-[#1ca299] tracking-wider text-[11px] uppercase hidden sm:inline">
                        ELECTRONIX
                    </span>

                    <div class="text-center flex-1 sm:flex-initial font-bold text-[11px] sm:text-xs text-slate-100 tracking-wide">
                        ENVIO GRATIS POR COMPRA MAYOR A S/ 199
                    </div>

                    <div class="flex items-center space-x-4 text-xs font-semibold">
                        <!-- Selector País Perú -->
                        <div class="flex items-center space-x-1.5 bg-[#07201e] px-2 py-0.5 rounded border border-[#14534e]">
                            <span class="inline-flex w-4 h-3 bg-red-600 rounded-sm overflow-hidden flex-row border border-white/20">
                                <span class="w-1/3 bg-red-600"></span>
                                <span class="w-1/3 bg-white"></span>
                                <span class="w-1/3 bg-red-600"></span>
                            </span>
                            <span class="text-[11px] text-slate-300">PER</span>
                        </div>

                        <!-- Carrito Rápido Topbar -->
                        <a href="/carrito.html" class="relative hover:text-white transition-colors flex items-center" title="Ver carrito">
                            <svg class="w-4 h-4 text-slate-300 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
                            </svg>
                            <span id="cart-badge-top" class="hidden ml-1 px-1.5 py-0.2 bg-[#1ca299] text-slate-950 font-extrabold text-[10px] rounded-full">
                                0
                            </span>
                        </a>
                    </div>
                </div>
            </div>

            <!-- 2. Barra Principal (#1e1e1e) -->
            <div class="bg-[#1e1e1e] border-b border-neutral-800 py-3 sm:py-3.5 px-4 sm:px-8">
                <div class="max-w-7xl mx-auto flex items-center justify-between gap-4">
                    
                    <!-- Logo Principal -->
                    <a href="/index.html" class="flex-shrink-0">
                        ${getElectronixLogo()}
                    </a>

                    <!-- Buscador Central Redondeado -->
                    <div class="flex-1 max-w-2xl mx-2 sm:mx-6">
                        <form id="nav-search-form" class="relative flex items-center" action="/index.html" method="GET">
                            <input 
                                id="nav-search-input"
                                type="text" 
                                name="q"
                                placeholder="Buscar en Electronix" 
                                class="w-full bg-[#383838] hover:bg-[#404040] focus:bg-[#444444] text-white placeholder-neutral-400 text-sm rounded-xl pl-10 pr-12 py-2.5 border border-neutral-700/80 focus:border-[#1ca299] focus:outline-none transition-all shadow-inner"
                            />
                            <div class="absolute left-3.5 top-3 text-neutral-400 pointer-events-none">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                                </svg>
                            </div>
                            <button type="submit" class="absolute right-2 top-1.5 px-2.5 py-1 bg-[#14635c] hover:bg-[#1ca299] text-white text-xs font-semibold rounded-lg transition-colors">
                                Ir
                            </button>
                        </form>
                    </div>

                    <!-- Usuario / Cuenta -->
                    <div class="flex items-center space-x-3 flex-shrink-0">
                        ${user ? `
                            <div class="relative group">
                                <button id="user-menu-btn" class="flex items-center space-x-2 p-1.5 pr-2.5 rounded-xl bg-[#2b2b2b] hover:bg-[#363636] border border-neutral-700 text-sm font-medium text-slate-100 transition-all">
                                    <div class="w-7 h-7 rounded-lg bg-[#14635c] flex items-center justify-center text-white font-bold text-xs">
                                        ${user.nombre ? user.nombre.charAt(0).toUpperCase() : 'U'}
                                    </div>
                                    <span class="max-w-[100px] truncate hidden md:inline text-xs">${user.nombre}</span>
                                    <svg class="w-3.5 h-3.5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                                </button>
                                
                                <div id="user-dropdown" class="hidden group-hover:block absolute right-0 mt-1 w-48 bg-[#1e1e1e] border border-neutral-700 rounded-xl shadow-2xl py-1.5 z-50 text-sm">
                                    <div class="px-4 py-2 border-b border-neutral-800 text-xs text-neutral-400">
                                        Conectado como <br/><strong class="text-white">${user.email}</strong>
                                    </div>
                                    <a href="/mis-pedidos.html" class="block px-4 py-2 text-neutral-200 hover:text-white hover:bg-neutral-800">Mis Pedidos</a>
                                    ${isAdmin ? `<a href="/admin/dashboard.html" class="block px-4 py-2 text-[#1ca299] font-bold hover:bg-neutral-800">Panel Administrador</a>` : ''}
                                    <button id="logout-btn" class="w-full text-left px-4 py-2 text-rose-400 hover:bg-rose-950/40 font-semibold">Cerrar Sesión</button>
                                </div>
                            </div>
                        ` : `
                            <a href="/login.html" class="flex items-center space-x-1.5 py-1.5 px-3 rounded-xl bg-[#2b2b2b] hover:bg-[#383838] border border-neutral-700 text-xs font-bold text-slate-100 transition-all">
                                <svg class="w-4 h-4 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                </svg>
                                <span class="hidden sm:inline uppercase">Iniciar Sesión</span>
                            </a>
                        `}

                        <!-- Carrito de Compras Grande -->
                        <a href="/carrito.html" class="relative p-2 rounded-xl bg-[#2b2b2b] hover:bg-[#383838] border border-neutral-700 text-slate-200 hover:text-white transition-all flex items-center justify-center">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
                            </svg>
                            <span id="cart-badge" class="hidden absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#1ca299] text-slate-950 font-black text-[11px] rounded-full flex items-center justify-center shadow-lg">
                                0
                            </span>
                        </a>
                    </div>

                </div>
            </div>

            <!-- 3. Sub-Navbar de Categorías (#2d2d2d) -->
            <div class="bg-[#2d2d2d] text-neutral-200 border-b border-neutral-700/60 px-4 sm:px-8">
                <div class="max-w-7xl mx-auto flex items-center space-x-6 text-xs font-bold uppercase tracking-wider py-2 overflow-x-auto">
                    
                    <a href="/index.html" class="flex items-center space-x-1.5 hover:text-white transition-colors flex-shrink-0">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                        <span>Todo</span>
                    </a>

                    <!-- Dropdown Categorías -->
                    <div class="relative group flex-shrink-0">
                        <button class="flex items-center space-x-1 hover:text-white transition-colors py-1">
                            <span>Categorías</span>
                            <svg class="w-3.5 h-3.5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                        </button>

                        <div id="nav-categories-dropdown" class="hidden group-hover:block absolute left-0 mt-1 w-56 bg-[#222222] border border-neutral-700 rounded-xl shadow-2xl py-2 z-50 text-xs normal-case">
                            <div class="px-3 py-1.5 text-[11px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-800">
                                Departamentos
                            </div>
                            <div id="nav-categories-list" class="divide-y divide-neutral-800/40">
                                <a href="/index.html" class="block px-4 py-2 hover:bg-neutral-800 text-neutral-300 hover:text-white">Todas las categorías</a>
                            </div>
                        </div>
                    </div>

                    <a href="/index.html?ofertas=true" class="hover:text-[#1ca299] transition-colors flex-shrink-0">
                        Ofertas
                    </a>
                    
                    <a href="/index.html?populares=true" class="hover:text-white transition-colors flex-shrink-0">
                        Más Vendidos
                    </a>

                    ${user ? `
                        <a href="/mis-pedidos.html" class="hover:text-white transition-colors flex-shrink-0">
                            Mis Pedidos
                        </a>
                    ` : ''}

                    ${isAdmin ? `
                        <a href="/admin/dashboard.html" class="text-[#1ca299] hover:underline flex-shrink-0 ml-auto">
                            Panel Administración
                        </a>
                    ` : ''}
                </div>
            </div>

        </header>
    `;

    // Conectar botón de logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            auth.logout(true);
        });
    }

    // Cargar categorías en el dropdown
    cargarCategoriasSubnav();

    // Inicializar conteo de carrito
    cart.obtenerCarrito();

    // Inicializar chat flotante
    initFloatingChat();
}

async function cargarCategoriasSubnav() {
    const listEl = document.getElementById('nav-categories-list');
    if (!listEl) return;

    try {
        const res = await api.get('/api/categorias');
        if (res.exito && res.datos) {
            listEl.innerHTML = `
                <a href="/index.html" class="block px-4 py-2 hover:bg-neutral-800 text-neutral-300 hover:text-white font-medium">
                    Todas las categorías
                </a>
            `;
            res.datos.forEach(c => {
                const a = document.createElement('a');
                a.href = `/index.html?categoriaId=${c.id}`;
                a.className = 'block px-4 py-2 hover:bg-[#14635c]/30 text-neutral-300 hover:text-[#1ca299] font-medium transition-colors';
                a.textContent = c.nombre;
                listEl.appendChild(a);
            });
        }
    } catch (e) {
        console.error('Error cargando categorías del subnav:', e);
    }
}
