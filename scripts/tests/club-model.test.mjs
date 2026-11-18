import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { puntos, progresoNivel, nombreMovimiento, movimientosBilletera } from '../../src/main/resources/static/assets/js/club-model.js';

test('el Club no presenta saldos ausentes como cero ni acepta puntos fraccionarios', () => {
    assert.equal(puntos(0), '0');
    assert.equal(puntos(240), '240');
    for (const valor of [null, undefined, '', -1, 1.5, NaN]) assert.equal(puntos(valor), '—');
});
test('el progreso se limita a su rango sin depender del nombre de nivel', () => {
    assert.equal(progresoNivel({ porcentajeProgresoNivel: 140 }), 100);
    assert.equal(progresoNivel({ porcentajeProgresoNivel: -1 }), 0);
    assert.equal(progresoNivel({ porcentajeProgresoNivel: '40' }), 40);
    assert.equal(progresoNivel({}), 0);
});
test('historial respeta el contrato y admite su alias anterior', () => {
    const tx = [{ pedidoId: 704 }];
    assert.equal(movimientosBilletera({ transacciones: tx }), tx);
    assert.equal(movimientosBilletera({ transaccionesRecientes: tx }), tx);
    assert.deepEqual(movimientosBilletera(null), []);
    assert.equal(nombreMovimiento('CANJEADO_PEDIDO'), 'Puntos utilizados');
});
test('la página del Club no promete canje total, fletes, caducidades ni niveles fijos', () => {
    const html = readFileSync('src/main/resources/static/puntos.html', 'utf8');
    for (const texto of ['CMR', '100% PUNTOS', '12 meses', 'Envío Gratis', 'data-tier-card=', 'localhost:8080']) assert.ok(!html.includes(texto), texto);
    assert.match(html, /storefront-flow/);
    const js = readFileSync('src/main/resources/static/assets/js/pages/puntos.js', 'utf8');
    assert.match(js, /\/api\/crm\/puntos\/reglas/);
    assert.match(js, /\/api\/crm\/puntos\/simular'/);
    assert.ok(!js.includes('Math.round((totalFinal'));
});
test('checkout revisa el total de beneficios en servidor sin enviar precios del navegador', () => {
    const js = readFileSync('src/main/resources/static/assets/js/pages/checkout.js', 'utf8');
    assert.match(js, /\/api\/checkout\/beneficios/);
    assert.ok(!js.includes('montoSubtotalPen'));
    assert.ok(!js.includes('totalFinal -'));
    assert.ok(!js.includes('metodo.formulario'));
});
