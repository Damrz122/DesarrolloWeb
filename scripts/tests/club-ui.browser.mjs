// PLAYWRIGHT_MODULE=/ruta/a/playwright node scripts/tests/club-ui.browser.mjs
// Toda la API está interceptada. Nunca inicia sesión, compra ni altera saldos reales.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { simularCompras } from './fixtures/purchase-api.mjs';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.STOREFRONT_URL || 'http://localhost:8090';
const browser = await chromium.launch();
const contexts = [], errors = [];
async function nuevo(autenticado = true) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ignoreHTTPSErrors: true });
    contexts.push(ctx);
    const state = await simularCompras(ctx, { autenticado });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(e.message));
    return { ctx, state, p };
}
const clubListo = p => p.waitForFunction(() => ['club-wallet', 'club-rules', 'tiers-container', 'club-history']
    .every(id => document.getElementById(id).getAttribute('aria-busy') === 'false'));
const cotizado = p => p.waitForFunction(() => !document.getElementById('btn-confirm-order').disabled);
const revisado = p => p.waitForFunction(() => document.getElementById('beneficios-feedback').textContent.startsWith('Beneficios revisados.'));
try {
    const anon = await nuevo(false);
    // Reglas diferentes a la semilla: ningún texto comercial debe quedarse fijo.
    anon.state.rules.puntosBienvenida = 70;
    anon.state.rules.minimoPuntosCanje = 150;
    anon.state.levels = [{ codigo: 'NUEVO', nombre: 'Nivel personalizado', umbralPenAnual: 750, multiplicador: 1.8 }];
    await anon.p.goto(base + '/puntos.html');
    await clubListo(anon.p);
    assert.match(await anon.p.locator('#club-rules').textContent(), /70 puntos/);
    assert.match(await anon.p.locator('#club-rules').textContent(), /150/);
    assert.equal(await anon.p.locator('.club-level').count(), 1);
    assert.match(await anon.p.locator('#tiers-container').textContent(), /Nivel personalizado/);
    assert.equal(await anon.p.locator('#club-user-actions').isVisible(), false);
    assert.equal(await anon.p.locator('.club-balance').count(), 0);
    assert.equal(anon.state.requests.some(r => r.path.endsWith('/mi-billetera')), false);
    anon.state.failRules = true;
    anon.state.failLevels = true;
    await anon.p.reload();
    await clubListo(anon.p);
    await anon.p.locator('#club-rules-retry').waitFor();
    assert.equal(await anon.p.locator('.club-level').count(), 0);
    anon.state.failRules = false;
    anon.state.failLevels = false;
    await anon.p.locator('#club-rules-retry').click();
    await anon.p.locator('#club-levels-retry').click();
    await anon.p.locator('.club-level').waitFor();
    console.log('PASS Club público: condiciones/niveles dinámicos, sin saldo ficticio, errores y reintento');

    const club = await nuevo();
    let liberar;
    const bloqueo = new Promise(r => { liberar = r; });
    club.state.beforeWallet = () => bloqueo;
    await club.p.goto(base + '/puntos.html');
    await club.p.waitForFunction(() => document.getElementById('tiers-container').getAttribute('aria-busy') === 'false');
    liberar();
    await clubListo(club.p);
    assert.match(await club.p.locator('#club-wallet').textContent(), /240/);
    assert.match(await club.p.locator('.club-level[data-current="true"]').textContent(), /Plata/);
    assert.equal(await club.p.locator('#club-history img').count(), 0);
    assert.equal(await club.p.locator('#club-history a[href="/mis-pedidos.html?pedido=704"]').count(), 1);
    await club.p.locator('#sim-title').click();
    await club.p.locator('#sim-monto').fill('100');
    await club.p.locator('#sim-puntos').fill('200');
    await club.p.locator('#club-sim-submit').click();
    await club.p.waitForFunction(() => document.getElementById('club-sim-result').textContent.includes('no ha consumido'));
    assert.equal(club.state.wallet.saldoPuntos, 240);
    assert.deepEqual(club.state.requests.find(r => r.path === '/api/crm/puntos/simular').body,
        { puntosACanjear: 200, subtotalBasePen: 100 });
    club.state.wallet.saldoPuntos = 0;
    club.state.wallet.equivalentePen = 0;
    club.state.wallet.transacciones = [];
    await club.p.locator('#club-refresh').click();
    await club.p.waitForFunction(() => document.querySelector('.club-balance strong').textContent.startsWith('0 '));
    assert.match(await club.p.locator('#club-history').textContent(), /Aún no hay movimientos/);
    club.state.failWallet = true;
    await club.p.reload();
    await clubListo(club.p);
    assert.equal(await club.p.locator('.club-balance').count(), 0);
    assert.match(await club.p.locator('#club-wallet-status').textContent(), /Billetera no disponible/);
    club.state.failWallet = false;
    await club.p.locator('#club-refresh').click();
    await club.p.locator('.club-balance').waitFor();
    console.log('PASS Club autenticado: carga en cualquier orden, saldo cero, historial seguro, canje sin consumo y recuperación');

    const restringido = await nuevo();
    restringido.state.user.permisos = ['COMPRAR'];
    await restringido.p.goto(base + '/puntos.html');
    await clubListo(restringido.p);
    assert.equal(await restringido.p.locator('.club-balance').count(), 0);
    assert.equal(await restringido.p.locator('#movimientos').isVisible(), false);
    assert.equal(restringido.state.requests.some(r => r.path.endsWith('/mi-billetera')), false);
    const vencido = await nuevo();
    await vencido.ctx.addInitScript(() => {
        sessionStorage.setItem('ecommerce_token', 'header.' + btoa(JSON.stringify({ exp: 1 })) + '.signature');
    });
    await vencido.p.goto(base + '/puntos.html');
    await clubListo(vencido.p);
    assert.equal(await vencido.p.locator('#club-anon-actions').isVisible(), true);
    assert.equal(await vencido.p.locator('.club-balance').count(), 0);
    console.log('PASS sin permiso y sesión vencida: no se muestra ni consulta una billetera');

    const compra = await nuevo();
    await compra.p.goto(base + '/checkout.html');
    await cotizado(compra.p);
    await compra.p.locator('#seccion-puntos-crm:not([hidden])').waitFor();
    await compra.p.locator('#input-cupon').fill('PRUEBA10');
    assert.equal(await compra.p.locator('#btn-confirm-order').isDisabled(), true);
    await compra.p.locator('#btn-aplicar-cupon').click();
    await revisado(compra.p);
    assert.match(await compra.p.locator('#checkout-total').textContent(), /526\.00/);
    await compra.p.locator('#input-puntos').fill('200');
    await compra.p.locator('#btn-aplicar-puntos').click();
    await revisado(compra.p);
    assert.match(await compra.p.locator('#checkout-total').textContent(), /516\.00/);
    assert.equal(compra.state.wallet.saldoPuntos, 240);
    await compra.p.locator('#checkout-currency').selectOption('USD');
    await revisado(compra.p);
    await cotizado(compra.p);
    assert.match(await compra.p.locator('#checkout-total').textContent(), /129\.00/);
    assert.match(await compra.p.locator('#checkout-discount-points').textContent(), /2\.50/);
    compra.state.couponCombines = false;
    await compra.p.locator('#btn-aplicar-cupon').click();
    await compra.p.waitForFunction(() => document.getElementById('beneficios-feedback').dataset.tone === 'error');
    assert.equal(await compra.p.locator('#btn-confirm-order').isDisabled(), true);
    await compra.p.locator('#quitar-cupon').click();
    await revisado(compra.p);
    assert.match(await compra.p.locator('#checkout-total').textContent(), /131\.50/);
    // La interfaz debe mostrar incluso un total distinto calculado por el servidor, nunca rehacerlo.
    compra.state.benefitsTotal = 120.33;
    await compra.p.locator('#btn-aplicar-puntos').click();
    await revisado(compra.p);
    assert.match(await compra.p.locator('#checkout-total').textContent(), /120\.33/);
    // Una respuesta antigua no puede volver a activar un descuento ya retirado.
    let soltar, entro;
    const retenido = new Promise(r => { soltar = r; });
    const iniciado = new Promise(r => { entro = r; });
    compra.state.beforeBenefits = async () => { entro(); await retenido; };
    await compra.p.locator('#btn-aplicar-puntos').click();
    await iniciado;
    await compra.p.locator('#input-puntos').fill('');
    const respuesta = compra.p.waitForResponse(r => r.url().endsWith('/api/checkout/beneficios'));
    soltar();
    await respuesta;
    await compra.p.evaluate(() => new Promise(requestAnimationFrame));
    assert.match(await compra.p.locator('#checkout-total').textContent(), /134\.00/);
    assert.equal(await compra.p.locator('#row-descuento-puntos').isVisible(), false);
    compra.state.beforeBenefits = null;
    compra.state.benefitsTotal = null;
    await compra.p.locator('#input-puntos').fill('100');
    await compra.p.locator('#btn-aplicar-puntos').click();
    await revisado(compra.p);
    for (const [id, texto] of [['checkout-address', 'Calle de prueba 123'], ['checkout-prov', 'Lima'], ['checkout-dist', 'Prueba'], ['checkout-phone', '912345678'], ['payment-reference', 'OP-PRUEBA']]) {
        await compra.p.locator('#' + id).fill(texto);
    }
    // Las reglas pueden cambiar entre la vista previa y la confirmación: requiere revisar otra vez.
    compra.state.benefitsTotal = 119.99;
    await compra.p.locator('#btn-confirm-order').click();
    await compra.p.waitForFunction(() => document.getElementById('checkout-status').textContent.includes('beneficios cambiaron'));
    assert.equal(compra.state.requests.filter(r => r.path === '/api/pedidos' && r.method === 'POST').length, 0);
    await compra.p.locator('#btn-confirm-order').click();
    await compra.p.locator('#checkout-success:not([hidden])').waitFor();
    const pedido = compra.state.requests.find(r => r.path === '/api/pedidos' && r.method === 'POST').body;
    assert.equal(pedido.puntosACanjear, 100);
    assert.equal(pedido.cuponCodigoAplicado, null);
    assert.equal(Object.hasOwn(pedido, 'total'), false);
    assert.equal(Object.hasOwn(pedido, 'descuento'), false);
    console.log('PASS checkout: cupones/puntos, combinación, multimoneda, total del servidor, respuestas obsoletas y revalidación antes de compra simulada');

    const expiracion = await nuevo();
    await expiracion.p.clock.install();
    await expiracion.p.goto(base + '/checkout.html');
    await cotizado(expiracion.p);
    await expiracion.p.locator('#input-puntos').fill('100');
    await expiracion.p.locator('#btn-aplicar-puntos').click();
    await revisado(expiracion.p);
    await expiracion.p.clock.fastForward(301000);
    assert.equal(await expiracion.p.locator('#btn-confirm-order').isDisabled(), true);
    assert.equal(await expiracion.p.locator('#row-descuento-puntos').isVisible(), false);
    assert.equal(await expiracion.p.locator('#checkout-total').textContent(), '—');
    console.log('PASS cotización vencida: no conserva un total o beneficio aparentemente vigente');

    const responsive = await nuevo();
    for (const ruta of ['puntos', 'mis-pedidos', 'checkout']) {
        await responsive.p.goto(`${base}/${ruta}.html`);
        if (ruta === 'puntos') await clubListo(responsive.p);
        if (ruta === 'mis-pedidos') await responsive.p.waitForFunction(() => document.getElementById('orders-container').getAttribute('aria-busy') === 'false');
        if (ruta === 'checkout') await cotizado(responsive.p);
        for (const width of [320, 390, 640, 760, 768, 1024, 1440, 1920]) {
            await responsive.p.setViewportSize({ width, height: 1000 });
            assert.equal(await responsive.p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${ruta} ${width}px`);
            assert.equal(await responsive.p.locator('#main-navbar').evaluate(el => el.offsetHeight), width <= 760 ? 48 : 44);
        }
        assert.equal(await responsive.p.locator('.fx-nav-center a[href="/puntos.html"]').count(), 1);
    }
    await responsive.p.goto(base + '/mis-pedidos.html?pedido=704');
    await responsive.p.waitForFunction(() => document.getElementById('orders-container').getAttribute('aria-busy') === 'false');
    assert.equal(await responsive.p.locator('#pedido-704').evaluate(d => d.open), true);
    assert.equal(await responsive.p.locator('#billetera-crm-card').evaluate(e => getComputedStyle(e).position), 'static');
    console.log('PASS tres pantallas en 8 anchos, navegación consistente y pedidos profundos sin billetera flotante');
    assert.deepEqual(errors, []);
} finally {
    for (const ctx of contexts) await ctx.close();
    await browser.close();
}
