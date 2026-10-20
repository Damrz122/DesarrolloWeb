package com.tienda.ecommerce.pedido.dto;

import com.tienda.ecommerce.pago.EstadoPago;
import jakarta.validation.constraints.NotNull;

public class VerificarPagoRequest {

    @NotNull(message = "El estado del pago es obligatorio")
    private EstadoPago estado;

    public VerificarPagoRequest() {
    }

    public VerificarPagoRequest(EstadoPago estado) {
        this.estado = estado;
    }

    public EstadoPago getEstado() {
        return estado;
    }

    public void setEstado(EstadoPago estado) {
        this.estado = estado;
    }
}
