package com.tienda.ecommerce.pago;

import com.tienda.ecommerce.pedido.Pedido;
import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import org.hibernate.annotations.Check;

@Entity
@Table(
    name = "pagos",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_pagos_codigo_transaccion", columnNames = {"codigo_transaccion"})
    },
    indexes = {
        @Index(name = "idx_pago_estado", columnList = "estado_pago"),
        @Index(name = "idx_pago_transaccion", columnList = "codigo_transaccion")
    }
)
@Check(constraints = "monto >= 0")
public class Pago {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pedido_id", nullable = false, unique = true)
    private Pedido pedido;

    @Column(name = "metodo_pago", nullable = false, length = 50)
    private String metodoPago;

    @Column(name = "procesamiento_pago", nullable = false, length = 30)
    private String procesamientoPago;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_pago", nullable = false, length = 30)
    private EstadoPago estadoPago = EstadoPago.PENDIENTE;

    @Column(nullable = false, precision = 19, scale = 4)
    @Min(value = 0, message = "El monto no puede ser negativo")
    private BigDecimal monto;
    @Column(name = "moneda_codigo", nullable = false, length = 3)
    private String monedaCodigo = "PEN";
    @Column(name = "metodo_nombre", length = 100) private String metodoNombre;
    @Column(name = "formulario_snapshot", columnDefinition = "TEXT") private String formularioSnapshot;
    @Column(name = "datos_pago_json", columnDefinition = "TEXT") private String datosPagoJson;
    public String getMetodoNombre() { return metodoNombre; } public void setMetodoNombre(String v) { metodoNombre = v; }
    public String getFormularioSnapshot() { return formularioSnapshot; } public void setFormularioSnapshot(String v) { formularioSnapshot = v; }
    public String getDatosPagoJson() { return datosPagoJson; } public void setDatosPagoJson(String v) { datosPagoJson = v; }

    @Column(name = "codigo_transaccion", length = 100, unique = true)
    private String codigoTransaccion;

    @Column(name = "referencia_comprobante", length = 100)
    private String referenciaComprobante;

    @Column(name = "fecha_pago", nullable = false)
    private LocalDateTime fechaPago = LocalDateTime.now();

    public Pago() {
    }

    public Pago(Pedido pedido, String metodoPago, String procesamientoPago, EstadoPago estadoPago, BigDecimal monto, String codigoTransaccion) {
        this.pedido = pedido;
        this.metodoPago = metodoPago;
        this.procesamientoPago = procesamientoPago;
        this.estadoPago = estadoPago;
        this.monto = monto;
        this.codigoTransaccion = codigoTransaccion;
        this.fechaPago = LocalDateTime.now();
    }

    /** Compatibilidad con código y pruebas anteriores; no se usa en el checkout nuevo. */
    @Deprecated
    public Pago(Pedido pedido, MetodoPago metodoPago, EstadoPago estadoPago, BigDecimal monto, String codigoTransaccion) {
        this(pedido, metodoPago.name(),
                metodoPago == MetodoPago.PAGO_CONTRAENTREGA ? "CONTRA_ENTREGA"
                        : (metodoPago == MetodoPago.YAPE || metodoPago == MetodoPago.PLIN || metodoPago == MetodoPago.TRANSFERENCIA_BANCARIA
                        ? "VERIFICACION_MANUAL" : "SIMULADO"),
                estadoPago, monto, codigoTransaccion);
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

    public String getMetodoPago() {
        return metodoPago;
    }

    public void setMetodoPago(String metodoPago) {
        this.metodoPago = metodoPago;
    }

    public String getProcesamientoPago() { return procesamientoPago; }
    public void setProcesamientoPago(String procesamientoPago) { this.procesamientoPago = procesamientoPago; }

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
    public String getMonedaCodigo() { return monedaCodigo; }
    public void setMonedaCodigo(String monedaCodigo) { this.monedaCodigo = monedaCodigo; }

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
