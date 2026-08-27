// productCard.js - Componente de tarjeta de producto con estética moderna

export function renderProductCard(producto, onAddToCart) {
    const card = document.createElement('div');
    card.className = 'group relative flex flex-col bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 hover:border-indigo-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 overflow-hidden';

    const precioFormateado = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(producto.precio);
    const tieneStock = producto.stock > 0;
    const imagenFallback = 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=600&auto=format&fit=crop&q=80';

    card.innerHTML = `
        <!-- Imagen y Badges -->
        <div class="relative w-full h-56 bg-slate-950/40 overflow-hidden">
            <img 
                src="${producto.imagenUrl || imagenFallback}" 
                alt="${producto.nombre}"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                onerror="this.src='${imagenFallback}'"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60"></div>
            
            <!-- Badge de Categoría -->
            <span class="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-indigo-400 text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-700">
                ${producto.categoriaNombre || 'Tecnología'}
            </span>

            <!-- Badge de Stock -->
            <span class="absolute top-3 right-3 text-xs font-semibold px-2.5 py-1 rounded-lg backdrop-blur-md ${
                producto.stock > 5 
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30' 
                    : producto.stock > 0 
                        ? 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
                        : 'bg-rose-950/80 text-rose-300 border border-rose-500/30'
            }">
                ${producto.stock > 0 ? `${producto.stock} disponibles` : 'Agotado'}
            </span>
        </div>

        <!-- Contenido -->
        <div class="flex-1 p-5 flex flex-col justify-between">
            <div>
                <a href="/producto.html?id=${producto.id}" class="block group-hover:text-indigo-400 transition-colors">
                    <h3 class="text-base font-bold text-white line-clamp-1">${producto.nombre}</h3>
                </a>
                <p class="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                    ${producto.descripcion || 'Sin descripción disponible'}
                </p>
            </div>

            <!-- Precio y Botón -->
            <div class="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <div>
                    <span class="text-xs text-slate-500 block">Precio</span>
                    <span class="text-lg font-black text-white">${precioFormateado}</span>
                </div>

                <div class="flex space-x-2">
                    <a href="/producto.html?id=${producto.id}" class="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors title='Ver detalle'">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                    </a>

                    <button 
                        class="add-btn p-2.5 rounded-xl ${
                            tieneStock 
                                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20' 
                                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                        } transition-all duration-200"
                        ${tieneStock ? '' : 'disabled'}
                        title="${tieneStock ? 'Agregar al carrito' : 'Sin stock'}"
                    >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                        </svg>
                    </button>
                </div>
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
