// navbar.js - Barra de navegación interactiva y moderna

import { auth } from '../auth.js';
import { cart } from '../cart.js';
import { initFloatingChat } from '../chat.js';

export function renderNavbar() {
    const navContainer = document.getElementById('main-navbar');
    if (!navContainer) return;

    const user = auth.getUser();
    const isAdmin = auth.isAdmin();

    navContainer.innerHTML = `
        <nav class="sticky top-0 z-40 w-full backdrop-blur-xl bg-slate-900/80 border-b border-slate-800 transition-all duration-300">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex items-center justify-between h-16 sm:h-20">
                    
                    <div class="flex items-center space-x-3">
                        <a href="/index.html" class="flex items-center space-x-2.5 group">
                            <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform duration-300">
                                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
                                </svg>
                            </div>
                            <span class="text-xl sm:text-2xl font-black tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                                Nova<span class="text-indigo-400">Store</span>
                            </span>
                        </a>
                    </div>

                    <div class="hidden md:flex items-center space-x-1 sm:space-x-2">
                        <a href="/index.html" class="px-3.5 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all">
                            Catálogo
                        </a>
                        ${user ? `
                            <a href="/mis-pedidos.html" class="px-3.5 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all">
                                Mis Pedidos
                            </a>
                        ` : ''}
                        ${isAdmin ? `
                            <a href="/admin/dashboard.html" class="px-3.5 py-2 rounded-xl text-sm font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all flex items-center space-x-1.5">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                <span>Panel Admin</span>
                            </a>
                        ` : ''}
                    </div>

                    <div class="flex items-center space-x-3">
                        
                        <a href="/carrito.html" class="relative p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:text-white hover:border-slate-600 transition-all flex items-center justify-center">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
                            </svg>
                            <span id="cart-badge" class="hidden absolute -top-1.5 -right-1.5 w-5 h-5 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center shadow-lg animate-scale">
                                0
                            </span>
                        </a>

                        <!-- Autenticación -->
                        ${user ? `
                            <div class="relative group">
                                <button id="user-menu-btn" class="flex items-center space-x-2.5 p-1.5 pr-3 rounded-xl bg-slate-800/70 border border-slate-700/60 hover:border-slate-600 text-sm font-medium text-slate-200 transition-all">
                                    <div class="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                                        ${user.nombre ? user.nombre.charAt(0).toUpperCase() : 'U'}
                                    </div>
                                    <span class="max-w-[100px] truncate hidden sm:inline">${user.nombre}</span>
                                    <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                                </button>
                                
                                <div id="user-dropdown" class="hidden group-hover:block absolute right-0 mt-1 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1.5 z-50 text-sm">
                                    <div class="px-4 py-2 border-b border-slate-800 text-xs text-slate-400">
                                        Conectado como <br/><strong class="text-slate-200">${user.email}</strong>
                                    </div>
                                    <a href="/mis-pedidos.html" class="block px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800/60">Mis Pedidos</a>
                                    ${isAdmin ? `<a href="/admin/dashboard.html" class="block px-4 py-2 text-indigo-400 hover:bg-slate-800/60">Administración</a>` : ''}
                                    <button id="logout-btn" class="w-full text-left px-4 py-2 text-rose-400 hover:bg-rose-950/30">Cerrar Sesión</button>
                                </div>
                            </div>
                        ` : `
                            <div class="flex items-center space-x-2">
                                <a href="/login.html" class="px-3.5 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors">
                                    Ingresar
                                </a>
                                <a href="/registro.html" class="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl shadow-md shadow-indigo-500/20 transition-all">
                                    Registrarse
                                </a>
                            </div>
                        `}
                    </div>

                </div>
            </div>
        </nav>
    `;

    // Conectar botón de logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            auth.logout(true);
        });
    }

    // Inicializar conteo de carrito
    cart.obtenerCarrito();

    // Inicializar chat flotante para clientes
    initFloatingChat();
}
