package com.tienda.ecommerce.usuario.dto;

import com.tienda.ecommerce.usuario.Rol;
import jakarta.validation.constraints.NotNull;

public class CambiarRolRequest {

    @NotNull(message = "El nuevo rol es obligatorio")
    private Rol rol;

    public CambiarRolRequest() {
    }

    public CambiarRolRequest(Rol rol) {
        this.rol = rol;
    }

    public Rol getRol() {
        return rol;
    }

    public void setRol(Rol rol) {
        this.rol = rol;
    }
}
