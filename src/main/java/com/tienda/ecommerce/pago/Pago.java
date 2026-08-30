package com.tienda.ecommerce.pago;

import com.tienda.ecommerce.pedido.Pedido;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "pagos",
    indexes = {
        @Index(name = "idx_pago_estado", columnList = "estado_pago"),
        @Index(name = "idx_pago_transaccion", columnList = "codigo_transaccion")
    }
)
public class Pago {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pedido_id", nullable = false, unique = true)
    private Pedido pedido;

    @Enumerated(EnumType.STRING)
    @Column(name = "metodo_pago", nullable = false, length = 30)
    private MetodoPago metodoPago;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_pago", nullable = false, length = 30)
    private EstadoPago estadoPago = EstadoPago.PENDIENTE;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal monto;

    @Column(name = "codigo_transaccion", length = 100)
    private String codigoTransaccion;

    @Column(name = "referencia_comprobante", length = 100)
    private String referenciaComprobante;

    @Column(name = "fecha_pago", nullable = false)
    private LocalDateTime fechaPago = LocalDateTime.now();

    public Pago() {
    }

    public Pago(Pedido pedido, MetodoPago metodoPago, EstadoPago estadoPago, BigDecimal monto, String codigoTransaccion) {
        this.pedido = pedido;
        this.metodoPago = metodoPago;
        this.estadoPago = estadoPago;
        this.monto = monto;
        this.codigoTransaccion = codigoTransaccion;
        this.fechaPago = LocalDateTime.now();
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

    public MetodoPago getMetodoPago() {
        return metodoPago;
    }

    public void setMetodoPago(MetodoPago metodoPago) {
        this.metodoPago = metodoPago;
    }

    public EstadoPago getEstadoPago() {
        return estadoPago;
    }

    public void setEstadoPago(EstadoPago estadoPago) {
        this.estadoPago = estadoPago;
    }

    public BigDecimal getMonto() {
        return monto;
    }

    public void setMonto(BigDecimal monto) {
        this.monto = monto;
    }

    public String getCodigoTransaccion() {
        return codigoTransaccion;
    }

    public void setCodigoTransaccion(String codigoTransaccion) {
        this.codigoTransaccion = codigoTransaccion;
    }

    public String getReferenciaComprobante() {
        return referenciaComprobante;
    }

    public void setReferenciaComprobante(String referenciaComprobante) {
        this.referenciaComprobante = referenciaComprobante;
    }

    public LocalDateTime getFechaPago() {
        return fechaPago;
    }

    public void setFechaPago(LocalDateTime fechaPago) {
        this.fechaPago = fechaPago;
    }
}
