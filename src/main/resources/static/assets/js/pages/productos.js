import { api } from '/assets/js/api.js';
import { auth } from '/assets/js/auth.js';
import { cart } from '/assets/js/cart.js';
import { renderNavbar } from '/assets/js/ui/navbar.js';
import { renderProductCard } from '/assets/js/ui/productCard.js';

renderNavbar();

let currentPage = 0;
let totalPages = 1;
let totalElementos = 0;
const pageSize = 12;

const productsContainer = document.getElementById('products-container');
const searchInput = document.getElementById('filter-search');
const categoriaSelect = document.getElementById('filter-categoria');
const priceInput = document.getElementById('filter-price');
const priceVal = document.getElementById('price-val');
const orderSelect = document.getElementById('filter-order');
const paginationContainer = document.getElementById('pagination-container');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const pageInfo = document.getElementById('page-info');
const btnLimpiar = document.getElementById('btn-limpiar-filtros');
const resultsCount = document.getElementById('results-count');

// Nuevos elementos estilo referencia
const pillsNav = document.getElementById('cat-pills');
const btnOpenFilters = document.getElementById('btn-open-filters');
const filterDrawer = document.getElementById('filter-drawer');
const filterOverlay = document.getElementById('filter-overlay');
const btnCloseFilters = document.getElementById('btn-close-filters');
const btnApplyFilters = document.getElementById('btn-apply-filters');
const orderLabelBtn = document.getElementById('order-current-label');

const ORDER_LABELS = {
    'fechaCreacion:desc': 'Recomendaciones',
    'precio:asc': 'Precio: Menor a Mayor',
    'precio:desc': 'Precio: Mayor a Menor',
    'nombre:asc': 'Nombre: A - Z'
};

const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('q')) {
    searchInput.value = urlParams.get('q');
}
if (urlParams.has('ofertas')) {
    orderSelect.value = 'precio:asc';
}
const ordenParam = urlParams.get('orden');
const ordenes = {
    'recientes': 'fechaCreacion:desc',
    'precio-asc': 'precio:asc',
    'precio-desc': 'precio:desc',
    'nombre': 'nombre:asc'
};
if (ordenParam && ordenes[ordenParam]) {
    orderSelect.value = ordenes[ordenParam];
}

function normalizar(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

// Alias de los links viejos / tiles del home -> nombre real en BD
const ALIAS_CATEGORIA = {
    'televisores': 'monitores',
    'laptops': 'laptops y computadoras',
    'portatiles': 'laptops y computadoras',
    'audio': 'audio y sonido',
    'equipo de sonido': 'audio y sonido',
    'accesorios': 'accesorios moviles',
    'accesorios y pc': 'accesorios moviles'
};

function resolverCategoriaPorNombre(cats, buscado) {
    const n = normalizar(buscado);
    if (!n) return null;
    let hit = cats.find(c => normalizar(c.nombre) === n);
    if (hit) return hit;
    const alias = ALIAS_CATEGORIA[n];
    if (alias) {
        hit = cats.find(c => normalizar(c.nombre) === alias);
        if (hit) return hit;
    }
    // match parcial: "laptop" matchea "laptops y computadoras"
    hit = cats.find(c => normalizar(c.nombre).includes(n) || n.includes(normalizar(c.nombre).split(' ')[0]));
    return hit || null;
}

// ---------- Drawer ----------
function openDrawer() {
    filterDrawer?.classList.add('open');
    filterOverlay?.classList.add('open');
    btnCloseFilters?.classList.add('open');
    filterDrawer?.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

function closeDrawer() {
    filterDrawer?.classList.remove('open');
    filterOverlay?.classList.remove('open');
    btnCloseFilters?.classList.remove('open');
    filterDrawer?.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

btnOpenFilters?.addEventListener('click', openDrawer);
btnCloseFilters?.addEventListener('click', closeDrawer);
filterOverlay?.addEventListener('click', closeDrawer);
orderLabelBtn?.addEventListener('click', openDrawer);
btnApplyFilters?.addEventListener('click', closeDrawer);
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrawer();
});

// Acordeones del drawer
document.querySelectorAll('.gf-acc-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        btn.closest('.gf-acc')?.classList.toggle('open');
    });
});

function updateOrderLabel() {
    const label = ORDER_LABELS[orderSelect.value] || 'Recomendaciones';
    if (orderLabelBtn) orderLabelBtn.textContent = label;
}

function updateFilterDot() {
    const hasFilters = searchInput.value.trim() !== ''
        || categoriaSelect.value !== ''
        || Number(priceInput.value) < 10000
        || orderSelect.value !== 'fechaCreacion:desc';
    btnOpenFilters?.classList.toggle('has-filters', hasFilters);
}

function updateShowBtn() {
    if (btnApplyFilters) {
        btnApplyFilters.textContent = `Mostrar ${totalElementos} artículo${totalElementos === 1 ? '' : 's'}`;
    }
}

// ---------- Pills de categorías ----------
function renderPills(cats, seleccionadaId) {
    if (!pillsNav) return;
    pillsNav.innerHTML = '';

    const mk = (label, value, active) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'gf-pill' + (active ? ' active' : '');
        b.textContent = label;
        b.addEventListener('click', () => {
            categoriaSelect.value = value;
            currentPage = 0;
            syncPills();
            updateFilterDot();
            cargarProductos();
        });
        return b;
    };

    pillsNav.appendChild(mk('Todas', '', !seleccionadaId));
    cats.forEach(c => {
        pillsNav.appendChild(mk(c.nombre, String(c.id), String(c.id) === String(seleccionadaId)));
    });
}

