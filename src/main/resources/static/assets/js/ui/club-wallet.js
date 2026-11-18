import { formatoMoneda } from '../money.js';
import { escapar as esc, fechaPedido } from '../purchase-flow.js';
import { puntos, progresoNivel, nombreMovimiento, movimientosBilletera } from '../club-model.js';

export function resumenClub(b, compacto = false) {
    if (compacto) return `<div><p class="store-eyebrow">Electronix Club</p>
        <h2>${puntos(b.saldoPuntos)} puntos disponibles</h2>
        <p class="flow-note">Equivalente estimado: ${esc(formatoMoneda(b.equivalentePen ?? b.valorEstimadoPen, 'PEN'))}</p></div>
        <div class="club-compact-actions"><span class="flow-badge">${esc(b.nivelNombre || b.nivelCodigo || 'Nivel no disponible')}</span>
        <a class="flow-link" href="/puntos.html#movimientos">Consultar saldo y movimientos</a></div>`;
    const progreso = progresoNivel(b);
    return `<div class="club-wallet-head"><div><p class="store-eyebrow">Electronix Club</p>
        <h2>Tu saldo disponible.</h2></div>
        <span class="flow-badge">${esc(b.nivelNombre || b.nivelCodigo || 'Nivel no disponible')}</span></div>
        <div class="club-balance"><strong>${puntos(b.saldoPuntos)} <small>puntos</small></strong>
        <span>Equivalente estimado: ${esc(formatoMoneda(b.equivalentePen ?? b.valorEstimadoPen, 'PEN'))}</span></div>
        <p class="flow-note">Canje mínimo: ${puntos(b.minimoPuntosCanje)} puntos. Cobertura máxima: ${Number(b.maxCoberturaPorcentaje)}% del importe elegible. No es dinero en efectivo.</p>
        <div class="club-progress">
            <div><span>${b.siguienteNivelNombre
                ? `Hacia ${esc(b.siguienteNivelNombre)} · faltan ${esc(formatoMoneda(b.montoFaltanteSiguienteNivelPen, 'PEN'))}`
                : 'Nivel más alto disponible'}</span><span>${Math.round(progreso)}%</span></div>
            <progress max="100" value="${progreso}" aria-label="Progreso hacia el siguiente nivel">${Math.round(progreso)}%</progress>
        </div>
        <p class="flow-note">Compras de los últimos 365 días: ${esc(formatoMoneda(b.gastoAnualPen, 'PEN'))}.
                Multiplicador de acumulación: ${Number(b.multiplicador).toFixed(2)}x.</p>`;
}

export function listaMovimientos(b) {
    const movimientos = movimientosBilletera(b);
    if (!movimientos.length) return '<p class="flow-message">Aún no hay movimientos de puntos en tu cuenta.</p>';
    return `<ol class="club-movements">${movimientos.map(t => {
        const valor = Number(t.puntos);
        const pedido = Number(t.pedidoId);
        return `<li><div><strong>${esc(nombreMovimiento(t.tipo))}</strong>
            <p>${esc(t.descripcion || 'Movimiento registrado en tu billetera.')}</p>
            <small>${esc(fechaPedido(t.fecha))}${Number.isSafeInteger(pedido) && pedido > 0
                ? ` · <a href="/mis-pedidos.html?pedido=${pedido}">Pedido #${pedido}</a>` : ''}</small></div>
            <div class="club-movement-value" data-gain="${valor > 0}"><strong>${valor > 0 ? '+' : ''}${Number.isFinite(valor) ? valor : '—'} pts</strong>
                <small>Saldo: ${puntos(t.saldoResultante)}</small></div></li>`;
    }).join('')}</ol>`;
}
