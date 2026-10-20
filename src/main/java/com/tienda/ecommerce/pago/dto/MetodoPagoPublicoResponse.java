package com.tienda.ecommerce.pago.dto;

public record MetodoPagoPublicoResponse(
        String codigo, String nombre, String descripcion, String instrucciones,
        String procesamiento, boolean requiereReferencia, String etiquetaReferencia,
        String icono, String formularioJson, int orden,
        java.util.List<com.tienda.ecommerce.pago.FormularioPagoService.Campo> campos, String version
) {}
