package com.tienda.ecommerce.carrito.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class CarritoResponse {

    private Long id;
    private List<ItemCarritoResponse> items = new ArrayList<>();
    private BigDecimal total = BigDecimal.ZERO;
    private int cantidadTotal = 0;
    private String monedaCodigo = "PEN";

    public CarritoResponse() {
    }

    public CarritoResponse(Long id, List<ItemCarritoResponse> items, BigDecimal total, int cantidadTotal) {
        this.id = id;
        this.items = items;
        this.total = total;
        this.cantidadTotal = cantidadTotal;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public List<ItemCarritoResponse> getItems() {
        return items;
    }

    public void setItems(List<ItemCarritoResponse> items) {
        this.items = items;
    }

    public BigDecimal getTotal() {
        return total;
    }

    public void setTotal(BigDecimal total) {
        this.total = total;
    }

    public int getCantidadTotal() {
        return cantidadTotal;
    }

    public void setCantidadTotal(int cantidadTotal) {
        this.cantidadTotal = cantidadTotal;
    }
    public String getMonedaCodigo() { return monedaCodigo; }
    public void setMonedaCodigo(String monedaCodigo) { this.monedaCodigo = monedaCodigo; }
}
