package com.tienda.ecommerce.pedido;

import com.tienda.ecommerce.producto.Producto;
import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import java.math.BigDecimal;
import org.hibernate.annotations.Check;

@Entity
@Table(
    name = "detalles_pedido",
    indexes = {
        @Index(name = "idx_detalle_pedido_id", columnList = "pedido_id"),
        @Index(name = "idx_detalle_producto_id", columnList = "producto_id")
    }
)
@Check(constraints = "cantidad > 0 AND precio_unitario >= 0")
public class DetallePedido {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pedido_id", nullable = false)
    private Pedido pedido;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "producto_id", nullable = false)
    private Producto producto;

    @Column(nullable = false)
    @Min(value = 1, message = "La cantidad debe ser mayor a 0")
    private int cantidad;

    @Column(name = "precio_unitario", nullable = false, precision = 10, scale = 2)
    @Min(value = 0, message = "El precio unitario no puede ser negativo")
    private BigDecimal precioUnitario;

    public DetallePedido() {
    }

    public DetallePedido(Long id, Pedido pedido, Producto producto, int cantidad, BigDecimal precioUnitario) {
        this.id = id;
        this.pedido = pedido;
        this.producto = producto;
        this.cantidad = cantidad;
        this.precioUnitario = precioUnitario;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Pedido getPedido() {
        return pedido;
    }

    public void setPedido(Pedido pedido) {
        this.pedido = pedido;
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

    public BigDecimal getPrecioUnitario() {
        return precioUnitario;
    }

    public void setPrecioUnitario(BigDecimal precioUnitario) {
        this.precioUnitario = precioUnitario;
    }
}
