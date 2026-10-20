package com.tienda.ecommerce.usuario;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "usuarios")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Nombres de pila. Junto a los apellidos forma el nombre completo. */
    @Column(nullable = false, length = 100)
    private String nombres;

    @Column(name = "apellido_paterno", nullable = false, length = 100)
    private String apellidoPaterno;

    @Column(name = "apellido_materno", length = 100)
    private String apellidoMaterno;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_documento", nullable = false, length = 5)
    private TipoDocumento tipoDocumento = TipoDocumento.DNI;

    @Column(name = "numero_documento", nullable = false, length = 12)
    private String numeroDocumento;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Convert(converter = RolConverter.class)
    @Column(nullable = false, length = 40)
    private Rol rol;

    @Column(nullable = false)
    private boolean activo = true;

    @Column(name = "fecha_registro", nullable = false, updatable = false)
    private LocalDateTime fechaRegistro = LocalDateTime.now();

    public Usuario() {
    }

    public Usuario(Long id, String nombre, String email, String passwordHash, Rol rol, boolean activo) {
        this.id = id;
        setNombre(nombre);
        this.email = email;
        this.passwordHash = passwordHash;
        this.rol = rol;
        this.activo = activo;
        this.fechaRegistro = LocalDateTime.now();
    }

    public Usuario(Long id, String nombres, String apellidoPaterno, String apellidoMaterno,
                   TipoDocumento tipoDocumento, String numeroDocumento,
                   String email, String passwordHash, Rol rol, boolean activo) {
        this.id = id;
        this.nombres = nombres != null ? nombres.trim() : null;
        this.apellidoPaterno = apellidoPaterno != null ? apellidoPaterno.trim() : null;
        this.apellidoMaterno = apellidoMaterno != null && !apellidoMaterno.trim().isEmpty()
                ? apellidoMaterno.trim() : null;
        this.tipoDocumento = tipoDocumento != null ? tipoDocumento : TipoDocumento.DNI;
        this.numeroDocumento = numeroDocumento != null ? numeroDocumento.trim() : null;
        this.email = email;
        this.passwordHash = passwordHash;
        this.rol = rol;
        this.activo = activo;
        this.fechaRegistro = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    /**
     * Nombre completo derivado (no es columna: evita dato duplicado).
     * Se mantiene el nombre getNombre para no romper JWT, chat y reportes.
     */
    @Transient
    public String getNombre() {
        return unirNombreCompleto(nombres, apellidoPaterno, apellidoMaterno);
    }

    public void setNombre(String nombre) {
        String[] partes = dividirNombreCompleto(nombre);
        this.nombres = partes[0];
        this.apellidoPaterno = partes[1];
        this.apellidoMaterno = partes[2];
    }

    /** Nombre completo derivado (nombres + apellidos). */
    public String getNombreCompleto() {
        return unirNombreCompleto(nombres, apellidoPaterno, apellidoMaterno);
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

    private static String unirNombreCompleto(String nombres, String paterno, String materno) {
        StringBuilder sb = new StringBuilder();
        if (nombres != null && !nombres.trim().isEmpty()) {
            sb.append(nombres.trim());
        }
        if (paterno != null && !paterno.trim().isEmpty()) {
            if (sb.length() > 0) {
                sb.append(' ');
            }
            sb.append(paterno.trim());
        }
        if (materno != null && !materno.trim().isEmpty()) {
            if (sb.length() > 0) {
                sb.append(' ');
            }
            sb.append(materno.trim());
        }
        return sb.toString();
    }

    private static String[] dividirNombreCompleto(String nombreCompleto) {
        if (nombreCompleto == null || nombreCompleto.trim().isEmpty()) {
            return new String[]{null, null, null};
        }
        String[] tokens = nombreCompleto.trim().split("\\s+");
        String nombres = tokens.length > 0 ? tokens[0] : null;
        String paterno = tokens.length > 1 ? tokens[1] : null;
        String materno = null;
        if (tokens.length > 2) {
            materno = String.join(" ", java.util.Arrays.copyOfRange(tokens, 2, tokens.length));
        }
        return new String[]{nombres, paterno, materno};
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public Rol getRol() {
        return rol;
    }

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
