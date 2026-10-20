import { api } from '/assets/js/api.js';
import { formatoMoneda } from '/assets/js/money.js';
        import { auth } from '/assets/js/auth.js';
        import { renderAdminShell } from '/assets/js/ui/adminShell.js?v=2';
        import { showToast } from '/assets/js/ui/toast.js';
        import { renderPager, swapSuave } from '/assets/js/ui/pager.js?v=2';

        // NOTA: referencias DOM primero (evita TDZ si init las toca antes del await).
        const tbody = document.getElementById('productos-table-body');
        const modal = document.getElementById('producto-modal');
        const modalClose = document.getElementById('modal-close');
        const btnCancelar = document.getElementById('btn-cancelar-modal');
        const btnNuevo = document.getElementById('btn-nuevo-producto');
        const form = document.getElementById('producto-form');
        const selectCat = document.getElementById('prod-categoria');
        const modalTitle = document.getElementById('modal-title');
        const inputImagen = document.getElementById('prod-imagen');
        const imgTile = document.getElementById('prod-img-tile');
        const imgPrev = document.getElementById('prod-img-prev');
        const imgVacio = document.getElementById('prod-img-vacio');
        const imgPicker = document.getElementById('prod-img-picker');
        const imgUrl = document.getElementById('prod-img-url');
        const imgFile = document.getElementById('prod-img-file');
        const imgDrop = document.getElementById('prod-img-drop');
        const imgEstado = document.getElementById('prod-img-estado');

        let listaCategorias = [];

        // paginacion: 10 por pagina
        const pager = document.getElementById('productos-pager');
        const TAMANO_PAGINA = 10;
        let paginaActual = 0;

        renderAdminShell('productos');

        if (!auth.protegerRutaAdmin()) {
            // Guard
        } else {
            initProductosAdmin();
        }

        function esc(value) {
            return String(value ?? '')
                .replace(/&/g, '&amp;').replace(/</g, '&lt;')
                .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        // modal scroll: bloquea el scroll del fondo mientras el formulario esta abierto
        function bloquearFondo(bloquear) {
            document.body.style.overflow = bloquear ? 'hidden' : '';
        }

        async function initProductosAdmin() {
            btnNuevo.hidden = !(auth.tienePermiso('PRODUCTOS_GESTIONAR') && auth.tienePermiso('PRECIOS_GESTIONAR'));
            await cargarCategoriasSelect();
            await cargarMonedasSelect();
            await cargarTablaProductos(0);

            btnNuevo.addEventListener('click', () => {
                abrirModalCrear();
            });

            modalClose.addEventListener('click', () => { modal.classList.add('hidden'); bloquearFondo(false); });
            btnCancelar.addEventListener('click', () => { modal.classList.add('hidden'); bloquearFondo(false); });
            document.getElementById('prod-etiqueta').addEventListener('change', alternarPrecioOferta);
            initImgPicker();

            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await guardarProducto();
            });
        }

        async function cargarMonedasSelect() {
            const select = document.getElementById('prod-moneda');
            try {
                const res = await api.get('/api/monedas');
                const monedas = (res.exito ? res.datos : []).filter(m => m.activa);
                select.innerHTML = monedas.map(m => `<option value="${esc(m.codigo)}">${esc(m.codigo)} · ${esc(m.nombre)}</option>`).join('');
            } catch (err) { select.innerHTML = '<option value="PEN">PEN</option>'; }
        }

        function pintarTileProd() {
            const v = (inputImagen.value || '').trim();
            if (v) {
                imgPrev.src = v;
                imgPrev.hidden = false;
                imgVacio.hidden = true;
            } else {
                imgPrev.removeAttribute('src');
                imgPrev.hidden = true;
                imgVacio.hidden = false;
            }
        }

        async function subirImagenProd(file) {
            if (!file) return;
            if (file.size > 5 * 1024 * 1024) throw new Error('El archivo supera los 5MB');
            const fd = new FormData();
            fd.append('archivo', file);
            const token = api.getToken();
            const res = await fetch('/api/sitio/uploads', {
                method: 'POST',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                body: fd
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) throw new Error((data && data.mensaje) || `Error subiendo (${res.status})`);
            const url = data && data.datos && data.datos.url;
            if (!url) throw new Error('Respuesta inválida del servidor');
            return url;
        }

        function initImgPicker() {
            const tabs = imgPicker.querySelectorAll('[data-ptab]');
            const panels = imgPicker.querySelectorAll('[data-ppanel]');
            tabs.forEach(tab => tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('is-active'));
                tab.classList.add('is-active');
                panels.forEach(p => { p.hidden = p.dataset.ppanel !== tab.dataset.ptab; });
            }));

            imgTile.addEventListener('click', (e) => {
                e.stopPropagation();
                imgPicker.hidden = !imgPicker.hidden;
                if (!imgPicker.hidden) {
                    imgUrl.value = inputImagen.value || '';
                    imgEstado.textContent = '';
                    setTimeout(() => imgUrl.focus(), 30);
                }
            });
            imgPicker.addEventListener('click', (e) => e.stopPropagation());
            document.addEventListener('click', () => { if (!modal.classList.contains('hidden')) imgPicker.hidden = true; });

            document.getElementById('prod-img-usar').addEventListener('click', () => {
                if (!imgUrl.value.trim()) {
                    showToast('Pega primero una URL', 'error');
                    return;
                }
                inputImagen.value = imgUrl.value.trim();
                pintarTileProd();
                showToast('Imagen actualizada. Pulsa Listo.', 'success');
            });
            imgUrl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); document.getElementById('prod-img-usar').click(); }
            });

            const subir = async (file) => {
                if (!file) return;
                imgEstado.textContent = 'Subiendo…';
                try {
                    const url = await subirImagenProd(file);
                    inputImagen.value = url;
                    imgUrl.value = url;
                    pintarTileProd();
                    imgEstado.textContent = 'Subido: ' + url;
                    showToast('Imagen subida correctamente', 'success');
                } catch (err) {
                    imgEstado.textContent = '';
                    showToast(err.message, 'error');
                }
            };
            imgDrop.addEventListener('click', () => imgFile.click());
            imgFile.addEventListener('change', async () => { await subir(imgFile.files && imgFile.files[0]); imgFile.value = ''; });
            ['dragenter', 'dragover'].forEach(ev => imgDrop.addEventListener(ev, (e) => { e.preventDefault(); imgDrop.classList.add('is-drag'); }));
            ['dragleave', 'drop'].forEach(ev => imgDrop.addEventListener(ev, (e) => { e.preventDefault(); imgDrop.classList.remove('is-drag'); }));
            imgDrop.addEventListener('drop', async (e) => {
                await subir(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]);
            });

            document.getElementById('prod-img-quitar').addEventListener('click', () => {
                inputImagen.value = '';
                imgUrl.value = '';
                pintarTileProd();
                imgPicker.hidden = true;
            });
            document.getElementById('prod-img-listo').addEventListener('click', () => { imgPicker.hidden = true; });
        }

        async function cargarCategoriasSelect() {
            try {
                const res = await api.get('/api/categorias');
                if (res.exito && res.datos) {
                    listaCategorias = res.datos;
                    selectCat.innerHTML = '<option value="">Selecciona una categoría</option>';
                    listaCategorias.forEach(c => {
                        const opt = document.createElement('option');
                        opt.value = c.id;
                        opt.textContent = c.nombre;
                        selectCat.appendChild(opt);
                    });
                }
            } catch (err) {
                console.error(err);
            }
        }

        async function cargarTablaProductos(pagina = paginaActual) {
            paginaActual = Math.max(0, pagina);
            try {
                const res = await api.get(`/api/productos/admin?page=${paginaActual}&size=${TAMANO_PAGINA}`);
                const datos = (res.exito && res.datos) ? res.datos : null;
                const lista = (datos && datos.contenido) ? datos.contenido : [];
                const totalPaginas = (datos && datos.totalPaginas) ? datos.totalPaginas : 0;

                await swapSuave(tbody, () => pintarFilas(lista));
                renderPager(pager, { pagina: paginaActual, totalPaginas, onPage: p => cargarTablaProductos(p) });
            } catch (err) {
                const msg = esc(err.message);
                await swapSuave(tbody, () => {
                    tbody.innerHTML = `<tr><td colspan="7" class="adm-err">Error: ${msg}</td></tr>`;
                });
            }
        }

        function pintarFilas(lista) {
            tbody.innerHTML = '';

            if (lista.length > 0) {
                lista.forEach(p => {
                        const precio = formatoMoneda(p.precio, p.monedaCodigo);
                        const esOferta = String(p.etiqueta || '').toUpperCase() === 'OFERTA' && Number(p.precioOferta) > 0;
                        const precioOferta = esOferta
                            ? formatoMoneda(p.precioOferta, p.monedaCodigo)
                            : null;
                        const fallback = 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=600&auto=format&fit=crop&q=80';

                        const tr = document.createElement('tr');
                        const etiqueta = String(p.etiqueta || '').toUpperCase();
                        const etiquetaTxt = etiqueta === 'NUEVO' ? 'Nuevo' : etiqueta === 'OFERTA' ? 'Oferta' : etiqueta === 'TENDENCIA' ? 'Tendencia' : '—';
                        tr.innerHTML = `
                            <td>
                                <div class="adm-prod">
                                    <img src="${esc(p.imagenUrl) || fallback}" alt="" onerror="this.src='${fallback}'" />
                                    <div>
                                        <div class="adm-strong">${esc(p.nombre)}</div>
                                        <div class="adm-sub">ID: #${p.id}</div>
                                    </div>
                                </div>
                            </td>
                            <td>${esc(p.categoriaNombre) || 'Sin categoría'}</td>
                            <td class="adm-strong">${esOferta ? `${precioOferta} <small class="adm-sub">(<s>${precio}</s>)</small>` : precio}</td>
                            <td>
                                <span class="${p.stock <= 5 ? 'adm-stock-low' : 'adm-strong'}">
                                    ${p.stock} uds.
                                </span>
                            </td>
                            <td>${etiquetaTxt}</td>
                            <td>
                                <span class="adm-badge ${p.activo ? 'b-ok' : 'b-off'}">
                                    ${p.activo ? 'Activo' : 'Inactivo'}
                                </span>
                            </td>
                            <td class="num adm-celda-num">
                                <button class="adm-btn adm-btn-edit adm-btn-sm btn-editar">Editar</button>
                                ${p.activo ? `<button class="adm-btn adm-btn-del adm-btn-sm btn-eliminar">Desactivar</button>` : ''}
                            </td>
                        `;

                        tr.querySelector('.btn-editar').hidden = !(auth.tienePermiso('PRODUCTOS_GESTIONAR') && auth.tienePermiso('PRECIOS_GESTIONAR'));
                        tr.querySelector('.btn-editar').addEventListener('click', () => abrirModalEditar(p));
                        if(auth.tienePermiso('INVENTARIO_GESTIONAR')) {
                            const stockBtn=document.createElement('button');stockBtn.className='adm-btn adm-btn-sm';stockBtn.textContent='Stock';
                            stockBtn.onclick=async()=>{const valor=prompt('Nuevo stock para '+p.nombre,p.stock);if(valor===null)return;if(!/^\d+$/.test(valor)){showToast('Ingresa un entero no negativo','warning');return;}try{await api.patch(`/api/productos/${p.id}/stock`,{stock:Number(valor)});await cargarTablaProductos();}catch(e){showToast(e.message,'error');}};
                            tr.querySelector('.num').append(stockBtn);
                        }
                        const btnElim = tr.querySelector('.btn-eliminar');
                        if (btnElim) {
                            btnElim.hidden = !auth.tienePermiso('PRODUCTOS_GESTIONAR');
                            btnElim.addEventListener('click', () => desactivarProducto(p.id, p.nombre));
                        }

                        tbody.appendChild(tr);
                    });
                } else {
                    tbody.innerHTML = `<tr><td colspan="7" class="adm-empty">No hay productos registrados.</td></tr>`;
                }
        }

        function alternarPrecioOferta() {
            const esOferta = document.getElementById('prod-etiqueta').value === 'OFERTA';
            document.getElementById('prod-oferta-wrap').hidden = !esOferta;
            if (!esOferta) document.getElementById('prod-precio-oferta').value = '';
        }

        function abrirModalCrear() {
            modalTitle.textContent = 'Nuevo producto';
            document.getElementById('prod-id').value = '';
            document.getElementById('prod-nombre').value = '';
            document.getElementById('prod-categoria').value = '';
            document.getElementById('prod-precio').value = '';
            document.getElementById('prod-moneda').value = 'PEN';
            document.getElementById('prod-stock').value = '';
            document.getElementById('prod-imagen').value = '';
            document.getElementById('prod-etiqueta').value = '';
            document.getElementById('prod-precio-oferta').value = '';
            document.getElementById('prod-oferta-wrap').hidden = true;
            document.getElementById('prod-descripcion').value = '';
            pintarTileProd();
            imgPicker.hidden = true;
            modal.classList.remove('hidden');
            bloquearFondo(true);
        }

        function abrirModalEditar(p) {
            modalTitle.textContent = 'Editar producto #' + p.id;
            document.getElementById('prod-id').value = p.id;
            document.getElementById('prod-nombre').value = p.nombre;
            document.getElementById('prod-categoria').value = p.categoriaId;
            document.getElementById('prod-precio').value = p.precio;
            document.getElementById('prod-moneda').value = p.monedaCodigo || 'PEN';
            document.getElementById('prod-stock').value = p.stock;
            document.getElementById('prod-imagen').value = p.imagenUrl || '';
            document.getElementById('prod-etiqueta').value = p.etiqueta || '';
            document.getElementById('prod-precio-oferta').value = p.precioOferta ?? '';
            alternarPrecioOferta();
            document.getElementById('prod-descripcion').value = p.descripcion || '';
            pintarTileProd();
            imgPicker.hidden = true;
            modal.classList.remove('hidden');
            bloquearFondo(true);
        }

        async function guardarProducto() {
            const id = document.getElementById('prod-id').value;
            const etiqueta = document.getElementById('prod-etiqueta').value || null;
            const precio = parseFloat(document.getElementById('prod-precio').value);
            let precioOferta = null;
            if (etiqueta === 'OFERTA') {
                const raw = document.getElementById('prod-precio-oferta').value;
                precioOferta = raw === '' ? null : parseFloat(raw);
                if (precioOferta == null || !(precioOferta > 0)) {
                    showToast('La etiqueta Oferta requiere un precio de oferta mayor a 0', 'error');
                    return;
                }
                if (precioOferta >= precio) {
                    showToast('El precio de oferta debe ser menor al precio base', 'error');
                    return;
                }
            }
            const payload = {
                nombre: document.getElementById('prod-nombre').value.trim(),
                categoriaId: parseInt(document.getElementById('prod-categoria').value),
                precio,
                monedaCodigo: document.getElementById('prod-moneda').value,
                stock: parseInt(document.getElementById('prod-stock').value),
                imagenUrl: document.getElementById('prod-imagen').value.trim(),
                etiqueta,
                precioOferta,
                descripcion: document.getElementById('prod-descripcion').value.trim()
            };

            try {
                if (id) {
                    await api.put(`/api/productos/${id}`, payload);
                    showToast('Producto actualizado exitosamente', 'success');
                } else {
                    await api.post('/api/productos', payload);
                    showToast('Producto creado exitosamente', 'success');
                }
                modal.classList.add('hidden');
                bloquearFondo(false);
                // creado: vuelve a la primera pagina para verlo; editado: se queda
                cargarTablaProductos(id ? paginaActual : 0);
            } catch (err) {
                showToast(err.message, 'error');
            }
        }

        async function desactivarProducto(id, nombre) {
            if (!confirm(`¿Estás seguro de desactivar el producto "${nombre}"? No aparecerá en el catálogo público.`)) {
                return;
            }
            try {
                await api.delete(`/api/productos/${id}`);
                showToast('Producto desactivado correctamente', 'info');
                // si era el ultimo de la pagina, retrocede una
                if (tbody.querySelectorAll('tr').length <= 1 && paginaActual > 0) paginaActual -= 1;
                cargarTablaProductos(paginaActual);
            } catch (err) {
                showToast(err.message, 'error');
            }
        }
