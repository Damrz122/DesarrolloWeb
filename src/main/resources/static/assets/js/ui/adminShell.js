// adminShell.js - Barra superior compartida del Módulo de Administración.
// Inyecta topbar clara con logo ELECTRONIX + navegación + perfil con menú
// (Apariencia claro/oscuro + Salir). Tema persistido en localStorage.
// shell admin: es para pintar el menu segun el modulo

import { auth } from '../auth.js';
import { obtenerSitio, pintarLogo } from '../sitio.js?v=5';

export const ADMIN_THEME_KEY = 'electronix_admin_theme';

const LOGO_SVG = `
    <img src="/assets/img/logo.svg" alt="Electronix" width="28" height="28" class="adm-brand-logo-img" aria-hidden="true">`;

const SUN_SVG = `
    <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>`;

const MOON_SVG = `
    <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>`;

const LINKS = [
    { id: 'dashboard', href: '/admin/dashboard.html', label: 'Dashboard' },
    { id: 'productos', href: '/admin/productos.html', label: 'Productos' },
    { id: 'categorias', href: '/admin/categorias.html', label: 'Categorías' },
    { id: 'pedidos', href: '/admin/pedidos.html', label: 'Pedidos' },
    { id: 'usuarios', href: '/admin/usuarios.html', label: 'Usuarios' },
    { id: 'configuracion', href: '/admin/configuracion.html', label: 'Configuración' },
    { id: 'reportes', href: '/admin/reportes.html', label: 'Reportes' },
    { id: 'chat', href: '/admin/chat.html', label: 'Chat Clientes', dot: true }
];

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function getAdminTheme() {
    try {
        return localStorage.getItem(ADMIN_THEME_KEY) === 'dark' ? 'dark' : 'light';
    } catch {
        return 'light';
    }
}

export function setAdminTheme(theme) {
    const value = theme === 'dark' ? 'dark' : 'light';
    try {
        localStorage.setItem(ADMIN_THEME_KEY, value);
    } catch { /* almacenamiento no disponible */ }
    document.documentElement.setAttribute('data-theme', value === 'dark' ? 'dark' : 'light');
    const label = document.getElementById('adm-theme-state');
    if (label) label.textContent = value === 'dark' ? 'Oscuro' : 'Claro';
    const icon = document.getElementById('adm-theme-icon');
    if (icon) icon.innerHTML = value === 'dark' ? SUN_SVG : MOON_SVG;
}

