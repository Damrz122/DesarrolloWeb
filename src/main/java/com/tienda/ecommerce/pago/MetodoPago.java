package com.tienda.ecommerce.pago;

/**
 * Valores heredados para compatibilidad de código antiguo.
 * El checkout usa exclusivamente el catálogo {@code metodos_pago_config}.
 */
@Deprecated
public enum MetodoPago {
    TARJETA_CREDITO,
    TARJETA_DEBITO,
    YAPE,
    PLIN,
    TRANSFERENCIA_BANCARIA,
    PAGO_CONTRAENTREGA
}
