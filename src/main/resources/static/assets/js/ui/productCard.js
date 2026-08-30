// productCard.js - Componente de tarjeta de producto con clases CSS semánticas

export function renderProductCard(producto, onAddToCart) {
    const card = document.createElement('div');
    card.className = 'elx-product-card';

    const precioFormateado = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(producto.precio);
    const tieneStock = producto.stock > 0;
    const esEnvioGratis = producto.precio >= 199;
    const imagenFallback = 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=600&auto=format&fit=crop&q=80';

    const stockClass = producto.stock > 5 ? 'elx-stock-in' : (producto.stock > 0 ? 'elx-stock-low' : 'elx-stock-out');
    const stockText = producto.stock > 0 ? `${producto.stock} disponibles` : 'Agotado';

    card.innerHTML = `
        <div class="elx-product-img-wrap">
            <img 
                src="${producto.imagenUrl || imagenFallback}" 
                alt="${producto.nombre}"
                class="elx-product-img"
                onerror="this.src='${imagenFallback}'"
            />
            
            <span class="elx-product-badge">
                ${producto.categoriaNombre || 'Tecnología'}
            </span>

            <span class="elx-stock-badge ${stockClass}">
                ${stockText}
            </span>
        </div>

        <div class="elx-product-info">
            <div>
                <a href="/producto.html?id=${producto.id}">
                    <h3 class="elx-product-title">${producto.nombre}</h3>
                </a>

                <div class="elx-product-price">${precioFormateado}</div>

                ${esEnvioGratis ? `
                    <div class="elx-free-shipping">
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
                        <span>Envío gratis</span>
                    </div>
                ` : ''}
            </div>

            <div class="elx-product-actions">
                <a href="/producto.html?id=${producto.id}" class="elx-btn-detail">
                    Ver detalle
                </a>

                <button 
                    class="add-btn elx-btn-add"
                    ${tieneStock ? '' : 'disabled style="opacity: 0.4; cursor: not-allowed;"'}
                >
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                    </svg>
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
