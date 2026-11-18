// Presentación del Club: las reglas y los importes siempre vienen del servidor.
export function puntos(valor) {
    return valor !== null && valor !== undefined && valor !== '' && Number.isSafeInteger(Number(valor)) && Number(valor) >= 0
        ? new Intl.NumberFormat('es-PE').format(Number(valor)) : '—';
}

export function progresoNivel(billetera) {
    const valor = Number(billetera.porcentajeProgresoNivel);
    return Number.isFinite(valor) ? Math.min(100, Math.max(0, valor)) : 0;
}

export function nombreMovimiento(tipo) {
    return ({
        BONO_BIENVENIDA: 'Bienvenida', ACREDITADO_COMPRA: 'Puntos por compra',
        CANJEADO_PEDIDO: 'Puntos utilizados', REVERSION_CANCELACION: 'Reversión de pedido',
        AJUSTE_ADMIN: 'Ajuste de saldo'
    })[tipo] || 'Movimiento de puntos';
}

export function movimientosBilletera(billetera) {
    return Array.isArray(billetera?.transacciones) ? billetera.transacciones
        : Array.isArray(billetera?.transaccionesRecientes) ? billetera.transaccionesRecientes : [];
}
