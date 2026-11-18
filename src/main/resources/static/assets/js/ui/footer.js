const gruposFooter = [
    ['Explora Electronix', [
        ['Catálogo completo', '/productos.html'],
        ['Portátiles y computadoras', '/productos.html?categoria=Laptops%20y%20Computadoras'],
        ['Smartphones', '/productos.html?categoria=Smartphones'],
        ['Audio y sonido', '/productos.html?categoria=Audio%20y%20Sonido'],
        ['Periféricos', '/productos.html?categoria=Perif%C3%A9ricos'],
        ['Monitores', '/productos.html?categoria=Monitores'],
        ['Novedades', '/productos.html?orden=recientes'],
        ['Ofertas', '/productos.html?ofertas=true']
    ]],
    ['Tu cuenta', [
        ['Mi cuenta', '/login.html'], ['Crear una cuenta', '/registro.html'],
        ['Mis pedidos', '/mis-pedidos.html'], ['Electronix Club', '/puntos.html'],
        ['Mi carrito', '/carrito.html']
    ]],
    ['Podemos ayudarte', [
        ['Envíos y despachos', '/informacion.html#despachos'],
        ['Garantía', '/informacion.html#garantia'],
        ['Cambios y devoluciones', '/informacion.html#devoluciones'],
        ['Asesoría en línea', '/informacion.html#chat'],
        ['Soporte', '/informacion.html#soporte'], ['Contacto', '/informacion.html#contacto']
    ]],
    ['Sobre Electronix', [
        ['Nuestra tienda', '/informacion.html#tiendas'],
        ['Compras para empresas', '/informacion.html#empresas'],
        ['Mapa del sitio', '/informacion.html#mapa']
    ]]
];

const footerContent = `
    <div class="fx-footer-inner">
        <div class="store-footer-intro">
            <a class="store-footer-brand" href="/index.html" aria-label="Electronix — Inicio">
                <img src="/assets/img/logo.svg" class="store-footer-logo" alt="" width="24" height="24">
                <span data-site-name>ELECTRONIX</span>
            </a>
            <p>Tecnología para tu día a día.</p>
            <a class="store-text-link" href="/informacion.html">Visitar el centro de ayuda</a>
        </div>
        <nav class="fx-dir-grid" aria-label="Directorio de la tienda">
            ${gruposFooter.map(([titulo, enlaces]) => `
                <div class="fx-dir-col"><details class="fx-dir-group" open>
                    <summary><span class="fx-dir-heading">${titulo}</span></summary>
                    <ul>${enlaces.map(([texto, url]) => `<li><a href="${url}">${texto}</a></li>`).join('')}</ul>
                </details></div>`).join('')}
        </nav>
        <p class="store-footer-note">Antes de comprar, consulta la <a href="/informacion.html#garantia">garantía</a> y las <a href="/informacion.html#despachos">condiciones de despacho</a> aplicables a tu pedido.</p>
        <div class="fx-foot-legal">
            <span class="fx-foot-copyright">© ${new Date().getFullYear()} ELECTRONIX. Todos los derechos reservados.</span>
            <nav class="fx-foot-policies" aria-label="Información legal">
                <a href="/informacion.html#privacidad">Privacidad</a>
                <a href="/informacion.html#terminos">Términos de uso</a>
                <a href="/informacion.html#devoluciones">Devoluciones</a>
            </nav>
            <span class="fx-foot-country" id="fx-footer-country">Perú</span>
        </div>
    </div>`;

document.querySelectorAll('[data-site-footer]').forEach(footer => {
    footer.className = 'fx-footer';
    footer.innerHTML = footerContent;
    try {
        const pais = JSON.parse(localStorage.getItem('elx-country') || 'null');
        if (pais && pais.name) footer.querySelector('.fx-foot-country').textContent = pais.name;
    } catch { /* Mantener Perú si no hay preferencia guardada. */ }
    const mobile = window.matchMedia('(max-width: 640px)');
    const grupos = footer.querySelectorAll('.fx-dir-group');
    function ajustarDirectorio() {
        grupos.forEach(grupo => {
            grupo.open = !mobile.matches;
            grupo.querySelector('summary').tabIndex = mobile.matches ? 0 : -1;
        });
    }
    grupos.forEach(grupo => {
        grupo.querySelector('summary').addEventListener('click', event => {
            if (!mobile.matches) event.preventDefault();
        });
    });
    mobile.addEventListener('change', ajustarDirectorio);
    ajustarDirectorio();
});
