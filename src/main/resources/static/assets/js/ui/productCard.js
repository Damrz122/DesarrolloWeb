// productCard.js - Componente de tarjeta de producto estilo Electronix / Mercado Libre

export function renderProductCard(producto, onAddToCart) {
    const card = document.createElement('div');
    card.className = 'group relative flex flex-col bg-white border border-neutral-200 hover:border-[#1ca299]/60 rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300';

    const precioFormateado = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(producto.precio);
    const tieneStock = producto.stock > 0;
    const esEnvioGratis = producto.precio >= 199;
    const imagenFallback = 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=600&auto=format&fit=crop&q=80';

    card.innerHTML = `
        <!-- Imagen -->
        <div class="relative w-full h-52 bg-white p-4 flex items-center justify-center overflow-hidden border-b border-neutral-100">
            <img 
                src="${producto.imagenUrl || imagenFallback}" 
                alt="${producto.nombre}"
                class="max-h-44 w-auto object-contain group-hover:scale-105 transition-transform duration-300"
                onerror="this.src='${imagenFallback}'"
            />
            
            <span class="absolute top-2.5 left-2.5 bg-neutral-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                ${producto.categoriaNombre || 'Tecnología'}
            </span>

            <span class="absolute top-2.5 right-2.5 text-[10px] font-bold px-2 py-0.5 rounded ${
                producto.stock > 5 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : producto.stock > 0 
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
            }">
                ${producto.stock > 0 ? `${producto.stock} disponibles` : 'Agotado'}
            </span>
        </div>

        <!-- Información -->
        <div class="p-4 flex-1 flex flex-col justify-between bg-white">
            <div>
                <a href="/producto.html?id=${producto.id}" class="block">
                    <h3 class="text-sm font-semibold text-neutral-800 group-hover:text-[#14635c] line-clamp-2 leading-snug transition-colors">
                        ${producto.nombre}
                    </h3>
                </a>

                <div class="mt-2.5 flex items-baseline space-x-2">
                    <span class="text-xl font-black text-neutral-900">${precioFormateado}</span>
                </div>

                ${esEnvioGratis ? `
                    <div class="mt-1 flex items-center space-x-1 text-emerald-600 text-xs font-bold">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
                        <span>Envío gratis</span>
                    </div>
                ` : ''}
            </div>

            <!-- Botones de Acción -->
            <div class="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                <a href="/producto.html?id=${producto.id}" class="px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold transition-colors">
                    Ver detalle
                </a>

                <button 
                    class="add-btn flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all duration-200 ${
                        tieneStock 
                            ? 'bg-[#14635c] hover:bg-[#1ca299] text-white shadow-sm' 
                            : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                    }"
                    ${tieneStock ? '' : 'disabled'}
                >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
