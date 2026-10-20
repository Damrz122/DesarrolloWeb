package com.tienda.ecommerce.configuracion;

import jakarta.persistence.*;
import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "roles_config")
public class RolConfig {
    @Id @Column(length = 40) private String codigo;
    @Column(nullable = false, length = 80, unique = true) private String nombre;
    private String descripcion;
    @Column(nullable = false) private boolean sistema;
    @Column(nullable = false) private boolean activo = true;
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "rol_permisos", joinColumns = @JoinColumn(name = "rol_codigo"))
    @Column(name = "permiso_codigo", length = 80)
    private Set<String> permisos = new LinkedHashSet<>();
    public String getCodigo() { return codigo; } public void setCodigo(String v) { codigo = v; }
    public String getNombre() { return nombre; } public void setNombre(String v) { nombre = v; }
    public String getDescripcion() { return descripcion; } public void setDescripcion(String v) { descripcion = v; }
    public boolean isSistema() { return sistema; } public void setSistema(boolean v) { sistema = v; }
    public boolean isActivo() { return activo; } public void setActivo(boolean v) { activo = v; }
    public Set<String> getPermisos() { return permisos; } public void setPermisos(Set<String> v) { permisos = new LinkedHashSet<>(v); }
}
