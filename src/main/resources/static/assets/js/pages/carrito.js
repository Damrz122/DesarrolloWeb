import { auth } from '/assets/js/auth.js';
import { formatoMoneda } from '/assets/js/money.js';
        import { cart } from '/assets/js/cart.js';
        import { renderNavbar } from '/assets/js/ui/navbar.js';

        renderNavbar();

        const container = document.getElementById('cart-content-container');

        async function cargarVistaCarrito() {
            if (!auth.isAuthenticated()) {
                container.innerHTML = `
                    <div class="col-span-full flex items-center justify-center min-h-[52vh]">
                    <div class="bg-white rounded-2xl p-12 text-center max-w-xl w-full border border-neutral-200 shadow-md">
                        <svg class="w-12 h-12 text-neutral-900 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                        <h2 class="text-xl font-bold text-neutral-900 mb-2">Inicia sesión para ver tu carrito</h2>
                        <p class="text-xs text-neutral-500 mb-6">Guarda tus productos favoritos y sincroniza tu pedido desde cualquier dispositivo.</p>
                        <a href="/login.html?redirect=/carrito.html" class="inline-flex items-center px-6 py-3 rounded-xl bg-[#3564C9] hover:bg-[#2A51A5] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md">
                            Iniciar Sesión
                        </a>
                    </div>
                    </div>
                `;
                return;
            }

            try {
                const datos = await cart.obtenerCarrito();

                if (!datos || !datos.items || datos.items.length === 0) {
                    container.innerHTML = `
                        <div class="col-span-full bg-white rounded-2xl p-12 text-center max-w-xl mx-auto border border-neutral-200 shadow-md">
                            <div class="w-16 h-16 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto mb-4">
                                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                            </div>
                            <h2 class="text-xl font-bold text-neutral-900 mb-2">Tu carrito está vacío</h2>
                            <p class="text-xs text-neutral-500 mb-6">Aún no has agregado ningún producto a tu orden.</p>
                            <a href="/index.html" class="inline-flex items-center px-6 py-3 rounded-xl bg-[#3564C9] hover:bg-[#2A51A5] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md">
                                Explorar Catálogo
                            </a>
                        </div>
                    `;
                    return;
                }

                const moneda = datos.monedaCodigo || 'PEN';
                const formato = valor => formatoMoneda(valor,moneda);
                const totalFormateado = formato(datos.total);

                let itemsHTML = '';
                datos.items.forEach(item => {
                    const precioUnit = formato(item.precioUnitario);
                    const subtotal = formato(item.subtotal);
                    const fallbackImg = 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=600&auto=format&fit=crop&q=80';

                    itemsHTML += `
                        <div class="flex flex-col sm:flex-row items-center justify-between p-4 sm:p-5 bg-white rounded-2xl border border-neutral-200 gap-4 shadow-sm" id="cart-row-${item.id}">
                            <div class="flex items-center space-x-4 w-full sm:w-auto">
                                <img src="${item.imagenUrl || fallbackImg}" alt="${item.productoNombre}" class="w-18 h-18 sm:w-20 sm:h-20 rounded-xl object-contain bg-neutral-50 border border-neutral-200 p-1 flex-shrink-0" onerror="this.src='${fallbackImg}'">
                                <div>
                                    <a href="/producto.html?id=${item.productoId}" class="font-bold text-neutral-900 hover:text-[#3564C9] text-sm sm:text-base line-clamp-1">
                                        ${item.productoNombre}
                                    </a>
                                    <span class="text-xs text-neutral-500 block mt-1">Precio unitario: ${precioUnit}</span>
                                </div>
                            </div>

                            <div class="flex items-center justify-between w-full sm:w-auto sm:space-x-6">
                                <div class="flex items-center border border-neutral-300 bg-neutral-50 rounded-xl p-1">
                                    <button class="btn-item-minus w-8 h-8 rounded-lg bg-white hover:bg-neutral-200 text-neutral-800 font-bold flex items-center justify-center transition-colors shadow-sm" data-id="${item.id}" data-cant="${item.cantidad}">
                                        -
                                    </button>
                                    <span class="w-10 text-center text-sm font-bold text-neutral-900">${item.cantidad}</span>
                                    <button class="btn-item-plus w-8 h-8 rounded-lg bg-white hover:bg-neutral-200 text-neutral-800 font-bold flex items-center justify-center transition-colors shadow-sm" data-id="${item.id}" data-cant="${item.cantidad}">
                                        +
                                    </button>
                                </div>

                                <div class="text-right min-w-[90px]">
                                    <span class="text-[10px] text-neutral-400 font-bold block uppercase">Subtotal</span>
                                    <span class="text-base font-black text-neutral-900">${subtotal}</span>
                                </div>

                                <button class="btn-item-remove p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors" data-id="${item.id}" title="Eliminar del carrito">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                            </div>
                        </div>
                    `;
                });

                container.innerHTML = `
                    <div class="lg:col-span-2 space-y-4">
                        ${itemsHTML}
                        <div class="flex justify-between items-center pt-2">
                            <a href="/index.html" class="inline-flex items-center space-x-1.5 text-xs font-bold text-[#3564C9] hover:underline">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                                <span>Continuar comprando</span>
                            </a>
                        </div>
                    </div>

                    <div class="bg-white p-6 rounded-2xl border border-neutral-200 shadow-md space-y-6">
                        <h2 class="text-base font-black text-neutral-900 border-b border-neutral-100 pb-3 uppercase">Resumen de la Orden</h2>

                        <div class="space-y-3 text-sm">
                            <div class="flex justify-between text-neutral-600 text-xs">
                                <span>Ítems totales</span>
                                <span class="font-bold text-neutral-900">${datos.cantidadTotal} unidades</span>
                            </div>
                            <div class="flex justify-between text-neutral-600 text-xs">
                                <span>Costo de envío</span>
                                <span class="font-bold text-emerald-600">Gratis</span>
                            </div>
                            <div class="border-t border-neutral-200 pt-3 flex justify-between items-baseline">
                                <span class="text-sm font-bold text-neutral-800 uppercase">Total a pagar</span>
                                <span class="text-2xl font-black text-neutral-900">${totalFormateado}</span>
                            </div>
                        </div>

                        <a href="/checkout.html" class="w-full bg-[#3564C9] hover:bg-[#2A51A5] text-white font-bold py-3.5 px-6 rounded-xl shadow-md flex items-center justify-center space-x-2 transition-all">
                            <span>Proceder al Checkout</span>
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                        </a>

                        <div class="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-[11px] text-neutral-500 flex items-center justify-center space-x-1.5 text-center">
                            <svg class="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                            <span>Compra segura garantizada en Electronix.</span>
                        </div>
                    </div>
                `;

                container.querySelectorAll('.btn-item-minus').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const id = btn.dataset.id;
                        const cant = parseInt(btn.dataset.cant);
                        if (cant > 1) {
                            await cart.actualizarCantidad(id, cant - 1);
                            cargarVistaCarrito();
                        } else {
                            await cart.removerItem(id);
                            cargarVistaCarrito();
                        }
                    });
                });

                container.querySelectorAll('.btn-item-plus').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const id = btn.dataset.id;
                        const cant = parseInt(btn.dataset.cant);
                        await cart.actualizarCantidad(id, cant + 1);
                        cargarVistaCarrito();
                    });
                });

                container.querySelectorAll('.btn-item-remove').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const id = btn.dataset.id;
                        await cart.removerItem(id);
                        cargarVistaCarrito();
                    });
                });

            } catch (err) {
                container.innerHTML = `<div class="col-span-full py-12 text-center text-rose-600 font-bold">Error al cargar carrito: ${err.message}</div>`;
            }
        }

        cargarVistaCarrito();
