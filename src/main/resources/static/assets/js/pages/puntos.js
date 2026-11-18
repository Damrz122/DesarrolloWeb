import { auth } from '/assets/js/auth.js';
import { api } from '/assets/js/api.js';
import { formatoMoneda } from '/assets/js/money.js';
import { iniciarShellCompra } from '/assets/js/ui/purchase-shell.js';
import { escapar as esc } from '/assets/js/purchase-flow.js';
import { puntos } from '/assets/js/club-model.js';
import { resumenClub, listaMovimientos } from '/assets/js/ui/club-wallet.js';

await iniciarShellCompra();
const $ = id => document.getElementById(id);
const autenticado = auth.isAuthenticated();
const autorizado = autenticado && auth.tienePermiso('CRM_VER_PUNTOS');
let billetera = null, niveles = [], cargando = false, simulando = false, revisionSimulacion = 0;

$('club-anon-actions').hidden = autenticado;
$('club-user-actions').hidden = !autenticado;
$('movimientos').hidden = !autorizado;
$('club-sim-form').hidden = !autorizado;
$('club-sim-login').hidden = autorizado;
if (autenticado) {
    $('hero-title').textContent = 'Tus puntos. Tus próximas posibilidades.';
    $('hero-desc').textContent = 'Consulta tu saldo, sigue tu nivel y revisa cada movimiento. Los beneficios se aplican según las condiciones vigentes de tu compra.';
    if (!autorizado) {
        $('club-wallet').innerHTML = '<p class="flow-message">Tu cuenta no tiene acceso a una billetera de puntos.</p>';
        $('club-user-actions').querySelector('a[href="#movimientos"]').hidden = true;
        $('club-sim-login').textContent = 'Tu cuenta no tiene permiso para simular canjes.';
    }
}
if (!autenticado) {
    $('club-wallet').innerHTML = `<p class="store-eyebrow">Un espacio para tus beneficios</p><h2>Conoce tu próximo nivel.</h2><p class="flow-note">Al iniciar sesión podrás consultar tu saldo real, el equivalente estimado para descuentos y tus movimientos. Las reglas y niveles se muestran debajo.</p><a class="flow-link" href="#como-funciona">Cómo funciona el programa</a>`;
}
$('club-wallet').setAttribute('aria-busy', 'false');
if (!autorizado) $('club-history').setAttribute('aria-busy', 'false');

async function cargarReglas() {
    $('club-rules').setAttribute('aria-busy', 'true');
    try {
        const res = await api.get('/api/crm/puntos/reglas');
        if (!res?.exito || !res.datos) throw new Error('Las condiciones no están disponibles.');
        const r = res.datos;
        $('club-rules-status').textContent = r.activo ? '' : 'El programa está temporalmente inactivo. No se pueden aplicar canjes ni acumular puntos mientras esté desactivado.';
        $('club-rules').innerHTML = [
            ['01', 'Empieza con tu cuenta.', r.activo
                ? `Bono de bienvenida configurado: ${puntos(r.puntosBienvenida)} puntos. El mínimo para utilizar puntos es ${puntos(r.minimoPuntosCanje)}; el bono por sí solo puede no alcanzar ese mínimo.`
                : 'Puedes consultar tu historial; los beneficios están sujetos a la reactivación del programa.'],
            ['02', 'Suma con tus compras.', `La regla base es 1 punto por cada ${formatoMoneda(r.factorSolPorPunto, 'PEN')} elegibles, con el multiplicador de tu nivel. Se acredita al aprobarse el pago.`],
            ['03', 'Elige cuándo utilizarlos.', `Cada punto equivale a ${formatoMoneda(r.valorPenPorPunto, 'PEN')} para canjes elegibles. La cobertura máxima configurada es ${Number(r.maxCoberturaPorcentaje)}%. Revisa el resultado en checkout.`]
        ].map(([n, titulo, texto]) => `<article class="club-rule"><span>${n}</span><h3>${esc(titulo)}</h3><p>${esc(texto)}</p></article>`).join('');
    } catch {
        $('club-rules').innerHTML = '<p class="flow-note">No pudimos consultar las condiciones. No mostraremos importes o beneficios sin verificar.</p><button id="club-rules-retry" type="button" class="flow-link">Reintentar condiciones</button>';
        $('club-rules-retry').addEventListener('click', cargarReglas);
    } finally { $('club-rules').setAttribute('aria-busy', 'false'); }
}

