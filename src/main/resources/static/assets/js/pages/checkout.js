import { api } from '/assets/js/api.js';
        import { auth } from '/assets/js/auth.js';
        import { cart } from '/assets/js/cart.js';
        import { renderNavbar } from '/assets/js/ui/navbar.js';
        import { showToast } from '/assets/js/ui/toast.js';

        const PAY_PANELS = {
            TARJETA_CREDITO: 'pay-card-panel',
            YAPE: 'pay-yape-panel',
            PLIN: 'pay-plin-panel',
            PAGO_CONTRAENTREGA: null
        };

        renderNavbar();

        if (!auth.protegerRutaAutenticada()) {
            // Guard
        } else {
            initCheckout();
        }

        function metodoSeleccionado() {
            const checked = document.querySelector('input[name="paymethod"]:checked');
            return checked ? checked.value : 'PAGO_CONTRAENTREGA';
        }

        function pintarMetodo() {
            // Solo se muestra/oculta el panel de cada método.
            // El único indicador visual es el circulito del radio (accent-color).
            const actual = metodoSeleccionado();
            Object.entries(PAY_PANELS).forEach(([metodo, panelId]) => {
                if (!panelId) return;
                const panel = document.getElementById(panelId);
                if (!panel) return;
                panel.classList.toggle('hidden', metodo !== actual);
            });
        }

        function soloDigitos(valor) {
            return String(valor || '').replace(/\D/g, '');
        }

        function validarTelefono(valor) {
            return /^[9]\d{8}$/.test(soloDigitos(valor));
        }

        function validarTarjeta() {
            const numero = soloDigitos(document.getElementById('card-number').value);
            const titular = document.getElementById('card-name').value.trim();
            const exp = document.getElementById('card-exp').value.trim();
            const cvv = soloDigitos(document.getElementById('card-cvc').value);
            if (numero.length < 15 || numero.length > 16) return 'Revisa el número de la tarjeta';
            if (titular.length < 3) return 'Ingresa el nombre del titular';
            const m = exp.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
            if (!m) return 'La fecha debe tener formato MM/AA';
            const expDate = new Date(2000 + parseInt(m[2], 10), parseInt(m[1], 10));
            if (expDate <= new Date()) return 'La tarjeta está vencida';
            if (cvv.length < 3) return 'Revisa el CVV';
            return null;
        }

        async function initCheckout() {
            const itemsContainer = document.getElementById('checkout-items');
            const subtotalEl = document.getElementById('checkout-subtotal');
            const totalEl = document.getElementById('checkout-total');
            const btnTotal = document.getElementById('btn-total');
            const form = document.getElementById('checkout-form');
            const confirmBtn = document.getElementById('btn-confirm-order');

            // Selector visual de método de pago
            document.querySelectorAll('input[name="paymethod"]').forEach(radio => {
                radio.addEventListener('change', pintarMetodo);
            });
            pintarMetodo();

            // Formato automático de tarjeta y fecha
            const cardNumber = document.getElementById('card-number');
            if (cardNumber) {
                cardNumber.addEventListener('input', () => {
                    const d = soloDigitos(cardNumber.value).slice(0, 16);
                    cardNumber.value = d.replace(/(\d{4})(?=\d)/g, '$1 ');
                });
            }
            const cardExp = document.getElementById('card-exp');
            if (cardExp) {
                cardExp.addEventListener('input', () => {
                    let d = soloDigitos(cardExp.value).slice(0, 4);
                    cardExp.value = d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d;
                });
            }

            try {
                const datos = await cart.obtenerCarrito();
                if (!datos || !datos.items || datos.items.length === 0) {
                    mostrarVacio('Tu carrito está vacío. Agrega productos primero.');
                    return;
                }

                const totalFormateado = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(datos.total);
                subtotalEl.textContent = totalFormateado;
                totalEl.textContent = totalFormateado;
                btnTotal.textContent = totalFormateado;
                confirmBtn.disabled = false;

                itemsContainer.innerHTML = '';
                datos.items.forEach(item => {
                    const sub = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(item.subtotal);
                    itemsContainer.innerHTML += `
                        <div class="flex justify-between items-center py-2 border-b border-neutral-100">
                            <div>
                                <span class="font-bold text-neutral-900 block text-xs">${item.productoNombre}</span>
                                <span class="text-[11px] text-neutral-500">${item.cantidad} x S/ ${item.precioUnitario}</span>
                            </div>
                            <span class="font-bold text-neutral-900 text-xs">${sub}</span>
                        </div>
                    `;
                });

                form.addEventListener('submit', async (e) => {
                    e.preventDefault();

                    const direccion = document.getElementById('checkout-address').value.trim();
                    const depto = document.getElementById('checkout-depto').value;
                    const prov = document.getElementById('checkout-prov').value.trim();
                    const dist = document.getElementById('checkout-dist').value.trim();
                    const ref = document.getElementById('checkout-ref').value.trim();
                    const telefono = document.getElementById('checkout-phone').value.trim();
                    const metodo = metodoSeleccionado();

                    if (direccion.length < 8) {
                        showToast('Ingresa una dirección de entrega válida', 'warning');
                        return;
                    }
                    if (prov.length < 2 || dist.length < 2) {
                        showToast('Completa la provincia y el distrito', 'warning');
                        return;
                    }
                    if (!validarTelefono(telefono)) {
                        showToast('El teléfono debe tener 9 dígitos y empezar con 9', 'warning');
                        return;
                    }
                    if (metodo === 'TARJETA_CREDITO') {
                        const errTarjeta = validarTarjeta();
                        if (errTarjeta) {
                            showToast(errTarjeta, 'warning');
                            return;
                        }
                    }
                    if (metodo === 'YAPE' && !validarTelefono(document.getElementById('yape-phone').value)) {
                        showToast('Ingresa un celular Yape válido (9 dígitos)', 'warning');
                        return;
                    }
                    if (metodo === 'PLIN' && !validarTelefono(document.getElementById('plin-phone').value)) {
                        showToast('Ingresa un celular Plin válido (9 dígitos)', 'warning');
                        return;
                    }

                    confirmBtn.disabled = true;
                    confirmBtn.innerHTML = `
                        <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Procesando pago (simulado)...</span>
                    `;

                    // Pasarela simulada: pequeña espera como si validara con el banco
                    await new Promise(resolve => setTimeout(resolve, 1600));

                    let direccionEnvio = `${direccion}, ${dist}, ${prov}, ${depto}`;
                    if (ref) direccionEnvio += ` (Ref: ${ref})`;

                    try {
                        const res = await api.post('/api/pedidos', {
                            direccionEnvio: direccionEnvio,
                            telefono: soloDigitos(telefono),
                            metodoPago: metodo
                        });

                        if (res.exito && res.datos) {
                            const extra = metodo === 'PAGO_CONTRAENTREGA' ? ' Pagarás al recibir.' : '';
                            showToast('¡Pedido #' + res.datos.id + ' generado exitosamente!' + extra, 'success');
                            cart.actualizarBadge(0);
                            setTimeout(() => {
                                window.location.href = '/mis-pedidos.html';
                            }, 1400);
                        } else {
                            throw new Error(res.mensaje || 'Error al procesar el pedido');
                        }
                    } catch (err) {
                        showToast(err.message, 'error');
                        confirmBtn.disabled = false;
                        confirmBtn.innerHTML = `
                            <span id="btn-confirm-label">Pagar y generar pedido · <span id="btn-total">${totalFormateado}</span></span>
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                        `;
                    }
                });

            } catch (err) {
                if (err && (err.status === 401 || err.status === 403)) {
                    showToast('Tu sesión expiró. Inicia sesión de nuevo.', 'warning');
                    setTimeout(() => {
                        window.location.href = '/login.html?redirect=' + encodeURIComponent('/checkout.html');
                    }, 1000);
                    return;
                }
                mostrarVacio('No pudimos cargar tu carrito: ' + err.message, true);
            }
        }

        function mostrarVacio(mensaje, esError = false) {
            const form = document.getElementById('checkout-form');
            const summary = document.getElementById('checkout-summary');
            if (form) form.classList.add('hidden');
            if (summary) summary.classList.add('hidden');
            let box = document.getElementById('checkout-empty');
            if (!box) {
                box = document.createElement('div');
                box.id = 'checkout-empty';
                box.className = 'md:col-span-5 bg-white rounded-2xl p-12 text-center border border-neutral-200 shadow-sm';
                const grid = form ? form.parentElement : null;
                if (grid) grid.appendChild(box);
            }
            box.innerHTML = `
                <svg class="w-12 h-12 ${esError ? 'text-rose-400' : 'text-neutral-300'} mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                <h2 class="text-lg font-extrabold text-neutral-900 mb-1">${esError ? 'Algo salió mal' : 'Tu carrito está vacío'}</h2>
                <p class="text-xs text-neutral-500 mb-6">${mensaje}</p>
                <div class="flex items-center justify-center gap-3">
                    ${esError ? '<button onclick="window.location.reload()" class="px-5 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold transition-colors">Reintentar</button>' : ''}
                    <a href="/productos.html" class="px-5 py-2.5 rounded-xl bg-[#3564C9] hover:bg-[#2A51A5] text-white text-xs font-bold transition-colors">Explorar productos</a>
                </div>
            `;
            box.classList.remove('hidden');
            showToast(mensaje, esError ? 'error' : 'warning');
        }
