package com.tienda.ecommerce.usuario.dto;

import com.tienda.ecommerce.usuario.Rol;
import com.tienda.ecommerce.usuario.TipoDocumento;
import java.time.LocalDateTime;

public class UsuarioResponse {

    private Long id;
    private String nombre;
    private String nombres;
    private String apellidoPaterno;
    private String apellidoMaterno;
    private TipoDocumento tipoDocumento;
    private String numeroDocumento;
    private String email;
    private Rol rol;
    private java.util.Set<String> permisos = java.util.Set.of();
    private boolean activo;
    private LocalDateTime fechaRegistro;

    public UsuarioResponse() {
    }

    public UsuarioResponse(Long id, String nombre, String email, Rol rol, boolean activo, LocalDateTime fechaRegistro) {
        this.id = id;
        this.nombre = nombre;
        this.email = email;
        this.rol = rol;
        this.activo = activo;
        this.fechaRegistro = fechaRegistro;
    }

    public UsuarioResponse(Long id, String nombre, String nombres, String apellidoPaterno, String apellidoMaterno,
                           TipoDocumento tipoDocumento, String numeroDocumento,
                           String email, Rol rol, boolean activo, LocalDateTime fechaRegistro) {
        this.id = id;
        this.nombre = nombre;
        this.nombres = nombres;
        this.apellidoPaterno = apellidoPaterno;
        this.apellidoMaterno = apellidoMaterno;
        this.tipoDocumento = tipoDocumento;
        this.numeroDocumento = numeroDocumento;
        this.email = email;
        this.rol = rol;
        this.activo = activo;
        this.fechaRegistro = fechaRegistro;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getNombres() {
        return nombres;
    }

    public void setNombres(String nombres) {
        this.nombres = nombres;
    }

    public String getApellidoPaterno() {
        return apellidoPaterno;
    }

    public void setApellidoPaterno(String apellidoPaterno) {
        this.apellidoPaterno = apellidoPaterno;
    }

    public String getApellidoMaterno() {
        return apellidoMaterno;
    }

    public void setApellidoMaterno(String apellidoMaterno) {
        this.apellidoMaterno = apellidoMaterno;
    }

    public TipoDocumento getTipoDocumento() {
        return tipoDocumento;
    }

    public void setTipoDocumento(TipoDocumento tipoDocumento) {
        this.tipoDocumento = tipoDocumento;
    }

    public String getNumeroDocumento() {
        return numeroDocumento;
    }

    public void setNumeroDocumento(String numeroDocumento) {
        this.numeroDocumento = numeroDocumento;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public Rol getRol() {
        return rol;
    }
    public java.util.Set<String> getPermisos() { return permisos; }
    public void setPermisos(java.util.Set<String> permisos) { this.permisos = permisos; }

    public void setRol(Rol rol) {
        this.rol = rol;
    }

    public boolean isActivo() {
        return activo;
    }

    public void setActivo(boolean activo) {
        this.activo = activo;
    }

    public LocalDateTime getFechaRegistro() {
        return fechaRegistro;
    }

    public void setFechaRegistro(LocalDateTime fechaRegistro) {
        this.fechaRegistro = fechaRegistro;
    }
}
