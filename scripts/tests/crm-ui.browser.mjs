// Interfaz administrativa CRM con todos los usuarios y peticiones simulados.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { simularCompras, reglasPrueba, nivelesPrueba } from './fixtures/purchase-api.mjs';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.STOREFRONT_URL || 'http://localhost:8090';
const browser = await chromium.launch();
try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const state = await simularCompras(ctx);
    state.user.rol = 'ADMIN';
    state.user.permisos = ['ADMIN_ACCESO', 'CRM_GESTIONAR'];
    const requests = [];
    await ctx.route('**/api/admin/crm/**', route => {
        const req = route.request(), path = new URL(req.url()).pathname;
        requests.push({ path, method: req.method() });
        if (req.method() !== 'GET') return route.fulfill({ status: 500, json: { exito: false, mensaje: 'Escritura bloqueada en prueba visual' } });
        const datos = path.endsWith('/puntos/config') ? reglasPrueba
            : path.endsWith('/niveles') ? nivelesPrueba : [];
        return route.fulfill({ json: { exito: true, datos } });
    });
    const p = await ctx.newPage(), errors = [];
    p.on('pageerror', e => errors.push(e.message));
    for (const ruta of ['crm-clientes', 'promociones', 'fidelizacion']) {
        await p.goto(`${base}/admin/${ruta}.html`, { waitUntil: 'networkidle' });
        for (const tema of ['light', 'dark', 'mixed']) {
            await p.evaluate(tema => document.documentElement.setAttribute('data-theme', tema), tema);
            for (const width of [390, 768, 1440]) {
                await p.setViewportSize({ width, height: 1000 });
                assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${ruta} ${tema} ${width}`);
            }
        }
        if (ruta === 'crm-clientes') {
            assert.equal(await p.locator('#input-buscar-cliente').getAttribute('aria-label'), 'Buscar clientes por nombre o correo');
        } else {
            const disparador = ruta === 'promociones' ? p.locator('#btn-nuevo-cupon') : p.locator('#niveles-table-body button').first();
            // El ID de la tabla puede cambiar, la acción conserva su contrato accesible.
            const abrir = ruta === 'fidelizacion' && !await disparador.count()
                ? p.getByRole('button', { name: /Editar/ }).first() : disparador;
            await abrir.click();
            const fondo = p.locator('.adm-modal-backdrop:not(.hidden)');
            const dialogo = fondo.locator('[role="dialog"]');
            await dialogo.waitFor();
            assert.equal(await dialogo.getAttribute('aria-modal'), 'true');
            assert.equal(await fondo.evaluate(el => el.contains(document.activeElement)), true);
            await p.keyboard.press('Shift+Tab');
            assert.equal(await fondo.evaluate(el => el.contains(document.activeElement)), true);
            await p.keyboard.press('Tab');
            assert.equal(await fondo.evaluate(el => el.contains(document.activeElement)), true);
            await p.keyboard.press('Escape');
            await fondo.waitFor({ state: 'hidden' });
            assert.equal(await abrir.evaluate(el => el === document.activeElement), true);
        }
        console.log(`PASS ${ruta}: temas claro/oscuro/mixto, 3 anchos y accesibilidad de acciones`);
    }
    assert.equal(requests.some(r => r.method !== 'GET'), false);
    assert.deepEqual(errors, []);
    await ctx.close();
    console.log('PASS administración CRM sin escrituras ni excepciones JavaScript');
} finally { await browser.close(); }
