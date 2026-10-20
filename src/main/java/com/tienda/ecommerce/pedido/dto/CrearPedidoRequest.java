package com.tienda.ecommerce.pedido.dto;

import jakarta.validation.constraints.NotBlank;

public class CrearPedidoRequest {

    @NotBlank(message = "La dirección de envío es obligatoria")
    private String direccionEnvio;

    @NotBlank(message = "El teléfono de contacto es obligatorio")
    private String telefono;

    /**
     * Método de pago seleccionado en el checkout (pasarela simulada).
     * Código del catálogo metodos_pago_config. Se exige un método activo,
     * compatible con la moneda y la versión de formulario seleccionadas.
     */
    private String metodoPago;

    /**
     * N° de operación / comprobante Yape-Plin-Transferencia (opcional).
     * Obligatorio en frontend para YAPE, PLIN y TRANSFERENCIA_BANCARIA.
     */
    private String referenciaComprobante;
    private String cotizacionToken;
    private String versionMetodo;
    private java.util.Map<String,String> datosPago;
    public String getCotizacionToken() { return cotizacionToken; } public void setCotizacionToken(String v) { cotizacionToken = v; }
    public String getVersionMetodo() { return versionMetodo; } public void setVersionMetodo(String v) { versionMetodo = v; }
    public java.util.Map<String,String> getDatosPago() { return datosPago; } public void setDatosPago(java.util.Map<String,String> v) { datosPago = v; }

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

    public String getReferenciaComprobante() {
        return referenciaComprobante;
    }

    public void setReferenciaComprobante(String referenciaComprobante) {
        this.referenciaComprobante = referenciaComprobante;
    }
}
