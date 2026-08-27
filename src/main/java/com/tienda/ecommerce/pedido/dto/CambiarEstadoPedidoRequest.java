package com.tienda.ecommerce.pedido.dto;

import com.tienda.ecommerce.pedido.EstadoPedido;
import jakarta.validation.constraints.NotNull;

public class CambiarEstadoPedidoRequest {

    @NotNull(message = "El estado del pedido es obligatorio")
    private EstadoPedido estado;

    public CambiarEstadoPedidoRequest() {
    }

    public CambiarEstadoPedidoRequest(EstadoPedido estado) {
        this.estado = estado;
    }

    public EstadoPedido getEstado() {
        return estado;
    }

    public void setEstado(EstadoPedido estado) {
        this.estado = estado;
    }
}
