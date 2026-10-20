const footerContent = `
    <div class="elx-footer-top">
        <div class="elx-container elx-footer-features">
            <div class="elx-feature-box"><div><h4 class="elx-feature-title">Garantía Asegurada</h4><p class="elx-feature-desc">12 meses de soporte oficial de fábrica.</p></div></div>
            <div class="elx-feature-box"><div><h4 class="elx-feature-title">Despacho Rápido</h4><p class="elx-feature-desc">Envíos gratis a todo el Perú en compras &gt; S/ 199.</p></div></div>
            <div class="elx-feature-box"><div><h4 class="elx-feature-title">Chat en Vivo</h4><p class="elx-feature-desc">Atención personalizada con asesores.</p></div></div>
        </div>
    </div>
    <div class="fx-directory">
        <div class="fx-container fx-dir-grid">
            <div class="fx-dir-col">
                <h3>Comprar</h3>
                <a href="/productos.html?categoria=Televisores">Televisores</a>
                <a href="/productos.html?categoria=Smartphones">Smartphones</a>
                <a href="/productos.html?categoria=Laptops">Portátiles</a>
                <a href="/productos.html?categoria=Audio">Equipo de Sonido</a>
                <a href="/productos.html?categoria=Accesorios">Accesorios y PC</a>
                <h3>Descubre</h3>
                <a href="/productos.html?ofertas=true">Ofertas</a>
                <a href="/productos.html?orden=recientes">Más vendidos</a>
                <a href="/productos.html">Recomendados</a>
            </div>
            <div class="fx-dir-col">
                <h3>Cuenta</h3>
                <a href="/mis-pedidos.html">Mis pedidos</a>
                <a href="/login.html">Iniciar sesión</a>
                <a href="/registro.html">Regístrate</a>
                <a href="/carrito.html">Carrito</a>
            </div>
            <div class="fx-dir-col">
                <h3>Tienda</h3>
                <a href="/informacion.html#tiendas">Nuestras tiendas</a>
                <a href="/informacion.html#garantia">Garantía oficial</a>
                <a href="/informacion.html#despachos">Despachos</a>
                <a href="/informacion.html#chat">Chat en vivo</a>
                <h3>Ayuda</h3>
                <a href="/informacion.html#soporte">Soporte</a>
                <a href="/informacion.html#contacto">Contacto</a>
            </div>
            <div class="fx-dir-col">
                <h3>Electronix</h3>
                <a href="/index.html">Inicio</a>
                <a href="/productos.html">Productos</a>
                <a href="/productos.html?orden=recientes">Populares</a>
                <a href="/informacion.html#empresas">Empresas</a>
            </div>
        </div>
        <div class="fx-container"><div class="fx-foot-legal">
            <span>Copyright © 2026 ELECTRONIX. Todos los derechos reservados.</span><span class="fx-foot-sep" aria-hidden="true">|</span>
            <a href="/informacion.html#privacidad">Política de privacidad</a><span class="fx-foot-sep" aria-hidden="true">|</span>
            <a href="/informacion.html#terminos">Términos de uso</a><span class="fx-foot-sep" aria-hidden="true">|</span>
            <a href="/informacion.html#devoluciones">Ventas y devoluciones</a><span class="fx-foot-sep" aria-hidden="true">|</span>
            <a href="/informacion.html#mapa">Mapa del sitio</a><span class="fx-foot-country">Perú</span>
        </div></div>
    </div>`;

document.querySelectorAll('[data-site-footer]').forEach(footer => {
    footer.className = 'fx-footer';
    footer.innerHTML = footerContent;
});
