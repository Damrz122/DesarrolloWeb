package com.tienda.ecommerce.reporte.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class ReporteVentasResponse {

    private BigDecimal totalVentas = BigDecimal.ZERO;
    private long totalPedidos = 0;
    private BigDecimal ticketPromedio = BigDecimal.ZERO;
    private List<VentaPorFechaDTO> ventasPorFecha = new ArrayList<>();
    private List<ProductoBajoStockDTO> productosBajoStock = new ArrayList<>();
    public record TotalMoneda(String monedaCodigo, BigDecimal total, long pedidos) {}
    private List<TotalMoneda> ventasPorMoneda = new ArrayList<>();
    private long pedidosSinConversionHistorica;
    public String getMonedaBase() { return "PEN"; }
    public List<TotalMoneda> getVentasPorMoneda() { return ventasPorMoneda; }
    public void setVentasPorMoneda(List<TotalMoneda> v) { ventasPorMoneda = v; }
    public long getPedidosSinConversionHistorica() { return pedidosSinConversionHistorica; }
    public void setPedidosSinConversionHistorica(long v) { pedidosSinConversionHistorica = v; }

    public ReporteVentasResponse() {
    }

    public ReporteVentasResponse(BigDecimal totalVentas, long totalPedidos, BigDecimal ticketPromedio, List<VentaPorFechaDTO> ventasPorFecha, List<ProductoBajoStockDTO> productosBajoStock) {
        this.totalVentas = totalVentas;
        this.totalPedidos = totalPedidos;
        this.ticketPromedio = ticketPromedio;
        this.ventasPorFecha = ventasPorFecha;
        this.productosBajoStock = productosBajoStock;
    }

    public BigDecimal getTotalVentas() {
        return totalVentas;
    }

    public void setTotalVentas(BigDecimal totalVentas) {
        this.totalVentas = totalVentas;
    }

    public long getTotalPedidos() {
        return totalPedidos;
    }

    public void setTotalPedidos(long totalPedidos) {
        this.totalPedidos = totalPedidos;
    }

    public BigDecimal getTicketPromedio() {
        return ticketPromedio;
    }

    public void setTicketPromedio(BigDecimal ticketPromedio) {
        this.ticketPromedio = ticketPromedio;
    }

    public List<VentaPorFechaDTO> getVentasPorFecha() {
        return ventasPorFecha;
    }

    public void setVentasPorFecha(List<VentaPorFechaDTO> ventasPorFecha) {
        this.ventasPorFecha = ventasPorFecha;
    }

    public List<ProductoBajoStockDTO> getProductosBajoStock() {
        return productosBajoStock;
    }

    public void setProductosBajoStock(List<ProductoBajoStockDTO> productosBajoStock) {
        this.productosBajoStock = productosBajoStock;
    }
}
