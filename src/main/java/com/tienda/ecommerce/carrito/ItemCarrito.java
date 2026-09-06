package com.tienda.ecommerce.carrito;

import com.tienda.ecommerce.producto.Producto;
import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import org.hibernate.annotations.Check;

@Entity
@Table(
    name = "items_carrito",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_items_carrito_carrito_producto", columnNames = {"carrito_id", "producto_id"})
    },
    indexes = {
        @Index(name = "idx_items_carrito_carrito", columnList = "carrito_id"),
        @Index(name = "idx_items_carrito_producto", columnList = "producto_id")
    }
)
@Check(constraints = "cantidad > 0")
public class ItemCarrito {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "carrito_id", nullable = false)
    private Carrito carrito;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "producto_id", nullable = false)
    private Producto producto;

    @Column(nullable = false)
    @Min(value = 1, message = "La cantidad debe ser mayor a 0")
    private int cantidad;

    public ItemCarrito() {
    }

    public ItemCarrito(Long id, Carrito carrito, Producto producto, int cantidad) {
        this.id = id;
        this.carrito = carrito;
        this.producto = producto;
        this.cantidad = cantidad;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Carrito getCarrito() {
        return carrito;
    }

    public void setCarrito(Carrito carrito) {
        this.carrito = carrito;
    }

    public Producto getProducto() {
        return producto;
    }

    public void setProducto(Producto producto) {
        this.producto = producto;
    }

    public int getCantidad() {
        return cantidad;
    }

    public void setCantidad(int cantidad) {
        this.cantidad = cantidad;
    }
}
