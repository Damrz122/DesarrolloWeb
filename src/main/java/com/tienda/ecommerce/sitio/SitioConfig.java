package com.tienda.ecommerce.sitio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

// sitio config: tabla clave-valor para lo editable del home (hero, cards, colores, logo).
@Entity
@Table(name = "sitio_config")
public class SitioConfig {

    @Id
    @Column(length = 80)
    private String clave;

    // Los diseños visuales contienen capas y ajustes; VARCHAR(20000) los truncaba
    // silenciosamente al publicar una sección con varias tarjetas.
    @Column(columnDefinition = "TEXT")
    private String valor;

    @Column(name = "actualizado", nullable = false)
    private LocalDateTime actualizado = LocalDateTime.now();

    public SitioConfig() {
    }

    public SitioConfig(String clave, String valor) {
        this.clave = clave;
        this.valor = valor;
        this.actualizado = LocalDateTime.now();
    }

    public String getClave() {
        return clave;
    }

    public void setClave(String clave) {
        this.clave = clave;
    }

    public String getValor() {
        return valor;
    }

    public void setValor(String valor) {
        this.valor = valor;
    }

    public LocalDateTime getActualizado() {
        return actualizado;
    }

    public void setActualizado(LocalDateTime actualizado) {
        this.actualizado = actualizado;
    }
}
