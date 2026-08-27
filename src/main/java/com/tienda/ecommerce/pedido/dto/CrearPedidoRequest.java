package com.tienda.ecommerce.pedido.dto;

import jakarta.validation.constraints.NotBlank;

public class CrearPedidoRequest {

    @NotBlank(message = "La dirección de envío es obligatoria")
    private String direccionEnvio;

    @NotBlank(message = "El teléfono de contacto es obligatorio")
    private String telefono;

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
}
