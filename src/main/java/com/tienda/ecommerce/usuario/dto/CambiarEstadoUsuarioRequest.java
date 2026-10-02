package com.tienda.ecommerce.usuario.dto;

import jakarta.validation.constraints.NotNull;

public class CambiarEstadoUsuarioRequest {

    @NotNull(message = "El estado es obligatorio")
    private Boolean activo;

    public CambiarEstadoUsuarioRequest() {
    }

    public CambiarEstadoUsuarioRequest(Boolean activo) {
        this.activo = activo;
    }

    public Boolean getActivo() {
        return activo;
    }

    public void setActivo(Boolean activo) {
        this.activo = activo;
    }
}
