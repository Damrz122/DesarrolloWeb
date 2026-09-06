package com.tienda.ecommerce.envio;

import com.tienda.ecommerce.pedido.Pedido;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import org.hibernate.annotations.Check;

@Entity
@Table(
    name = "envios",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_envios_numero_guia", columnNames = {"numero_guia"})
    },
    indexes = {
        @Index(name = "idx_envio_estado", columnList = "estado_envio"),
        @Index(name = "idx_envio_guia", columnList = "numero_guia"),
        @Index(name = "idx_envio_pedido", columnList = "pedido_id")
    }
)
@Check(constraints = "fecha_entrega_real IS NULL OR fecha_despacho IS NULL OR fecha_entrega_real >= fecha_despacho")
public class Envio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pedido_id", nullable = false, unique = true)
    private Pedido pedido;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_envio", nullable = false, length = 30)
    private EstadoEnvio estadoEnvio = EstadoEnvio.PREPARANDO;

    @Column(name = "empresa_courier", length = 100)
    private String empresaCourier = "Electronix Express Logistics";

    @Column(name = "numero_guia", length = 100, unique = true)
    private String numeroGuia;

    @Column(name = "direccion_destino", nullable = false, length = 255)
    private String direccionDestino;

    @Column(name = "fecha_despacho")
    private LocalDateTime fechaDespacho;

    @Column(name = "fecha_estimada_entrega")
    private LocalDateTime fechaEstimadaEntrega;

    @Column(name = "fecha_entrega_real")
    private LocalDateTime fechaEntregaReal;

    @Column(length = 255)
    private String observaciones;

    public Envio() {
    }

    public Envio(Pedido pedido, String direccionDestino, String empresaCourier) {
        this.pedido = pedido;
        this.direccionDestino = direccionDestino;
        this.empresaCourier = empresaCourier;
        this.estadoEnvio = EstadoEnvio.PREPARANDO;
        this.fechaDespacho = LocalDateTime.now();
        this.fechaEstimadaEntrega = LocalDateTime.now().plusDays(2);
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

    public EstadoEnvio getEstadoEnvio() {
        return estadoEnvio;
    }

    public void setEstadoEnvio(EstadoEnvio estadoEnvio) {
        this.estadoEnvio = estadoEnvio;
    }

    public String getEmpresaCourier() {
        return empresaCourier;
    }

    public void setEmpresaCourier(String empresaCourier) {
        this.empresaCourier = empresaCourier;
    }

    public String getNumeroGuia() {
        return numeroGuia;
    }

    public void setNumeroGuia(String numeroGuia) {
        this.numeroGuia = numeroGuia;
    }

    public String getDireccionDestino() {
        return direccionDestino;
    }

    public void setDireccionDestino(String direccionDestino) {
        this.direccionDestino = direccionDestino;
    }

    public LocalDateTime getFechaDespacho() {
        return fechaDespacho;
    }

    public void setFechaDespacho(LocalDateTime fechaDespacho) {
        this.fechaDespacho = fechaDespacho;
    }

    public LocalDateTime getFechaEstimadaEntrega() {
        return fechaEstimadaEntrega;
    }

    public void setFechaEstimadaEntrega(LocalDateTime fechaEstimadaEntrega) {
        this.fechaEstimadaEntrega = fechaEstimadaEntrega;
    }

    public LocalDateTime getFechaEntregaReal() {
        return fechaEntregaReal;
    }

    public void setFechaEntregaReal(LocalDateTime fechaEntregaReal) {
        this.fechaEntregaReal = fechaEntregaReal;
    }

    public String getObservaciones() {
        return observaciones;
    }

    public void setObservaciones(String observaciones) {
        this.observaciones = observaciones;
    }
}
