package com.tienda.ecommerce.reporte.dto;

public class ProductoBajoStockDTO {

    private Long id;
    private String nombre;
    private int stock;
    private String categoriaNombre;

    public ProductoBajoStockDTO() {
    }

    public ProductoBajoStockDTO(Long id, String nombre, int stock, String categoriaNombre) {
        this.id = id;
        this.nombre = nombre;
        this.stock = stock;
        this.categoriaNombre = categoriaNombre;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public int getStock() {
        return stock;
    }

    public void setStock(int stock) {
        this.stock = stock;
    }

    public String getCategoriaNombre() {
        return categoriaNombre;
    }

    public void setCategoriaNombre(String categoriaNombre) {
        this.categoriaNombre = categoriaNombre;
    }
}
