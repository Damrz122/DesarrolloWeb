import { api } from '/assets/js/api.js';
import { formatoMoneda } from '/assets/js/money.js';
import { cart } from '/assets/js/cart.js';
import { renderNavbar } from '/assets/js/ui/navbar.js';
import { renderProductCard } from '/assets/js/ui/productCard.js';
import { showToast } from '/assets/js/ui/toast.js';

renderNavbar();

const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');
const container = document.getElementById('product-detail-container');
const breadcrumbTitle = document.getElementById('breadcrumb-title');

function esc(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

if (!productId) {
    container.innerHTML = `
        <div class="text-center py-12 text-rose-600">
            <p class="text-lg font-bold">No se especificó un producto válido.</p>
            <a href="/productos.html" class="mt-4 inline-block text-[#3564C9] font-bold hover:underline text-sm">Volver al catálogo</a>
        </div>
    `;
} else {
    cargarDetalle(productId);
}

async function cargarDetalle(id) {
    try {
        const res = await api.get(`/api/productos/${id}`);
        if (!res.exito || !res.datos) {
            throw new Error(res.mensaje || 'Producto no disponible');
        }

        const p = res.datos;
        breadcrumbTitle.textContent = p.nombre;
        document.title = `${p.nombre} — ELECTRONIX`;

        const precioOfertaNum = Number(p.precioOferta);
        const esOferta = String(p.etiqueta || '').trim().toUpperCase() === 'OFERTA'
            && Number.isFinite(precioOfertaNum) && precioOfertaNum > 0 && Number(p.precio) > precioOfertaNum;
        const precioVigente = esOferta ? precioOfertaNum : Number(p.precio);
        const precioFormateado = formatoMoneda(p.precio, p.monedaCodigo);
        const precioVigenteFmt = formatoMoneda(precioVigente, p.monedaCodigo);
        const cuota = formatoMoneda(precioVigente / 6, p.monedaCodigo);
        const tieneStock = p.stock > 0;
        const esEnvioGratis = precioVigente >= 199;
        const imagenFallback = 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=600&auto=format&fit=crop&q=80';
        const galeria = (p.imagenes && p.imagenes.length > 0 ? p.imagenes : [p.imagenUrl || imagenFallback]);

        const stockColor = p.stock > 5 ? 'text-emerald-700' : (p.stock > 0 ? 'text-amber-600' : 'text-rose-600');
        const stockText = p.stock > 0 ? `${p.stock} disponibles` : 'Agotado temporalmente';

        const thumbs = galeria.map((img, i) => `
            <button type="button" class="elx-thumb${i === 0 ? ' elx-thumb-active' : ''}" data-src="${esc(img)}" aria-label="Ver imagen ${i + 1}">
                <img src="${esc(img)}" alt="" loading="lazy" onerror="this.src='${imagenFallback}'" />
            </button>
        `).join('');

        container.innerHTML = `
            <div class="elx-detail-grid">
                <!-- galería: miniaturas + imagen principal -->
                <div class="elx-gallery">
                    <div class="elx-thumbs">${thumbs}</div>
                    <div class="elx-main-img-wrap">
                        <img id="elx-main-img" src="${esc(galeria[0])}" alt="${esc(p.nombre)}"
                            onerror="this.src='${imagenFallback}'" />
                        <span class="elx-detail-cat">${esc(p.categoriaNombre) || 'Tecnología'}</span>
                    </div>
                </div>

                <!-- info central -->
                <div class="elx-detail-info">
                    <p class="elx-detail-cond">Nuevo · ${esc(stockText)}</p>
                    <h1 class="elx-detail-title">${esc(p.nombre)}</h1>

                    <div class="elx-detail-price">${esOferta ? `<s class="elx-old-price">${precioFormateado}</s> <span class="elx-offer-price">${precioVigenteFmt}</span>` : precioVigenteFmt}</div>
                    <p class="elx-detail-cuotas">6 cuotas de ${cuota} sin interés</p>

                    ${esEnvioGratis ? `
                        <p class="elx-detail-ship">
                            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
                            <span>Envío gratis a todo el país</span>
                        </p>
                    ` : ''}

                    <div class="elx-detail-specs">
                        <h3>Lo que tienes que saber de este producto</h3>
                        <ul>
                            <li><span>Categoría:</span> ${esc(p.categoriaNombre) || 'Tecnología'}</li>
                            <li><span>Stock:</span> ${tieneStock ? `${p.stock} unidades` : 'Agotado'}</li>
                            <li><span>SKU:</span> #${p.id}</li>
                            <li><span>Garantía:</span> 12 meses oficial</li>
                        </ul>
                        <p class="elx-detail-desc">${esc(p.descripcion) || 'Sin descripción detallada disponible.'}</p>
                    </div>
                </div>

                <!-- caja de compra -->
                <aside class="elx-buybox">
                    <p class="elx-buybox-ship">${esEnvioGratis ? 'Envío gratis a todo el país' : 'Despacho a todo el Perú'}</p>
                    <p class="elx-buybox-stock ${stockColor}">${esc(stockText)}</p>

                    ${tieneStock ? `
                        <div class="elx-qty-row">
                            <span>Cantidad:</span>
                            <div class="elx-qty">
                                <button id="btn-minus" type="button" aria-label="Quitar uno">−</button>
                                <input id="cant-input" type="number" value="1" min="1" max="${p.stock}" readonly aria-label="Cantidad" />
                                <button id="btn-plus" type="button" aria-label="Agregar uno">+</button>
                            </div>
                            <span class="elx-qty-max">(${p.stock} disponibles)</span>
                        </div>
                        <button id="btn-buy-now" class="elx-buy-now">Comprar ahora</button>
                        <button id="btn-add-cart" class="elx-add-cart">Agregar al carrito</button>
                    ` : `
                        <div class="elx-out-box">Este producto se encuentra temporalmente agotado.</div>
                    `}

                    <div class="elx-buybox-meta">
                        <div><strong>Garantía oficial</strong><span>12 meses de fábrica</span></div>
                        <div><strong>Despacho rápido</strong><span>Envíos a todo el Perú</span></div>
                        <div><strong>Compra protegida</strong><span>Pago 100% seguro</span></div>
                    </div>
                </aside>
            </div>

            <!-- similares -->
            <section class="elx-similar">
                <div class="elx-similar-head">
                    <h2>También te puede interesar</h2>
                    <div class="elx-similar-arrows">
                        <button id="sim-prev" type="button" aria-label="Anteriores">‹</button>
                        <button id="sim-next" type="button" aria-label="Siguientes">›</button>
                    </div>
                </div>
                <div id="similar-track" class="elx-sim-track">
                    <p class="elx-sim-loading">Cargando similares...</p>
                </div>
            </section>
        `;

        // thumbs
        const mainImg = document.getElementById('elx-main-img');
        container.querySelectorAll('.elx-thumb').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.elx-thumb').forEach(b => b.classList.remove('elx-thumb-active'));
                btn.classList.add('elx-thumb-active');
                mainImg.src = btn.dataset.src;
            });
        });

        if (tieneStock) {
            const btnMinus = document.getElementById('btn-minus');
            const btnPlus = document.getElementById('btn-plus');
            const cantInput = document.getElementById('cant-input');

            btnMinus.addEventListener('click', () => {
                const val = parseInt(cantInput.value);
                if (val > 1) cantInput.value = val - 1;
            });
            btnPlus.addEventListener('click', () => {
                const val = parseInt(cantInput.value);
                if (val < p.stock) cantInput.value = val + 1;
                else showToast(`Stock máximo alcanzado (${p.stock})`, 'warning');
            });

            document.getElementById('btn-add-cart').addEventListener('click', async () => {
                await cart.agregarItem(p.id, parseInt(cantInput.value));
            });
            document.getElementById('btn-buy-now').addEventListener('click', async () => {
                try {
                    await cart.agregarItem(p.id, parseInt(cantInput.value));
                    window.location.href = '/checkout.html';
                } catch (e) { /* el toast ya se mostró en cart */ }
            });
        }

        cargarSimilares(p);

    } catch (err) {
        container.innerHTML = `
            <div class="text-center py-12 text-rose-600">
                <p class="text-base font-bold">Error al cargar producto: ${esc(err.message)}</p>
                <a href="/productos.html" class="mt-4 inline-block text-[#3564C9] font-bold hover:underline text-sm">Volver al catálogo</a>
            </div>
        `;
    }
}