export function renderAdminShell(active) {
    const header = document.getElementById('main-navbar');
    if (!header) return;

    const user = auth.getUser();
    const nombre = user && user.nombre ? user.nombre : 'Admin';
    const email = user && user.email ? user.email : '';
    const initial = nombre.charAt(0).toUpperCase();
    const theme = getAdminTheme();

    const permisosNav = { dashboard: ['REPORTES_VER','PEDIDOS_GESTIONAR'], productos: ['PRODUCTOS_VER','PRODUCTOS_GESTIONAR','INVENTARIO_GESTIONAR'], categorias: ['CATEGORIAS_GESTIONAR'], pedidos: ['PEDIDOS_GESTIONAR'], usuarios: ['USUARIOS_GESTIONAR'], configuracion: ['CONFIGURACION_GESTIONAR'], reportes: ['REPORTES_VER'], chat: ['CHAT_ATENDER'] };
    const nav = LINKS.filter(l => permisosNav[l.id]?.some(p => auth.tienePermiso(p))).map(l => `
        <a href="${l.href}" class="${l.id === active ? 'adm-active' : ''}">
            ${l.label}${l.dot ? ' <span class="adm-dot-live"></span>' : ''}
        </a>`).join('');

    header.innerHTML = `
        <div class="adm-topbar-wrap">
            <div class="adm-topbar">
                <a class="adm-brand" href="${auth.inicioAdmin()}" title="ELECTRONIX Admin">
                    <span class="adm-brand-logo">${LOGO_SVG}</span>
                    <span>
                        <span class="adm-brand-name">ELECTRONIX</span><br/>
                        <span class="adm-brand-sub">Panel Admin</span>
                    </span>
                </a>
                <nav class="adm-nav">${nav}</nav>
                <div class="adm-user">
                    <div class="adm-profile-wrap" id="adm-profile-wrap">
                        <button id="adm-profile-btn" class="adm-user-chip" aria-haspopup="true" aria-expanded="false" title="Abrir menú de perfil">
                            <span class="adm-avatar">${escapeHtml(initial)}</span>
                            <span>${escapeHtml(nombre)}</span>
                            <svg class="adm-user-chev" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 9l-7 7-7-7"></path></svg>
                        </button>
                        <div id="adm-profile-menu" class="adm-profile-menu" role="menu">
                            <div class="adm-profile-mail">Conectado como<br/><strong>${escapeHtml(email || nombre)}</strong></div>
                            <a href="/index.html" class="adm-menu-btn" role="menuitem">Ir a página</a>
                            ${auth.tienePermiso('APARIENCIA_GESTIONAR') ? '<a href="/admin/apariencia.html" class="adm-menu-btn" role="menuitem">Ajustes Página</a>' : ''}
                            <button id="adm-theme-btn" class="adm-menu-btn" role="menuitem">
                                <span class="adm-shell-fila">
                                    <span>Apariencia</span>
                                </span>
                                <span id="adm-theme-state" class="adm-theme-state">${theme === 'dark' ? 'Oscuro' : 'Claro'}</span>
                            </button>
                            <button id="adm-logout-btn" class="adm-menu-btn danger" role="menuitem">Salir</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;

    const wrap = document.getElementById('adm-profile-wrap');
    const profileBtn = document.getElementById('adm-profile-btn');
    const menu = document.getElementById('adm-profile-menu');

    // portal menu: se mueve al body para que su blur no lo bloquee el blur del nav
    if (menu && menu.parentElement !== document.body) {
        document.body.appendChild(menu);
        menu.style.position = 'fixed';
    }

    function posicionarMenu() {
        if (!profileBtn || !menu) return;
        const r = profileBtn.getBoundingClientRect();
        menu.style.top = (r.bottom + 8) + 'px';
        menu.style.right = Math.max(12, window.innerWidth - r.right) + 'px';
        menu.style.left = 'auto';
        menu.style.minWidth = Math.max(230, r.width) + 'px';
    }

    function cerrarMenu() {
        if (!menu || !profileBtn) return;
        menu.classList.remove('adm-open');
        profileBtn.setAttribute('aria-expanded', 'false');
    }

    if (profileBtn && menu) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            posicionarMenu();
            const open = menu.classList.toggle('adm-open');
            profileBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
        document.addEventListener('click', (e) => {
            if (wrap && (wrap.contains(e.target) || menu.contains(e.target))) return;
            cerrarMenu();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') cerrarMenu();
        });
        window.addEventListener('scroll', () => {
            if (menu.classList.contains('adm-open')) posicionarMenu();
        }, true);
        window.addEventListener('resize', () => {
            if (menu.classList.contains('adm-open')) posicionarMenu();
        });
    }

    const themeBtn = document.getElementById('adm-theme-btn');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            setAdminTheme(getAdminTheme() === 'dark' ? 'light' : 'dark');
        });
    }

    const logoutBtn = document.getElementById('adm-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => auth.logout(true));
    }

    // marca editable: logo y nombre desde la config del sitio (no bloquea nada)
    obtenerSitio().then(cfg => {
        if (!cfg) return;
        const logo = String(cfg['site.logo'] || '').trim();
        const nombre = String(cfg['site.nombre'] || '').trim();
        if (logo) {
            const img = header.querySelector('.adm-brand-logo-img');
            if (img) pintarLogo(img, logo, nombre || 'Electronix');
        }
        if (nombre) {
            const name = header.querySelector('.adm-brand-name');
            if (name) name.textContent = nombre;
        }
    }).catch(() => {});
}
