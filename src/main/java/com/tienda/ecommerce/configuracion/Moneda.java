package com.tienda.ecommerce.configuracion;

import jakarta.persistence.*;

@Entity
@Table(name = "monedas")
public class Moneda {
    @Id @Column(length = 3) private String codigo;
    @Column(nullable = false, length = 80) private String nombre;
    @Column(nullable = false, length = 12) private String simbolo;
    @Column(nullable = false, length = 20) private String locale;
    @Column(nullable = false) private int decimales;
    @Column(nullable = false) private boolean activa = true;
    public String getCodigo() { return codigo; } public void setCodigo(String v) { codigo = v; }
    public String getNombre() { return nombre; } public void setNombre(String v) { nombre = v; }
    public String getSimbolo() { return simbolo; } public void setSimbolo(String v) { simbolo = v; }
    public String getLocale() { return locale; } public void setLocale(String v) { locale = v; }
    public int getDecimales() { return decimales; } public void setDecimales(int v) { decimales = v; }
    public boolean isActiva() { return activa; } public void setActiva(boolean v) { activa = v; }
}
