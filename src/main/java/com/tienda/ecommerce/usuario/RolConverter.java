package com.tienda.ecommerce.usuario;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class RolConverter implements AttributeConverter<Rol, String> {
    public String convertToDatabaseColumn(Rol rol) { return rol == null ? null : rol.name(); }
    public Rol convertToEntityAttribute(String codigo) { return codigo == null ? null : Rol.valueOf(codigo); }
}
