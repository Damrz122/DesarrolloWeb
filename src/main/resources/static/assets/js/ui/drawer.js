// drawer.js - Panel lateral de navegación y filtros estilo marketplace.
// Se abre al hacer clic en TODO / CATEGORIAS / OFERTAS de la sub-navbar.
// Autocontenido con clases elx-drawer-* (output.css): no depende del CDN.

import { api } from '../api.js';
import { auth } from '../auth.js';

let wired = false;
let catsCache = null;
let catsLoading = false;

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

const CHEV = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"></path></svg>';

function buildDrawer() {
    if (document.getElementById('elx-drawer')) return;

    const html = `
        <div id="elx-drawer-backdrop" class="elx-drawer-backdrop"></div>
        <aside id="elx-drawer" class="elx-drawer" aria-label="Menú de navegación" aria-hidden="true">
            <div class="elx-drawer-head">
                <div>
                    <div class="elx-drawer-greet">¡Hola<span id="elx-drawer-user"></span>!</div>
                    <div class="elx-drawer-sub">Explora el catálogo de Electronix</div>
                </div>
                <button id="elx-drawer-close" class="elx-drawer-close" aria-label="Cerrar menú">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"></path></svg>
                </button>
            </div>
            <nav class="elx-drawer-body">
                <a class="elx-drawer-item elx-drawer-offer" href="/productos.html?ofertas=true" data-nav>
                    <span class="elx-drawer-item-text">
                        <span class="elx-drawer-item-title">Ofertas</span>
                        <span class="elx-drawer-item-desc">Descuentos ordenados por precio</span>
                    </span>
                    ${CHEV}
                </a>
                <div class="elx-drawer-sec" id="elx-drawer-cats-sec">
                    <div class="elx-drawer-sec-title">Comprar por categoría</div>
                    <div id="elx-drawer-cats">
                        <div class="elx-drawer-loading">Cargando categorías…</div>
                    </div>
                </div>
                <div class="elx-drawer-sec">
                    <div class="elx-drawer-sec-title">Mi cuenta</div>
                    <div id="elx-drawer-account"></div>
                </div>
                <div class="elx-drawer-sec">
                    <div class="elx-drawer-sec-title">Ayuda</div>
                    <button class="elx-drawer-item" id="elx-drawer-support" type="button">
                        <span class="elx-drawer-item-text">
                            <span class="elx-drawer-item-title">Soporte en vivo</span>
                            <span class="elx-drawer-item-desc">Chatea con nosotros</span>
                        </span>
                        ${CHEV}
                    </button>
                    <a class="elx-drawer-item" href="/index.html" data-nav>
                        <span class="elx-drawer-item-text">
                            <span class="elx-drawer-item-title">Inicio</span>
                            <span class="elx-drawer-item-desc">Volver a la portada</span>
                        </span>
                        ${CHEV}
                    </a>
                </div>
            </nav>
        </aside>`;

    document.body.insertAdjacentHTML('beforeend', html);

    document.getElementById('elx-drawer-close').addEventListener('click', closeDrawer);
    document.getElementById('elx-drawer-backdrop').addEventListener('click', closeDrawer);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeDrawer();
    });
    document.getElementById('elx-drawer-support').addEventListener('click', () => {
        closeDrawer();
        const chatBtn = document.getElementById('chat-toggle-btn');
        if (chatBtn) {
            chatBtn.click();
        } else {
            window.location.href = '/index.html';
        }
    });
}

function paintGreeting() {
    const user = auth.getUser();
    const slot = document.getElementById('elx-drawer-user');
    if (slot) {
        const first = user && user.nombre ? user.nombre.split(' ')[0] : '';
        slot.textContent = first ? `, ${first}` : '';
    }
}

function paintAccount() {
    const box = document.getElementById('elx-drawer-account');
    if (!box) return;
    const user = auth.getUser();
    const isAdmin = auth.isAdmin();

    if (user) {
        box.innerHTML = `
            <a class="elx-drawer-item" href="/mis-pedidos.html" data-nav>
                <span class="elx-drawer-item-text">
                    <span class="elx-drawer-item-title">Mis pedidos</span>
                    <span class="elx-drawer-item-desc">${escapeHtml(user.email || '')}</span>
                </span>
                ${CHEV}
            </a>
            <a class="elx-drawer-item" href="/carrito.html" data-nav>
                <span class="elx-drawer-item-text">
                    <span class="elx-drawer-item-title">Mi carrito</span>
                    <span class="elx-drawer-item-desc">Revisa tus productos</span>
                </span>
                ${CHEV}
            </a>
            ${isAdmin ? `
            <a class="elx-drawer-item" href="/admin/dashboard.html" data-nav>
                <span class="elx-drawer-item-text">
                    <span class="elx-drawer-item-title">Panel administrador</span>
                    <span class="elx-drawer-item-desc">Gestiona la tienda</span>
                </span>
                ${CHEV}
            </a>` : ''}
            <button class="elx-drawer-item" id="elx-drawer-logout" type="button">
                <span class="elx-drawer-item-text">
                    <span class="elx-drawer-item-title">Cerrar sesión</span>
                </span>
                ${CHEV}
            </button>`;
        const logoutBtn = document.getElementById('elx-drawer-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                closeDrawer();
                auth.logout(true);
            });
        }
    } else {
        box.innerHTML = `
            <a class="elx-drawer-item" href="/login.html" data-nav>
                <span class="elx-drawer-item-text">
                    <span class="elx-drawer-item-title">Iniciar sesión</span>
                    <span class="elx-drawer-item-desc">Accede a tu cuenta</span>
                </span>
                ${CHEV}
            </a>
            <a class="elx-drawer-item" href="/registro.html" data-nav>
                <span class="elx-drawer-item-text">
                    <span class="elx-drawer-item-title">Crear cuenta</span>
                    <span class="elx-drawer-item-desc">Únete a Electronix</span>
                </span>
                ${CHEV}
            </a>`;
    }
}

