package com.tienda.ecommerce.producto.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.DecimalMax;
import java.math.BigDecimal;
import java.util.List;

public class ProductoRequest {

    @NotBlank(message = "El nombre del producto es obligatorio")
    private String nombre;

    private String descripcion;

    @NotNull(message = "El precio es obligatorio")
    @Positive(message = "El precio debe ser mayor a 0")
    private BigDecimal precio;
    private String monedaCodigo = "PEN";

    @NotNull(message = "El stock es obligatorio")
    @PositiveOrZero(message = "El stock no puede ser negativo")
    private Integer stock;

    private String imagenUrl;

    /**
     * 4FN: galería completa. Si viene no vacía, tiene prioridad sobre imagenUrl.
     * Si viene nula/vacía, se usa imagenUrl como portada única.
     */
    private List<String> imagenes;

    @NotNull(message = "La categoría es obligatoria")
    private Long categoriaId;

    /**
     * Etiqueta comercial: NUEVO, OFERTA, TENDENCIA o vacío (sin etiqueta).
     */
    private String etiqueta;

    /**
     * Precio rebajado. Obligatorio cuando etiqueta = OFERTA (debe ser
     * menor al precio base); se ignora en cualquier otro caso.
     */
    @PositiveOrZero(message = "El precio de oferta no puede ser negativo")
    private BigDecimal precioOferta;

    @DecimalMax(value = "100", message = "El impuesto no puede superar 100%")
    @PositiveOrZero(message = "El impuesto no puede ser negativo")
    private BigDecimal impuestoPorcentaje = BigDecimal.ZERO;

    public ProductoRequest() {
    }

    public ProductoRequest(String nombre, String descripcion, BigDecimal precio, Integer stock, String imagenUrl, Long categoriaId) {
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.precio = precio;
        this.stock = stock;
        this.imagenUrl = imagenUrl;
        this.categoriaId = categoriaId;
    }

    public ProductoRequest(String nombre, String descripcion, BigDecimal precio, Integer stock, String imagenUrl, List<String> imagenes, Long categoriaId) {
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.precio = precio;
        this.stock = stock;
        this.imagenUrl = imagenUrl;
        this.imagenes = imagenes;
        this.categoriaId = categoriaId;
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
    public String getMonedaCodigo() { return monedaCodigo; }
    public void setMonedaCodigo(String monedaCodigo) { this.monedaCodigo = monedaCodigo; }

    public Integer getStock() {
        return stock;
    }

    public void setStock(Integer stock) {
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
    public BigDecimal getImpuestoPorcentaje() { return impuestoPorcentaje; }
    public void setImpuestoPorcentaje(BigDecimal impuestoPorcentaje) { this.impuestoPorcentaje = impuestoPorcentaje; }
}
