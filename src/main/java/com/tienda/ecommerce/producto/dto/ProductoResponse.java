package com.tienda.ecommerce.producto.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class ProductoResponse {

    private Long id;
    private String nombre;
    private String descripcion;
    private BigDecimal precio;
    private int stock;
    private String imagenUrl;
    /** 4FN: galería completa ordenada. imagenUrl es la portada (elemento 0 si existe). */
    private List<String> imagenes;
    private Long categoriaId;
    private String categoriaNombre;
    private String etiqueta;
    /** Precio rebajado (solo cuando etiqueta = OFERTA). */
    private BigDecimal precioOferta;
    private boolean activo;
    private LocalDateTime fechaCreacion;

    public ProductoResponse() {
    }

    public ProductoResponse(Long id, String nombre, String descripcion, BigDecimal precio, int stock, String imagenUrl, Long categoriaId, String categoriaNombre, boolean activo, LocalDateTime fechaCreacion) {
        this(id, nombre, descripcion, precio, stock, imagenUrl,
                imagenUrl != null ? List.of(imagenUrl) : List.of(),
                categoriaId, categoriaNombre, activo, fechaCreacion);
    }

    public ProductoResponse(Long id, String nombre, String descripcion, BigDecimal precio, int stock, String imagenUrl, List<String> imagenes, Long categoriaId, String categoriaNombre, boolean activo, LocalDateTime fechaCreacion) {
        this.id = id;
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.precio = precio;
        this.stock = stock;
        this.imagenUrl = imagenUrl;
        this.imagenes = imagenes != null ? List.copyOf(imagenes) : List.of();
        this.categoriaId = categoriaId;
        this.categoriaNombre = categoriaNombre;
        this.activo = activo;
        this.fechaCreacion = fechaCreacion;
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

    public String getDescripcion() {
        return descripcion;
    }

    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion;
    }

    public BigDecimal getPrecio() {
        return precio;
    }

    public void setPrecio(BigDecimal precio) {
        this.precio = precio;
    }

    public int getStock() {
        return stock;
    }

    public void setStock(int stock) {
        this.stock = stock;
    }

    public String getImagenUrl() {
        return imagenUrl;
    }

    public void setImagenUrl(String imagenUrl) {
        this.imagenUrl = imagenUrl;
    }

    public List<String> getImagenes() {
        return imagenes;
    }

    public void setImagenes(List<String> imagenes) {
        this.imagenes = imagenes;
    }

    public Long getCategoriaId() {
        return categoriaId;
    }

    public void setCategoriaId(Long categoriaId) {
        this.categoriaId = categoriaId;
    }

    public String getCategoriaNombre() {
        return categoriaNombre;
    }

    public void setCategoriaNombre(String categoriaNombre) {
        this.categoriaNombre = categoriaNombre;
    }

    public String getEtiqueta() {
        return etiqueta;
    }

    public void setEtiqueta(String etiqueta) {
        this.etiqueta = etiqueta;
    }

    public BigDecimal getPrecioOferta() {
        return precioOferta;
    }

    public void setPrecioOferta(BigDecimal precioOferta) {
        this.precioOferta = precioOferta;
    }

    public boolean isActivo() {
        return activo;
    }

    public void setActivo(boolean activo) {
        this.activo = activo;
    }

    public LocalDateTime getFechaCreacion() {
        return fechaCreacion;
    }

    public void setFechaCreacion(LocalDateTime fechaCreacion) {
        this.fechaCreacion = fechaCreacion;
    }
}