function syncPills() {
    if (!pillsNav) return;
    const val = categoriaSelect.value;
    const btns = [...pillsNav.children];
    // El primero es "Todas", el resto va en orden de las options (saltando la vacía)
    const opts = [...categoriaSelect.options].filter(o => o.value !== '');
    btns.forEach((b, i) => {
        if (i === 0) b.classList.toggle('active', !val);
        else {
            const opt = opts[i - 1];
            b.classList.toggle('active', !!opt && String(opt.value) === String(val));
        }
    });
}

async function cargarCategorias() {
    try {
        const res = await api.get('/api/categorias');
        if (res.exito && res.datos) {
            const cid = urlParams.get('categoriaId');
            const cnom = urlParams.get('categoria');
            let seleccionada = null;
            if (cid) {
                seleccionada = res.datos.find(c => String(c.id) === String(cid)) || null;
            }
            if (!seleccionada && cnom) {
                seleccionada = resolverCategoriaPorNombre(res.datos, cnom);
            }
            res.datos.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat.id;
                opt.textContent = cat.nombre;
                if (seleccionada && String(seleccionada.id) === String(cat.id)) {
                    opt.selected = true;
                }
                categoriaSelect.appendChild(opt);
            });
            renderPills(res.datos, seleccionada ? seleccionada.id : '');
            // Si vino ?categoria=alias viejo, reescribe la URL a categoriaId canónico
            if (seleccionada && !cid) {
                const u = new URL(window.location.href);
                u.searchParams.delete('categoria');
                u.searchParams.set('categoriaId', seleccionada.id);
                window.history.replaceState({}, '', u.toString());
            }
        } else {
            renderPills([], '');
        }
    } catch (err) {
        console.error('Error cargando categorías:', err);
        renderPills([], '');
    }
}

async function cargarProductos() {
    const nombre = searchInput.value.trim();
    const categoriaId = categoriaSelect.value;
    const precioMax = priceInput.value;
    const [sortBy, direction] = orderSelect.value.split(':');

    let query = `/api/productos?page=${currentPage}&size=${pageSize}&sortBy=${sortBy}&direction=${direction}`;
    if (nombre) query += `&nombre=${encodeURIComponent(nombre)}`;
    if (categoriaId) query += `&categoriaId=${categoriaId}`;
    if (precioMax && precioMax < 10000) query += `&precioMax=${precioMax}`;
    if (urlParams.has('ofertas')) query += '&etiqueta=OFERTA';

    try {
        const res = await api.get(query);
        productsContainer.innerHTML = '';

        if (res.exito && res.datos && res.datos.contenido.length > 0) {
            totalPages = res.datos.totalPaginas;
            totalElementos = res.datos.totalElementos ?? res.datos.contenido.length;
            if (resultsCount) {
                resultsCount.textContent = `${totalElementos} Artículo${totalElementos === 1 ? '' : 's'}`;
            }
            res.datos.contenido.forEach(prod => {
                const card = renderProductCard(prod, async (p) => {
                    await cart.agregarItem(p.id, 1);
                });
                productsContainer.appendChild(card);
            });

            if (totalPages > 1) {
                paginationContainer.classList.remove('is-hidden');
                pageInfo.textContent = `Página ${currentPage + 1} de ${totalPages}`;
                prevPageBtn.disabled = currentPage === 0;
                nextPageBtn.disabled = currentPage >= totalPages - 1;
            } else {
                paginationContainer.classList.add('is-hidden');
            }
        } else {
            totalElementos = 0;
            paginationContainer.classList.add('is-hidden');
            if (resultsCount) resultsCount.textContent = '0 Artículos';
            productsContainer.innerHTML = `
                <div class="elx-vacio">
                    <svg width="48" height="48" class="elx-vacio-icono" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <p class="elx-vacio-titulo">No encontramos productos con esos filtros</p>
                    <p class="elx-vacio-sub">Intenta ajustando el precio o buscando otro término</p>
                </div>
            `;
        }
    } catch (err) {
        productsContainer.innerHTML = `<div class="elx-error-carga">Error al cargar productos: ${err.message}</div>`;
    } finally {
        updateOrderLabel();
        updateFilterDot();
        updateShowBtn();
    }
}

let debounceTimer;
searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        currentPage = 0;
        updateFilterDot();
        cargarProductos();
    }, 300);
});

categoriaSelect.addEventListener('change', () => {
    currentPage = 0;
    syncPills();
    updateFilterDot();
    cargarProductos();
});

priceInput.addEventListener('input', (e) => {
    priceVal.textContent = `S/ ${parseInt(e.target.value).toLocaleString()}`;
});

priceInput.addEventListener('change', () => {
    currentPage = 0;
    updateFilterDot();
    cargarProductos();
});

orderSelect.addEventListener('change', () => {
    currentPage = 0;
    updateOrderLabel();
    updateFilterDot();
    cargarProductos();
});

btnLimpiar.addEventListener('click', () => {
    searchInput.value = '';
    categoriaSelect.value = '';
    priceInput.value = 10000;
    priceVal.textContent = 'S/ 10,000';
    orderSelect.value = 'fechaCreacion:desc';
    currentPage = 0;
    syncPills();
    updateOrderLabel();
    updateFilterDot();
    cargarProductos();
});

prevPageBtn.addEventListener('click', () => {
    if (currentPage > 0) {
        currentPage--;
        cargarProductos();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});

nextPageBtn.addEventListener('click', () => {
    if (currentPage < totalPages - 1) {
        currentPage++;
        cargarProductos();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});

updateOrderLabel();
await cargarCategorias();
syncPills();
await cargarProductos();
