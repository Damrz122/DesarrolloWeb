package com.tienda.ecommerce.config;

import com.tienda.ecommerce.configuracion.*;
import com.tienda.ecommerce.pago.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import java.util.Set;

/** H2 no ejecuta migraciones PostgreSQL: instala únicamente los catálogos de prueba. */
@Component @Profile("test") @Order(0)
public class CatalogosPruebaInitializer implements CommandLineRunner {
    private final MonedaRepository monedas; private final RolConfigRepository roles; private final MetodoPagoConfigRepository metodos;
    public CatalogosPruebaInitializer(MonedaRepository monedas, RolConfigRepository roles, MetodoPagoConfigRepository metodos) { this.monedas=monedas;this.roles=roles;this.metodos=metodos; }
    public void run(String... args) {
        for(String c : Set.of("PEN","USD")) if(!monedas.existsById(c)) { Moneda m=new Moneda();m.setCodigo(c);m.setNombre(c);m.setSimbolo(c);m.setLocale("es-PE");m.setDecimales(2);monedas.save(m); }
        for(String c : Set.of("ADMIN","CLIENTE")) if(!roles.existsById(c)) {RolConfig r=new RolConfig();r.setCodigo(c);r.setNombre(c);r.setSistema(true);r.setPermisos(c.equals("ADMIN")?AccesoService.PERMISOS:Set.of("COMPRAR"));roles.save(r);}
        for(String c : Set.of("TARJETA_CREDITO","YAPE","PLIN","TRANSFERENCIA_BANCARIA","PAGO_CONTRAENTREGA")) if(!metodos.existsById(c)) {
            MetodoPagoConfig m=new MetodoPagoConfig();m.setCodigo(c);m.setNombre(c);m.setProcesamiento(c.equals("TARJETA_CREDITO")?"SIMULADO":c.equals("PAGO_CONTRAENTREGA")?"CONTRA_ENTREGA":"VERIFICACION_MANUAL");m.setPrefijoTransaccion("TX-");m.setIcono("PAGO");m.setMonedas(Set.of("PEN","USD"));m.setRequiereReferencia(m.getProcesamiento().equals("VERIFICACION_MANUAL"));metodos.save(m);
        }
    }
}
