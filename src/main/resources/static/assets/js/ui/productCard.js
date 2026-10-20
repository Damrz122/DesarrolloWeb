// productCard.js - Tarjeta de producto estilo tienda (imagen compacta, precio bajo el nombre)
import { formatoMoneda } from '../money.js';

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function renderProductCard(producto, onAddToCart) {
    const card = document.createElement('div');
    card.className = 'elx-product-card';

    const precioFormateado = formatoMoneda(producto.precio, producto.monedaCodigo);
    const tieneStock = producto.stock > 0;
    const imagenFallback = 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=600&auto=format&fit=crop&q=80';

    const etiquetaUp = String(producto.etiqueta || '').trim().toUpperCase();
    const precioOfertaNum = Number(producto.precioOferta);
    const esOferta = etiquetaUp === 'OFERTA' && Number.isFinite(precioOfertaNum) && precioOfertaNum > 0
        && Number(producto.precio) > precioOfertaNum;
    const descuento = esOferta
        ? Math.round((1 - precioOfertaNum / Number(producto.precio)) * 100)
        : 0;

    const ETIQUETAS = {
        NUEVO: ['Nuevo', 'elx-ribbon-nuevo'],
        OFERTA: [esOferta ? `-${descuento}%` : 'Oferta', 'elx-ribbon-oferta'],
        TENDENCIA: ['Tendencia', 'elx-ribbon-tendencia']
    };
    const etiqueta = ETIQUETAS[etiquetaUp];
    const bloquePrecio = esOferta
        ? `<div class="elx-product-price"><s class="elx-old-price">${precioFormateado}</s> <span class="elx-offer-price">${formatoMoneda(precioOfertaNum, producto.monedaCodigo)}</span></div>`
        : `<div class="elx-product-price">${precioFormateado}</div>`;

    card.innerHTML = `
        <div class="elx-product-img-wrap">
            ${etiqueta ? `<span class="elx-ribbon ${etiqueta[1]}">${etiqueta[0]}</span>` : ''}
            <a href="/producto.html?id=${Number(producto.id) || ''}" tabindex="-1" aria-hidden="true">
                <img
                    src="${escapeHtml(producto.imagenUrl) || imagenFallback}"
                    alt="${escapeHtml(producto.nombre)}"
                    class="elx-product-img"
                    loading="lazy"
                    onerror="this.src='${imagenFallback}'"
                />
            </a>
        </div>

        <div class="elx-product-info">
            <div>
                <div class="elx-product-cat">${escapeHtml(producto.categoriaNombre) || 'Tecnología'}</div>
                <a href="/producto.html?id=${Number(producto.id) || ''}">
                    <h3 class="elx-product-title">${escapeHtml(producto.nombre)}</h3>
                </a>

                ${bloquePrecio}
            </div>

            <div class="elx-product-actions">
                <a href="/producto.html?id=${Number(producto.id) || ''}" class="elx-btn-detail">
                    Ver detalle
                </a>

                <button
                    class="add-btn elx-btn-add ${tieneStock ? '' : 'elx-btn-deshabilitado'}"
                    ${tieneStock ? '' : 'disabled'}
                >
                    <span>${tieneStock ? 'Agregar' : 'Sin stock'}</span>
                </button>
            </div>
        </div>
    `;

    const addBtn = card.querySelector('.add-btn');
    if (addBtn && tieneStock && onAddToCart) {
        addBtn.addEventListener('click', () => {
            onAddToCart(producto);
        });
    }

    return card;
}
