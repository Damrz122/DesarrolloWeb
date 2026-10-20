package com.tienda.ecommerce.carrito.dto;

import java.math.BigDecimal;

public class ItemCarritoResponse {

    private Long id;
    private Long productoId;
    private String productoNombre;
    private BigDecimal precioUnitario;
    private int cantidad;
    private BigDecimal subtotal;
    private String imagenUrl;
    private String monedaCodigo;
    private BigDecimal subtotalSinImpuesto = BigDecimal.ZERO;
    private BigDecimal impuestoPorcentaje = BigDecimal.ZERO;
    private BigDecimal impuestoMonto = BigDecimal.ZERO;

    public ItemCarritoResponse() {
    }

    public ItemCarritoResponse(Long id, Long productoId, String productoNombre, BigDecimal precioUnitario, int cantidad, BigDecimal subtotal, String imagenUrl) {
        this.id = id;
        this.productoId = productoId;
        this.productoNombre = productoNombre;
        this.precioUnitario = precioUnitario;
        this.cantidad = cantidad;
        this.subtotal = subtotal;
        this.imagenUrl = imagenUrl;
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

    public BigDecimal getPrecioUnitario() {
        return precioUnitario;
    }

    public void setPrecioUnitario(BigDecimal precioUnitario) {
        this.precioUnitario = precioUnitario;
    }

    public int getCantidad() {
        return cantidad;
    }

    public void setCantidad(int cantidad) {
        this.cantidad = cantidad;
    }

    public BigDecimal getSubtotal() {
        return subtotal;
    }

    public void setSubtotal(BigDecimal subtotal) {
        this.subtotal = subtotal;
    }

    public String getImagenUrl() {
        return imagenUrl;
    }

    public void setImagenUrl(String imagenUrl) {
        this.imagenUrl = imagenUrl;
    }
    public String getMonedaCodigo() { return monedaCodigo; }
    public void setMonedaCodigo(String monedaCodigo) { this.monedaCodigo = monedaCodigo; }
    public BigDecimal getSubtotalSinImpuesto() { return subtotalSinImpuesto; }
    public void setSubtotalSinImpuesto(BigDecimal v) { subtotalSinImpuesto = v; }
    public BigDecimal getImpuestoPorcentaje() { return impuestoPorcentaje; }
    public void setImpuestoPorcentaje(BigDecimal v) { impuestoPorcentaje = v; }
    public BigDecimal getImpuestoMonto() { return impuestoMonto; }
    public void setImpuestoMonto(BigDecimal v) { impuestoMonto = v; }
}
