package com.tienda.ecommerce.auth;

import com.tienda.ecommerce.common.TooManyRequestsException;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class LoginAttemptService {

    private static final int MAX_INTENTOS = 5;
    private static final long TIEMPO_BLOQUEO_SEGUNDOS = 60;

    private static class Intento {
        int contador;
        Instant primerIntento;
        Instant bloqueadoHasta;

        Intento() {
            this.contador = 1;
            this.primerIntento = Instant.now();
        }
    }

    private final ConcurrentHashMap<String, Intento> intentos = new ConcurrentHashMap<>();

    public void verificarBloqueo(String clave) {
        if (clave == null || clave.isBlank()) return;
        Intento intento = intentos.get(clave);
        if (intento != null && intento.bloqueadoHasta != null) {
            if (Instant.now().isBefore(intento.bloqueadoHasta)) {
                long segundosRestantes = intento.bloqueadoHasta.getEpochSecond() - Instant.now().getEpochSecond();
                throw new TooManyRequestsException("Demasiados intentos fallidos. Intente nuevamente en " + Math.max(1, segundosRestantes) + " segundos.");
            } else {
                intentos.remove(clave);
            }
        }
    }

    public void registrarFallo(String clave) {
        if (clave == null || clave.isBlank()) return;
        intentos.compute(clave, (k, intento) -> {
            Instant ahora = Instant.now();
            if (intento == null) {
                return new Intento();
            }
            if (intento.primerIntento.plusSeconds(TIEMPO_BLOQUEO_SEGUNDOS).isBefore(ahora)) {
                return new Intento();
            }
            intento.contador++;
            if (intento.contador >= MAX_INTENTOS) {
                intento.bloqueadoHasta = ahora.plusSeconds(TIEMPO_BLOQUEO_SEGUNDOS);
            }
            return intento;
        });
    }

    public void registrarExito(String clave) {
        if (clave != null) {
            intentos.remove(clave);
        }
    }
}
