package com.tienda.ecommerce.configuracion;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
@Entity @Table(name="tipos_cambio")
public class TipoCambio {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(name="moneda_origen",nullable=false,length=3) private String monedaOrigen;
 @Column(name="moneda_destino",nullable=false,length=3) private String monedaDestino;
 @Column(nullable=false,precision=19,scale=8) private BigDecimal tasa;
 @Column(name="vigente_desde",nullable=false) private LocalDateTime vigenteDesde=LocalDateTime.now();
 @Column(nullable=false) private boolean activo=true;
 public Long getId(){return id;} public String getMonedaOrigen(){return monedaOrigen;} public void setMonedaOrigen(String v){monedaOrigen=v;}
 public String getMonedaDestino(){return monedaDestino;} public void setMonedaDestino(String v){monedaDestino=v;}
 public BigDecimal getTasa(){return tasa;} public void setTasa(BigDecimal v){tasa=v;}
 public LocalDateTime getVigenteDesde(){return vigenteDesde;} public void setVigenteDesde(LocalDateTime v){vigenteDesde=v;}
 public boolean isActivo(){return activo;} public void setActivo(boolean v){activo=v;}
}
