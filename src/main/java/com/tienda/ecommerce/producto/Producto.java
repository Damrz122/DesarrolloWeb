package com.tienda.ecommerce.producto;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.hibernate.annotations.Check;

@Entity
@Table(
    name = "productos",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_productos_nombre_categoria", columnNames = {"nombre", "categoria_id"})
    },
    indexes = {
        @Index(name = "idx_producto_nombre", columnList = "nombre"),
        @Index(name = "idx_producto_categoria", columnList = "categoria_id")
    }
)
@Check(constraints = "precio >= 0 AND stock >= 0")
public class Producto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String nombre;

    @Column(length = 1000)
    private String descripcion;

    @Column(nullable = false, precision = 19, scale = 4)
    @Min(value = 0, message = "El precio no puede ser negativo")
    private BigDecimal precio;

    @Column(name = "moneda_codigo", nullable = false, length = 3)
    private String monedaCodigo = "PEN";

    @Column(nullable = false)
    @Min(value = 0, message = "El stock no puede ser negativo")
    private int stock;

    @Column(name = "imagen_url", length = 500)
    private String imagenUrl;

    /**
     * 4FN: galería multivaluada (producto ->> url).
     * Fuente de verdad de las N imágenes; imagenUrl es solo la portada
     * (orden = 0) conservada por compatibilidad con frontend/API.
     */
    @OneToMany(mappedBy = "producto", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orden ASC, id ASC")
    private List<ProductoImagen> imagenes = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "categoria_id", nullable = false)
    private Categoria categoria;

    /**
     * Etiqueta comercial visible en la tarjeta: NUEVO, OFERTA, TENDENCIA o null (sin etiqueta).
     */
    @Column(length = 20)
    private String etiqueta;

    /**
     * Precio rebajado. Solo tiene efecto cuando etiqueta = OFERTA;
     * en cualquier otro caso se guarda NULL.
     */
    @Column(name = "precio_oferta", precision = 19, scale = 4)
    private BigDecimal precioOferta;

    @Column(nullable = false)
    private boolean activo = true;

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now();

    public Producto() {
    }

    public Producto(Long id, String nombre, String descripcion, BigDecimal precio, int stock, String imagenUrl, Categoria categoria, boolean activo) {
        this.id = id;
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.precio = precio;
        this.stock = stock;
        this.imagenUrl = imagenUrl;
        this.categoria = categoria;
        this.activo = activo;
        this.fechaCreacion = LocalDateTime.now();
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
    public String getMonedaCodigo() { return monedaCodigo; }
    public void setMonedaCodigo(String monedaCodigo) { this.monedaCodigo = monedaCodigo; }

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

    public Categoria getCategoria() {
        return categoria;
    }

    public void setCategoria(Categoria categoria) {
        this.categoria = categoria;
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

    /**
     * Precio que realmente paga el cliente: el de oferta cuando la
     * etiqueta es OFERTA y hay precio rebajado, si no el precio base.
     */
    @Transient
    public BigDecimal getPrecioVigente() {
        if ("OFERTA".equals(etiqueta) && precioOferta != null) {
            return precioOferta;
        }
        return precio;
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

    public List<ProductoImagen> getImagenes() {
        return imagenes;
    }

    public void setImagenes(List<ProductoImagen> imagenes) {
        this.imagenes = imagenes != null ? imagenes : new ArrayList<>();
    }

    public void agregarImagen(String url, int orden) {
        if (url == null || url.trim().isEmpty()) {
            return;
        }
        ProductoImagen imagen = new ProductoImagen();
        imagen.setProducto(this);
        imagen.setUrl(url.trim());
        imagen.setOrden(orden);
        this.imagenes.add(imagen);
    }

    public void reemplazarImagenes(List<String> urls) {
        this.imagenes.clear();
        if (urls == null) {
            return;
        }
        int orden = 0;
        for (String url : urls) {
            if (url != null && !url.trim().isEmpty()) {
                agregarImagen(url, orden++);
            }
        }
    }
}