async function cargarSimilares(p) {
    const track = document.getElementById('similar-track');
    try {
        let lista = [];
        if (p.categoriaId) {
            const res = await api.get(`/api/productos?categoriaId=${p.categoriaId}&size=12`);
            if (res.exito && res.datos) lista = res.datos.contenido || res.datos || [];
        }
        lista = lista.filter(x => String(x.id) !== String(p.id)).slice(0, 10);
        if (lista.length === 0) {
            const res = await api.get('/api/productos?size=12');
            if (res.exito && res.datos) {
                const gen = res.datos.contenido || res.datos || [];
                lista = gen.filter(x => String(x.id) !== String(p.id)).slice(0, 10);
            }
        }
        if (lista.length === 0) {
            track.innerHTML = '<p class="elx-sim-loading">No hay productos similares por ahora.</p>';
            return;
        }
        track.innerHTML = '';
        lista.forEach(prod => {
            const wrap = document.createElement('div');
            wrap.className = 'elx-sim-item';
            wrap.appendChild(renderProductCard(prod, async (x) => { await cart.agregarItem(x.id, 1); }));
            track.appendChild(wrap);
        });

        const prev = document.getElementById('sim-prev');
        const next = document.getElementById('sim-next');
        const step = () => Math.min(track.clientWidth * 0.8, 480);
        if (prev) prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
        if (next) next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
    } catch (err) {
        track.innerHTML = '<p class="elx-sim-loading">No se pudieron cargar los similares.</p>';
    }
}