function pintarNiveles() {
    $('tiers-container').innerHTML = niveles.length ? niveles.map(n => `<article class="club-level" data-current="${billetera?.nivelCodigo === n.codigo}">
        <h3>${esc(n.nombre)}</h3><strong>${Number(n.multiplicador).toFixed(2)}x</strong>
        <p>Multiplicador de acumulación.<br>Desde ${esc(formatoMoneda(n.umbralPenAnual, 'PEN'))} en compras aprobadas de los últimos 365 días.</p>
        ${billetera?.nivelCodigo === n.codigo ? '<span class="flow-badge">Tu nivel actual</span>' : ''}</article>`).join('')
        : '<p class="flow-note">No hay niveles disponibles para mostrar.</p>';
}
async function cargarNiveles() {
    $('tiers-container').setAttribute('aria-busy', 'true');
    $('club-levels-retry').hidden = true;
    try {
        const res = await api.get('/api/crm/niveles');
        if (!res?.exito || !Array.isArray(res.datos)) throw new Error();
        niveles = res.datos;
        pintarNiveles();
    } catch {
        $('tiers-container').innerHTML = '<p class="flow-note">No pudimos consultar los niveles vigentes.</p>';
        $('club-levels-retry').hidden = false;
    } finally { $('tiers-container').setAttribute('aria-busy', 'false'); }
}
async function cargarBilletera() {
    if (!autorizado || cargando) return;
    cargando = true;
    $('club-refresh').disabled = true;
    $('club-wallet-status').textContent = 'Actualizando saldo y movimientos…';
    for (const id of ['club-wallet', 'club-history']) $(id).setAttribute('aria-busy', 'true');
    try {
        const res = await api.get('/api/crm/puntos/mi-billetera');
        if (!res?.exito || !res.datos) throw new Error('No se pudo consultar la billetera.');
        billetera = res.datos;
        $('club-wallet').innerHTML = resumenClub(billetera);
        $('club-history').innerHTML = listaMovimientos(billetera);
        $('club-wallet-status').dataset.tone = '';
        $('club-wallet-status').textContent = 'Saldo y movimientos actualizados.';
        pintarNiveles();
    } catch (err) {
        $('club-wallet-status').dataset.tone = 'error';
        $('club-wallet-status').textContent = `${err.message || 'No pudimos consultar tus puntos.'} Puedes reintentar sin cambiar tu saldo.`;
        if (!billetera) {
            $('club-wallet').innerHTML = '<h2>Tu saldo no está disponible.</h2><p class="flow-note">No pudimos verificar tus puntos. Usa «Actualizar saldo y movimientos» para volver a consultarlos.</p>';
            $('club-history').innerHTML = '';
        }
    } finally {
        for (const id of ['club-wallet', 'club-history']) $(id).setAttribute('aria-busy', 'false');
        $('club-refresh').disabled = false;
        cargando = false;
    }
}
$('club-refresh').addEventListener('click', cargarBilletera);
$('club-levels-retry').addEventListener('click', cargarNiveles);
$('club-sim-form').addEventListener('input', () => {
    ++revisionSimulacion;
    simulando = false;
    $('club-sim-submit').disabled = false;
    $('club-sim-result').textContent = 'Vuelve a consultar para revisar estos valores.';
});
$('club-sim-form').addEventListener('submit', async e => {
    e.preventDefault();
    if (simulando || !$('club-sim-form').reportValidity()) return;
    const revision = ++revisionSimulacion;
    simulando = true;
    $('club-sim-submit').disabled = true;
    $('club-sim-result').textContent = 'Consultando canje sin consumir puntos…';
    try {
        const res = await api.post('/api/crm/puntos/simular', {
            puntosACanjear: Number($('sim-puntos').value), subtotalBasePen: Number($('sim-monto').value)
        });
        if (revision !== revisionSimulacion) return;
        if (!res?.exito || !res.datos?.valido) throw new Error(res.datos?.mensaje || 'No se pudo consultar el canje.');
        $('club-sim-result').dataset.tone = '';
        $('club-sim-result').textContent = `Puedes utilizar ${puntos(res.datos.puntosPermitidos)} puntos por ${formatoMoneda(res.datos.descuentoBasePen, 'PEN')} de descuento. Esta consulta no ha consumido tu saldo.`;
    } catch (err) {
        if (revision !== revisionSimulacion) return;
        $('club-sim-result').dataset.tone = 'error';
        $('club-sim-result').textContent = err.message || 'No pudimos consultar el canje.';
    } finally {
        if (revision === revisionSimulacion) { simulando = false; $('club-sim-submit').disabled = false; }
    }
});
await Promise.allSettled([cargarReglas(), cargarNiveles(), cargarBilletera()]);
