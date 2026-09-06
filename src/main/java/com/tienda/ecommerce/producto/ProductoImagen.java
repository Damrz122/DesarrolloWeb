package com.tienda.ecommerce.producto;

import jakarta.persistence.*;

/**
 * 4FN: galería de imágenes de un producto.
 * Cada fila es UN hecho atómico (producto ->> url), por lo que múltiples
 * imágenes ya no requieren columnas repetidas ni listas separadas por comas.
 * La fuente de verdad de la galería es esta tabla; {@link Producto#getImagenUrl()}
 * se conserva solo como portada (caché de orden = 0) por compatibilidad.
 */
@Entity
@Table(
    name = "producto_imagenes",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_producto_imagen_url", columnNames = {"producto_id", "url"})
    },
    indexes = {
        @Index(name = "idx_producto_imagen_producto", columnList = "producto_id, orden")
    }
)
public class ProductoImagen {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "producto_id", nullable = false)
    private Producto producto;

    @Column(name = "url", nullable = false, length = 500)
    private String url;

    @Column(name = "orden", nullable = false)
    private int orden = 0;

    public ProductoImagen() {
    }

    public ProductoImagen(Producto producto, String url, int orden) {
        this.producto = producto;
        this.url = url;
        this.orden = orden;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Producto getProducto() {
        return producto;
    }

    public void setProducto(Producto producto) {
        this.producto = producto;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public int getOrden() {
        return orden;
    }

    public void setOrden(int orden) {
        this.orden = orden;
    }
}