async function paintCats() {
    const box = document.getElementById('elx-drawer-cats');
    if (!box) return;

    if (catsCache) {
        box.innerHTML = catsCache.map(c => `
            <a class="elx-drawer-item" href="/productos.html?categoriaId=${c.id}" data-nav>
                <span class="elx-drawer-item-text">
                    <span class="elx-drawer-item-title">${escapeHtml(c.nombre)}</span>
                    ${c.descripcion ? `<span class="elx-drawer-item-desc">${escapeHtml(c.descripcion)}</span>` : ''}
                </span>
                ${CHEV}
            </a>`).join('') + `
            <a class="elx-drawer-item elx-drawer-all" href="/productos.html" data-nav>
                <span class="elx-drawer-item-text">
                    <span class="elx-drawer-item-title">Ver todo el catálogo</span>
                </span>
                ${CHEV}
            </a>`;
        return;
    }

    if (catsLoading) return;
    catsLoading = true;
    box.innerHTML = '<div class="elx-drawer-loading">Cargando categorías…</div>';

    try {
        const res = await api.get('/api/categorias');
        if (res.exito && res.datos) {
            catsCache = res.datos;
            catsLoading = false;
            paintCats();
        } else {
            throw new Error('Sin datos');
        }
    } catch (err) {
        catsLoading = false;
        box.innerHTML = `
            <button class="elx-drawer-item" id="elx-drawer-retry" type="button">
                <span class="elx-drawer-item-text">
                    <span class="elx-drawer-item-title">Reintentar</span>
                    <span class="elx-drawer-item-desc">No se pudieron cargar las categorías</span>
                </span>
                ${CHEV}
            </button>`;
        const retry = document.getElementById('elx-drawer-retry');
        if (retry) retry.addEventListener('click', paintCats);
    }
}

export function openDrawer(section) {
    buildDrawer();
    paintGreeting();
    paintAccount();
    paintCats();

    const drawer = document.getElementById('elx-drawer');
    const backdrop = document.getElementById('elx-drawer-backdrop');
    if (drawer) {
        drawer.classList.add('open');
        drawer.setAttribute('aria-hidden', 'false');
    }
    if (backdrop) backdrop.classList.add('open');
    document.body.classList.add('elx-drawer-open');

    if (section) {
        const target = section === 'cats'
            ? document.getElementById('elx-drawer-cats-sec')
            : drawer;
        if (target && target.scrollIntoView) {
            setTimeout(() => {
                if (section === 'cats') {
                    target.scrollIntoView({ block: 'start' });
                } else {
                    drawer.scrollTop = 0;
                }
            }, 60);
        }
    }
}

export function closeDrawer() {
    const drawer = document.getElementById('elx-drawer');
    const backdrop = document.getElementById('elx-drawer-backdrop');
    if (drawer) {
        drawer.classList.remove('open');
        drawer.setAttribute('aria-hidden', 'true');
    }
    if (backdrop) backdrop.classList.remove('open');
    document.body.classList.remove('elx-drawer-open');
}

function wireTriggers() {
    const subnav = document.querySelector('.elx-subnav');
    if (!subnav || subnav.dataset.drawerWired === '1') return;
    subnav.dataset.drawerWired = '1';

    const todoLink = subnav.querySelector('a[href="/index.html"].elx-subnav-link');
    if (todoLink && !todoLink.dataset.drawerBound) {
        todoLink.dataset.drawerBound = '1';
        todoLink.addEventListener('click', (e) => {
            e.preventDefault();
            openDrawer('top');
        });
    }

    const catTrigger = subnav.querySelector('.elx-dropdown-trigger');
    if (catTrigger && !catTrigger.dataset.drawerBound) {
        catTrigger.dataset.drawerBound = '1';
        catTrigger.addEventListener('click', () => openDrawer('cats'));
    }

    const ofertasLink = subnav.querySelector('a[href="/productos.html?ofertas=true"]');
    if (ofertasLink && !ofertasLink.dataset.drawerBound) {
        ofertasLink.dataset.drawerBound = '1';
        ofertasLink.addEventListener('click', (e) => {
            e.preventDefault();
            openDrawer('ofertas');
        });
    }
}

export function initSideDrawer() {
    if (wired) {
        wireTriggers();
        return;
    }
    wired = true;
    wireTriggers();
}
