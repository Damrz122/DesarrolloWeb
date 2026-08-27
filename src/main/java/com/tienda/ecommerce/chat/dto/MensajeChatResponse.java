package com.tienda.ecommerce.chat.dto;

import com.tienda.ecommerce.usuario.Rol;
import java.time.LocalDateTime;

public class MensajeChatResponse {

    private Long id;
    private Long conversacionId;
    private Long remitenteId;
    private String remitenteNombre;
    private Rol remitenteRol;
    private String contenido;
    private LocalDateTime fechaEnvio;

    public MensajeChatResponse() {
    }

    public MensajeChatResponse(Long id, Long conversacionId, Long remitenteId, String remitenteNombre, Rol remitenteRol, String contenido, LocalDateTime fechaEnvio) {
        this.id = id;
        this.conversacionId = conversacionId;
        this.remitenteId = remitenteId;
        this.remitenteNombre = remitenteNombre;
        this.remitenteRol = remitenteRol;
        this.contenido = contenido;
        this.fechaEnvio = fechaEnvio;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getConversacionId() {
        return conversacionId;
    }

    public void setConversacionId(Long conversacionId) {
        this.conversacionId = conversacionId;
    }

    public Long getRemitenteId() {
        return remitenteId;
    }

    public void setRemitenteId(Long remitenteId) {
        this.remitenteId = remitenteId;
    }

    public String getRemitenteNombre() {
        return remitenteNombre;
    }

    public void setRemitenteNombre(String remitenteNombre) {
        this.remitenteNombre = remitenteNombre;
    }

    public Rol getRemitenteRol() {
        return remitenteRol;
    }

    public void setRemitenteRol(Rol remitenteRol) {
        this.remitenteRol = remitenteRol;
    }

    public String getContenido() {
        return contenido;
    }

    public void setContenido(String contenido) {
        this.contenido = contenido;
    }

    public LocalDateTime getFechaEnvio() {
        return fechaEnvio;
    }

    public void setFechaEnvio(LocalDateTime fechaEnvio) {
        this.fechaEnvio = fechaEnvio;
    }
}
