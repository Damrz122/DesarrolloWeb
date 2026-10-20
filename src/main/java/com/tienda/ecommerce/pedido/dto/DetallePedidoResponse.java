package com.tienda.ecommerce.pedido.dto;

import java.math.BigDecimal;

public class DetallePedidoResponse {

    private Long id;
    private Long productoId;
    private String productoNombre;
    private int cantidad;
    private BigDecimal precioUnitario;
    private BigDecimal subtotal;
    private String monedaCodigo;
    private BigDecimal impuestoPorcentaje = BigDecimal.ZERO;
    private BigDecimal impuestoMonto = BigDecimal.ZERO;

    public DetallePedidoResponse() {
    }

    public DetallePedidoResponse(Long id, Long productoId, String productoNombre, int cantidad, BigDecimal precioUnitario, BigDecimal subtotal) {
        this.id = id;
        this.productoId = productoId;
        this.productoNombre = productoNombre;
        this.cantidad = cantidad;
        this.precioUnitario = precioUnitario;
        this.subtotal = subtotal;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getProductoId() {
        return productoId;
    }

    public void setProductoId(Long productoId) {
        this.productoId = productoId;
    }

    public String getProductoNombre() {
        return productoNombre;
    }

    public void setProductoNombre(String productoNombre) {
        this.productoNombre = productoNombre;
    }

    public int getCantidad() {
        return cantidad;
    }

    public void setCantidad(int cantidad) {
        this.cantidad = cantidad;
    }

    public BigDecimal getPrecioUnitario() {
        return precioUnitario;
    }

    public void setPrecioUnitario(BigDecimal precioUnitario) {
        this.precioUnitario = precioUnitario;
    }

    public BigDecimal getSubtotal() {
        return subtotal;
    }

    public void setSubtotal(BigDecimal subtotal) {
        this.subtotal = subtotal;
    }
    public String getMonedaCodigo() { return monedaCodigo; }
    public void setMonedaCodigo(String monedaCodigo) { this.monedaCodigo = monedaCodigo; }
    public BigDecimal getImpuestoPorcentaje() { return impuestoPorcentaje; }
    public void setImpuestoPorcentaje(BigDecimal impuestoPorcentaje) { this.impuestoPorcentaje = impuestoPorcentaje; }
    public BigDecimal getImpuestoMonto() { return impuestoMonto; }
    public void setImpuestoMonto(BigDecimal impuestoMonto) { this.impuestoMonto = impuestoMonto; }
}
