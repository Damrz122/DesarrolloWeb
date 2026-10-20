package com.tienda.ecommerce.pago;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "metodos_pago_config")
public class MetodoPagoConfig {
    @Id
    @Column(length = 50)
    private String codigo;
    @Column(nullable = false, length = 100)
    private String nombre;
    @Column(length = 255)
    private String descripcion;
    @Column(columnDefinition = "TEXT")
    private String instrucciones;
    @Column(nullable = false, length = 30)
    private String procesamiento;
    @Column(name = "requiere_referencia", nullable = false)
    private boolean requiereReferencia;
    @Column(name = "etiqueta_referencia", length = 100)
    private String etiquetaReferencia;
    @Column(name = "prefijo_transaccion", nullable = false, length = 20)
    private String prefijoTransaccion;
    @Column(nullable = false, length = 40)
    private String icono;
    @Column(name = "formulario_json", nullable = false, columnDefinition = "TEXT")
    private String formularioJson = "[]";
    @Column(nullable = false)
    private int orden;
    @Column(nullable = false)
    private boolean activo = true;
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "metodo_pago_monedas", joinColumns = @JoinColumn(name = "metodo_codigo"))
    @Column(name = "moneda_codigo", length = 3)
    private java.util.Set<String> monedas = new java.util.LinkedHashSet<>();
    public java.util.Set<String> getMonedas() { return monedas; }
    public void setMonedas(java.util.Set<String> monedas) { this.monedas = new java.util.LinkedHashSet<>(monedas); }
    @Column(name = "creado_en", nullable = false, updatable = false)
    private LocalDateTime creadoEn;
    @Column(name = "actualizado_en", nullable = false)
    private LocalDateTime actualizadoEn;
    public String getCodigo() { return codigo; }
    public void setCodigo(String codigo) { this.codigo = codigo; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
    public String getInstrucciones() { return instrucciones; }
    public void setInstrucciones(String instrucciones) { this.instrucciones = instrucciones; }
    public String getProcesamiento() { return procesamiento; }
    public void setProcesamiento(String procesamiento) { this.procesamiento = procesamiento; }
    public boolean isRequiereReferencia() { return requiereReferencia; }
    public void setRequiereReferencia(boolean requiereReferencia) { this.requiereReferencia = requiereReferencia; }
    public String getEtiquetaReferencia() { return etiquetaReferencia; }
    public void setEtiquetaReferencia(String etiquetaReferencia) { this.etiquetaReferencia = etiquetaReferencia; }
    public String getPrefijoTransaccion() { return prefijoTransaccion; }
    public void setPrefijoTransaccion(String prefijoTransaccion) { this.prefijoTransaccion = prefijoTransaccion; }
    public String getIcono() { return icono; }
    public void setIcono(String icono) { this.icono = icono; }
    public String getFormularioJson() { return formularioJson; }
    public void setFormularioJson(String formularioJson) { this.formularioJson = formularioJson; }
    public int getOrden() { return orden; }
    public void setOrden(int orden) { this.orden = orden; }
    public boolean isActivo() { return activo; }
    public void setActivo(boolean activo) { this.activo = activo; }
    @PrePersist void alCrear() { creadoEn = actualizadoEn = LocalDateTime.now(); }
    @PreUpdate void alActualizar() { actualizadoEn = LocalDateTime.now(); }
}
