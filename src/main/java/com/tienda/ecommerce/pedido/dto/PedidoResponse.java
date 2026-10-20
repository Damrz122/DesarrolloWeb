package com.tienda.ecommerce.pedido.dto;

import com.tienda.ecommerce.pago.EstadoPago;
import com.tienda.ecommerce.pedido.EstadoPedido;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class PedidoResponse {

    private Long id;
    private Long usuarioId;
    private String usuarioNombre;
    private String usuarioEmail;
    private EstadoPedido estado;
    private BigDecimal total;
    private String monedaCodigo;
    private String direccionEnvio;
    private String telefono;
    private LocalDateTime fecha;
    private List<DetallePedidoResponse> detalles = new ArrayList<>();
    private String metodoPago;
    private EstadoPago estadoPago;
    private String referenciaComprobante;
    private String codigoTransaccion;
    private LocalDateTime fechaPago;
    private String procesamientoPago;
    private String metodoNombre;
    private BigDecimal totalBasePen;
    public String getMetodoNombre() { return metodoNombre; } public void setMetodoNombre(String v) { metodoNombre = v; }
    public BigDecimal getTotalBasePen() { return totalBasePen; } public void setTotalBasePen(BigDecimal v) { totalBasePen = v; }

    public PedidoResponse() {
    }

    public PedidoResponse(Long id, Long usuarioId, String usuarioNombre, String usuarioEmail, EstadoPedido estado, BigDecimal total, String direccionEnvio, String telefono, LocalDateTime fecha, List<DetallePedidoResponse> detalles) {
        this.id = id;
        this.usuarioId = usuarioId;
        this.usuarioNombre = usuarioNombre;
        this.usuarioEmail = usuarioEmail;
        this.estado = estado;
        this.total = total;
        this.direccionEnvio = direccionEnvio;
        this.telefono = telefono;
        this.fecha = fecha;
        this.detalles = detalles;
    }

    public PedidoResponse(Long id, Long usuarioId, String usuarioNombre, String usuarioEmail, EstadoPedido estado, BigDecimal total, String direccionEnvio, String telefono, LocalDateTime fecha, List<DetallePedidoResponse> detalles, String metodoPago, EstadoPago estadoPago, String referenciaComprobante, String codigoTransaccion, LocalDateTime fechaPago) {
        this(id, usuarioId, usuarioNombre, usuarioEmail, estado, total, direccionEnvio, telefono, fecha, detalles);
        this.metodoPago = metodoPago;
        this.estadoPago = estadoPago;
        this.referenciaComprobante = referenciaComprobante;
        this.codigoTransaccion = codigoTransaccion;
        this.fechaPago = fechaPago;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUsuarioId() {
        return usuarioId;
    }

    public void setUsuarioId(Long usuarioId) {
        this.usuarioId = usuarioId;
    }

    public String getUsuarioNombre() {
        return usuarioNombre;
    }

    public void setUsuarioNombre(String usuarioNombre) {
        this.usuarioNombre = usuarioNombre;
    }

    public String getUsuarioEmail() {
        return usuarioEmail;
    }

    public void setUsuarioEmail(String usuarioEmail) {
        this.usuarioEmail = usuarioEmail;
    }

    public EstadoPedido getEstado() {
        return estado;
    }

    public void setEstado(EstadoPedido estado) {
        this.estado = estado;
    }

    public BigDecimal getTotal() {
        return total;
    }

    public void setTotal(BigDecimal total) {
        this.total = total;
    }
    public String getMonedaCodigo() { return monedaCodigo; }
    public void setMonedaCodigo(String monedaCodigo) { this.monedaCodigo = monedaCodigo; }
    public String getProcesamientoPago() { return procesamientoPago; }
    public void setProcesamientoPago(String procesamientoPago) { this.procesamientoPago = procesamientoPago; }

    public String getDireccionEnvio() {
        return direccionEnvio;
    }

    public void setDireccionEnvio(String direccionEnvio) {
        this.direccionEnvio = direccionEnvio;
    }

    public String getTelefono() {
        return telefono;
    }

    public void setTelefono(String telefono) {
        this.telefono = telefono;
    }

    public LocalDateTime getFecha() {
        return fecha;
    }

    public void setFecha(LocalDateTime fecha) {
        this.fecha = fecha;
    }

    public List<DetallePedidoResponse> getDetalles() {
        return detalles;
    }

    public void setDetalles(List<DetallePedidoResponse> detalles) {
        this.detalles = detalles;
    }

    public String getMetodoPago() {
        return metodoPago;
    }

    public void setMetodoPago(String metodoPago) {
        this.metodoPago = metodoPago;
    }

    public EstadoPago getEstadoPago() {
        return estadoPago;
    }

    public void setEstadoPago(EstadoPago estadoPago) {
        this.estadoPago = estadoPago;
    }

    public String getReferenciaComprobante() {
        return referenciaComprobante;
    }

    public void setReferenciaComprobante(String referenciaComprobante) {
        this.referenciaComprobante = referenciaComprobante;
    }

    public String getCodigoTransaccion() {
        return codigoTransaccion;
    }

    public void setCodigoTransaccion(String codigoTransaccion) {
        this.codigoTransaccion = codigoTransaccion;
    }

    public LocalDateTime getFechaPago() {
        return fechaPago;
    }

    public void setFechaPago(LocalDateTime fechaPago) {
        this.fechaPago = fechaPago;
    }
}
