// fx-header.js — Mega menú Categorías + panel Búsqueda estilo Apple + país + slider.
// Script compartido (home, login, producto...). Todo con guards: si un bloque
// no existe en la página, se omite sin romper nada. Sin dependencias.
(function () {
    var nav = document.querySelector('.fx-navbar');
    var catWrap = document.getElementById('nav-cat-wrap');
    var catTrigger = document.getElementById('nav-cat-trigger');
    var mega = document.getElementById('nav-mega');
    var searchToggle = document.getElementById('nav-search-toggle');
    var searchPanel = document.getElementById('nav-search-panel');
    var searchInput = document.getElementById('nav-search-input');
    var searchClose = document.getElementById('nav-search-close');
    var backdrop = document.getElementById('nav-backdrop');
    if (!nav) return;

    function isMegaOpen() { return nav.classList.contains('mega-open'); }
    function isSearchOpen() { return nav.classList.contains('search-open'); }
    function closeMega() {
        nav.classList.remove('mega-open');
        if (mega) mega.setAttribute('aria-hidden', 'true');
        if (catTrigger) catTrigger.setAttribute('aria-expanded', 'false');
        if (!isSearchOpen() && backdrop) backdrop.classList.remove('open');
    }
    function closeSearch() {
        if (!isSearchOpen()) return;
        travelSeq++; // invalida cualquier viaje en curso
        nav.classList.remove('search-open');
        nav.classList.remove('search-landed');
        nav.classList.remove('search-travel');
        if (searchPanel) searchPanel.setAttribute('aria-hidden', 'true');
        if (inlineWrap) inlineWrap.setAttribute('aria-hidden', 'true');
        if (inlineInput) { inlineInput.value = ''; inlineInput.blur(); }
        // limpia también el espejo del panel para ocultar las sugerencias
        if (searchInput && searchInput.value !== '') {
            searchInput.value = '';
            var ev;
            try { ev = new Event('input', { bubbles: true }); }
            catch (e) { ev = document.createEvent('Event'); ev.initEvent('input', true, true); }
            searchInput.dispatchEvent(ev);
        }
        if (!isMegaOpen() && backdrop) backdrop.classList.remove('open');
        // la lupita regresa a su sitio deslizándose en horizontal
        var backIcon = inlineWrap ? inlineWrap.querySelector('.fx-inline-icon') : null;
        var gliding = false;
        if (!reduceMotion && searchToggle && backIcon) {
            // mide el origen real: suelta un momento la congelación del viaje de ida
            var prevTransform = searchToggle.style.transform;
            searchToggle.style.transform = '';
            var bt = searchToggle.getBoundingClientRect();
            searchToggle.style.transform = prevTransform;
            var bg = backIcon.getBoundingClientRect();
            var bdx = (bg.left + bg.width / 2) - (bt.left + bt.width / 2);
            if (Math.abs(bdx) > 2) {
                try {
                    searchToggle.style.transform = 'translateX(' + bdx + 'px)';
                    searchToggle.style.opacity = '1';
                    gliding = true;
                    var back = searchToggle.animate(
                        [{ transform: 'translateX(' + bdx + 'px)' }, { transform: 'translateX(0px)' }],
                        { duration: 450, easing: 'cubic-bezier(0.32,0.72,0,1)' }
                    );
                    var backDone = function () {
                        // solo limpia si sigue cerrado: si se reabrió, el viaje nuevo es dueño
                        if (!isSearchOpen() && searchToggle) { searchToggle.style.transform = ''; searchToggle.style.opacity = ''; }
                    };
                    back.onfinish = function () { try { back.cancel(); } catch (e) {} backDone(); };
                    back.oncancel = backDone;
                    setTimeout(function () { try { back.finish(); } catch (e) {} }, 700);
                } catch (e) { gliding = false; }
            }
        }
        if (!gliding && searchToggle) {
            searchToggle.style.transform = '';
            searchToggle.style.opacity = '';
        }
    }
    function closeAll() { closeMega(); closeSearch(); }
    function openMega() {
        closeSearch();
        nav.classList.add('mega-open');
        if (mega) mega.setAttribute('aria-hidden', 'false');
        if (catTrigger) catTrigger.setAttribute('aria-expanded', 'true');
        if (backdrop) backdrop.classList.add('open');
    }
    // Barra de búsqueda que vive DENTRO de la navbar y reemplaza a los links.
    // Se inyecta por JS para no tocar el HTML de las 8 páginas.
    var inlineWrap = null, inlineInput = null, inlineClose = null;
    (function buildInlineSearch() {
        var inner = nav.querySelector('.fx-navbar-inner');
        if (!inner || !searchToggle) return;
        inlineWrap = document.createElement('div');
        inlineWrap.id = 'nav-search-inline';
        inlineWrap.setAttribute('aria-hidden', 'true');
        inlineWrap.innerHTML = '<span class="fx-inline-icon">' + searchToggle.innerHTML + '</span>' +
            '<input id="nav-search-inline-input" type="text" placeholder="Buscar en Electronix" ' +
            'autocomplete="off" aria-label="Buscar en Electronix">' +
            '<button type="button" id="nav-search-inline-close" aria-label="Cerrar búsqueda">' +
            '<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M6 18L18 6M6 6l12 12"></path></svg></button>';
        inner.appendChild(inlineWrap);
        inlineInput = inlineWrap.querySelector('input');
        inlineClose = inlineWrap.querySelector('button');
        try {
            var qp = new URLSearchParams(window.location.search).get('q');
            if (qp) inlineInput.value = qp;
        } catch (e) {}
        // Espeja al input del panel para reusar sugerencias en vivo
        function mirrorToPanel() {
            if (searchInput && searchInput.value !== inlineInput.value) {
                searchInput.value = inlineInput.value;
                var ev;
                try { ev = new Event('input', { bubbles: true }); }
                catch (err) { ev = document.createEvent('Event'); ev.initEvent('input', true, true); }
                searchInput.dispatchEvent(ev);
            }
        }
        inlineInput.addEventListener('input', mirrorToPanel);
        inlineInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                window.location.href = '/productos.html?q=' + encodeURIComponent(inlineInput.value.trim());
            }
        });
        inlineClose.addEventListener('click', function (e) { e.stopPropagation(); closeSearch(); });
    })();

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // LA MISMA lupita viaja en horizontal, con su mismo tamaño, hasta el campo
    // y SE QUEDA ahí como icono del campo (sin relevo con otra copia).
    var travelSeq = 0;
    function travelToggleToInline() {
        var my = ++travelSeq;
        return new Promise(function (resolve) {
            var icon = inlineWrap ? inlineWrap.querySelector('.fx-inline-icon') : null;
            if (reduceMotion || !searchToggle || !icon) {
                nav.classList.add('search-landed');
                resolve();
                return;
            }
            var t = searchToggle.getBoundingClientRect();
            var g = icon.getBoundingClientRect();
            var dx = (g.left + g.width / 2) - (t.left + t.width / 2);
            searchToggle.style.transform = '';
            nav.classList.add('search-travel');
            var anim;
            try {
                anim = searchToggle.animate(
                    [{ transform: 'translateX(0px)' }, { transform: 'translateX(' + dx + 'px)' }],
                    { duration: 550, easing: 'cubic-bezier(0.32,0.72,0,1)' }
                );
            } catch (e) {
                nav.classList.remove('search-travel');
                nav.classList.add('search-landed');
                resolve();
                return;
            }
            anim.onfinish = function () {
                try { anim.cancel(); } catch (e) {}
                if (my !== travelSeq || !isSearchOpen()) { resolve(); return; }
                // se congela en el punto de llegada y ahí se queda como icono del campo
                searchToggle.style.transform = 'translateX(' + dx + 'px)';
                nav.classList.remove('search-travel');
                nav.classList.add('search-landed');
                resolve();
            };
            anim.oncancel = function () {
                if (my === travelSeq) {
                    nav.classList.remove('search-travel');
                    if (isSearchOpen()) nav.classList.add('search-landed');
                }
                resolve();
            };
            setTimeout(function () { try { anim.finish(); } catch (e) {} }, 900);
        });
    }

    function openSearch() {
        if (isSearchOpen()) return;
        closeMega();
        nav.classList.remove('search-landed');
        nav.classList.add('search-open');
        if (searchPanel) searchPanel.setAttribute('aria-hidden', 'false');
        if (inlineWrap) inlineWrap.setAttribute('aria-hidden', 'false');
        if (backdrop) backdrop.classList.add('open');
        travelToggleToInline().then(function () {
            if (inlineInput && isSearchOpen()) inlineInput.focus({ preventScroll: true });
        });
    }

    if (catWrap && catTrigger) {
        catWrap.addEventListener('mouseenter', openMega);
        catTrigger.addEventListener('click', function (e) {
            e.stopPropagation();
            if (isMegaOpen()) closeMega(); else openMega();
        });
    }
    if (nav) nav.addEventListener('mouseleave', function () { closeMega(); });
    if (searchToggle) searchToggle.addEventListener('click', function (e) {
        e.stopPropagation();
        if (isSearchOpen()) closeSearch(); else openSearch();
    });
    if (searchClose) searchClose.addEventListener('click', closeSearch);
    if (backdrop) backdrop.addEventListener('click', closeAll);
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeAll();
    });

    // Navbar con sombra al hacer scroll (efecto translúcido estilo Apple)
    (function navScroll() {
        var bar = document.querySelector('.fx-navbar');
        if (!bar) return;
        function onScroll() { bar.classList.toggle('scrolled', window.scrollY > 8); }
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    })();

    // Selector de país con banderas reales + detección automática por IP
    (function initCountry() {
        var wrap = document.getElementById('nav-country');
        var btn = document.getElementById('nav-country-btn');
        var flag = document.getElementById('nav-country-flag');
        var codeEl = document.getElementById('nav-country-code');
        var menu = document.getElementById('nav-country-menu');
        if (!wrap || !btn || !flag || !codeEl || !menu) return;
        var COUNTRIES = [
            { code: 'PE', name: 'Perú' },
            { code: 'CL', name: 'Chile' },
            { code: 'CO', name: 'Colombia' },
            { code: 'MX', name: 'México' },
            { code: 'AR', name: 'Argentina' },
            { code: 'BR', name: 'Brasil' },
            { code: 'ES', name: 'España' },
            { code: 'US', name: 'Estados Unidos' }
        ];
        function flagUrl(code) { return 'https://flagcdn.com/' + String(code).toLowerCase() + '.svg'; }
        function paintActive(code) {
            var btns = menu.querySelectorAll('button[data-code]');
            for (var i = 0; i < btns.length; i++) {
                btns[i].classList.toggle('active', btns[i].getAttribute('data-code') === code);
            }
        }
        function setCountry(code, name) {
            code = String(code || 'PE').toUpperCase();
            name = name || code;
            flag.src = flagUrl(code);
            flag.alt = name;
            flag.onerror = function () { flag.style.visibility = 'hidden'; };
            flag.onload = function () { flag.style.visibility = 'visible'; };
            codeEl.textContent = code;
            btn.title = name;
            btn.setAttribute('aria-label', 'País: ' + name);
            var footCountry = document.getElementById('fx-footer-country');
            if (footCountry) footCountry.textContent = name;
            try { localStorage.setItem('elx-country', JSON.stringify({ code: code, name: name })); } catch (e) {}
            paintActive(code);
        }
        function closeMenu() {
            wrap.classList.remove('open');
            btn.setAttribute('aria-expanded', 'false');
        }
        COUNTRIES.forEach(function (c) {
            var b = document.createElement('button');
            b.type = 'button';
            b.setAttribute('data-code', c.code);
            b.setAttribute('role', 'menuitem');
            var img = document.createElement('img');
            img.src = flagUrl(c.code);
            img.alt = '';
            img.loading = 'lazy';
            var label = document.createElement('span');
            label.textContent = c.name;
            var tag = document.createElement('small');
            tag.textContent = c.code;
            b.appendChild(img);
            b.appendChild(label);
            b.appendChild(tag);
            b.addEventListener('click', function (e) {
                e.stopPropagation();
                setCountry(c.code, c.name);
                closeMenu();
            });
            menu.appendChild(b);
        });
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            var willOpen = !wrap.classList.contains('open');
            closeAll();
            if (willOpen) {
                wrap.classList.add('open');
                btn.setAttribute('aria-expanded', 'true');
            }
        });
        document.addEventListener('click', function (e) {
            if (!wrap.contains(e.target)) closeMenu();
        });
        // país guardado o detección automática por IP (con fallback a Perú)
        var saved = null;
        try { saved = JSON.parse(localStorage.getItem('elx-country') || 'null'); } catch (e) {}
        if (saved && saved.code) { setCountry(saved.code, saved.name); return; }
        setCountry('PE', 'Perú');
        try {
            var ctl = new AbortController();
            var t = setTimeout(function () { ctl.abort(); }, 4000);
            fetch('https://ipapi.co/json/', { signal: ctl.signal }).then(function (r) {
                return r.ok ? r.json() : null;
            }).then(function (d) {
                clearTimeout(t);
                if (d && d.country_code) setCountry(d.country_code, d.country_name);
            }).catch(function () {});
        } catch (e) {}
    })();

    // Sugerencias en vivo: filtra productos con foto mientras escribes
    (function initLiveSearch() {
        var form = document.getElementById('nav-search-form');
        var searchInput = document.getElementById('nav-search-input');
        if (!form || !searchInput) return;

        var box = document.createElement('div');
        box.id = 'nav-search-live';
        box.className = 'elx-search-live';
        box.style.display = 'none';
        form.insertAdjacentElement('afterend', box);

        function esc(s) {
            return String(s == null ? '' : s)
                .replace(/&/g, '&amp;').replace(/</g, '&lt;')
                .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        }
        function precioPEN(v) {
            try {
                return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(v);
            } catch (e) { return 'S/ ' + v; }
        }
        function ocultar() { box.style.display = 'none'; box.innerHTML = ''; }

        var t = null;
        searchInput.addEventListener('input', function () {
            clearTimeout(t);
            var q = searchInput.value.trim();
            if (q.length < 2) { ocultar(); return; }
            t = setTimeout(function () { buscar(q); }, 300);
        });
        if (searchClose) searchClose.addEventListener('click', ocultar);
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') ocultar();
        });

        function buscar(q) {
            fetch('/api/productos?nombre=' + encodeURIComponent(q) + '&size=8&page=0')
                .then(function (r) { return r.ok ? r.json() : null; })
                .then(function (res) {
                    var lista = (res && res.exito && res.datos)
                        ? (res.datos.contenido || res.datos || [])
                        : [];
                    if (!lista.length) {
                        box.innerHTML = '<span class="elx-search-live-empty">Sin coincidencias para &ldquo;' + esc(q) + '&rdquo;</span>';
                        box.style.display = 'flex';
                        return;
                    }
                    box.innerHTML = '';
                    lista.forEach(function (p) {
                        var a = document.createElement('a');
                        a.className = 'elx-search-live-item';
                        a.href = '/producto.html?id=' + encodeURIComponent(p.id);
                        var img = p.imagenUrl || '';
                        a.innerHTML = '<img src="' + esc(img) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'" />' +
                            '<span class="elx-search-live-info"><b>' + esc(p.nombre) + '</b><i>' + esc(precioPEN(p.precio)) + '</i></span>';
                        box.appendChild(a);
                    });
                    box.style.display = 'flex';
                })
                .catch(function () { ocultar(); });
        }
    })();

    // Mini slider del hero (solo existe en el home; con guards no afecta al resto)
    // Si el modulo de apariencia publico slides (window.SITIO_HERO), los usa.
    var slides = [
        { big: 'SUPER OFERTAS', sub: 'ESPECIALES' },
        { big: 'TECNOLOGÍA GAMER', sub: 'HASTA 40% OFF' },
        { big: 'AUDIO Y VIDEO', sub: 'ENVÍO GRATIS' }
    ];
    var idx = 0;
    var big = document.getElementById('fx-hero-big');
    var sub = document.getElementById('fx-hero-sub');
    function listaSlides() {
        return (window.SITIO_HERO && window.SITIO_HERO.length) ? window.SITIO_HERO : slides;
    }
    function show(i) {
        var s = listaSlides();
        idx = (i + s.length) % s.length;
        if (big) big.textContent = s[idx].big;
        if (sub) sub.textContent = s[idx].sub;
        if (typeof window.SITIO_HERO_APLICAR === 'function') window.SITIO_HERO_APLICAR(idx);
    }
    var prev = document.getElementById('slider-prev');
    var next = document.getElementById('slider-next');
    if (prev) prev.addEventListener('click', function () { show(idx - 1); });
    if (next) next.addEventListener('click', function () { show(idx + 1); });
})();
