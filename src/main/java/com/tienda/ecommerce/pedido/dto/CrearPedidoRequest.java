package com.tienda.ecommerce.pedido.dto;

import jakarta.validation.constraints.NotBlank;

public class CrearPedidoRequest {

    @NotBlank(message = "La dirección de envío es obligatoria")
    private String direccionEnvio;

    @NotBlank(message = "El teléfono de contacto es obligatorio")
    private String telefono;

    /**
     * Método de pago seleccionado en el checkout (pasarela simulada).
     * Valores del enum {@code MetodoPago}: TARJETA_CREDITO, TARJETA_DEBITO,
     * YAPE, PLIN, TRANSFERENCIA_BANCARIA, PAGO_CONTRAENTREGA.
     * Opcional por compatibilidad: si viene vacío se usa TARJETA_CREDITO.
     */
    private String metodoPago;

    public CrearPedidoRequest() {
    }

    public CrearPedidoRequest(String direccionEnvio, String telefono) {
        this.direccionEnvio = direccionEnvio;
        this.telefono = telefono;
    }

    public String getDireccionEnvio() {
        return direccionEnvio;
    }

    public void setDireccionEnvio(String direccionEnvio) {
        this.direccionEnvio = direccionEnvio;
    }

    public String getTelefono() {
        return telefono;
    }

    public void setTelefono(String telefono) {
        this.telefono = telefono;
    }

    public String getMetodoPago() {
        return metodoPago;
    }

    public void setMetodoPago(String metodoPago) {
        this.metodoPago = metodoPago;
    }
}
