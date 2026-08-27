package com.tienda.ecommerce.chat.dto;

import java.time.LocalDateTime;

public class ConversacionResponse {

    private Long id;
    private Long clienteId;
    private String clienteNombre;
    private Long adminId;
    private String adminNombre;
    private String estado;
    private LocalDateTime fechaCreacion;
    private String ultimoMensaje;

    public ConversacionResponse() {
    }

    public ConversacionResponse(Long id, Long clienteId, String clienteNombre, Long adminId, String adminNombre, String estado, LocalDateTime fechaCreacion, String ultimoMensaje) {
        this.id = id;
        this.clienteId = clienteId;
        this.clienteNombre = clienteNombre;
        this.adminId = adminId;
        this.adminNombre = adminNombre;
        this.estado = estado;
        this.fechaCreacion = fechaCreacion;
        this.ultimoMensaje = ultimoMensaje;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getClienteId() {
        return clienteId;
    }

    public void setClienteId(Long clienteId) {
        this.clienteId = clienteId;
    }

    public String getClienteNombre() {
        return clienteNombre;
    }

    public void setClienteNombre(String clienteNombre) {
        this.clienteNombre = clienteNombre;
    }

    public Long getAdminId() {
        return adminId;
    }

    public void setAdminId(Long adminId) {
        this.adminId = adminId;
    }

    public String getAdminNombre() {
        return adminNombre;
    }

    public void setAdminNombre(String adminNombre) {
        this.adminNombre = adminNombre;
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }

    public LocalDateTime getFechaCreacion() {
        return fechaCreacion;
    }

    public void setFechaCreacion(LocalDateTime fechaCreacion) {
        this.fechaCreacion = fechaCreacion;
    }

    public String getUltimoMensaje() {
        return ultimoMensaje;
    }

    public void setUltimoMensaje(String ultimoMensaje) {
        this.ultimoMensaje = ultimoMensaje;
    }
}
