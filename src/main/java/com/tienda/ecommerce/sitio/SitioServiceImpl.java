package com.tienda.ecommerce.sitio;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

// sitio service: solo acepta claves conocidas para no ensuciar la tabla.
@Service
public class SitioServiceImpl implements SitioService {

    public static final Set<String> CLAVES = Set.of(
            "site.nombre",
            "site.logo",
            "tema.primario",
            "tema.secundario",
            "hero.slides",
            "home.cards",
            "home.equipos.titulo",
            "home.equipos",
            "home.banners",
            "home.spotlight"
    );

    private final SitioConfigRepository sitioConfigRepository;

    public SitioServiceImpl(SitioConfigRepository sitioConfigRepository) {
        this.sitioConfigRepository = sitioConfigRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, String> obtenerTodo() {
        List<SitioConfig> filas = sitioConfigRepository.findAll();
        Map<String, String> mapa = new LinkedHashMap<>();
        for (SitioConfig fila : filas) {
            mapa.put(fila.getClave(), fila.getValor());
        }
        return mapa;
    }

    @Override
    @Transactional
    public Map<String, String> guardarTodo(Map<String, String> cambios) {
        if (cambios != null) {
            for (Map.Entry<String, String> e : cambios.entrySet()) {
                if (e.getKey() == null || !CLAVES.contains(e.getKey())) {
                    continue;
                }
                String valor = e.getValue() == null ? "" : e.getValue();
                // No se trunca el JSON: un diseño parcial rompe la sección al leerlo.
                // TEXT permite conservar una sección completa con sus cinco tarjetas.
                if (valor.length() > 150000) {
                    throw new IllegalArgumentException("La configuración visual supera el límite de 150000 caracteres");
                }
                SitioConfig fila = sitioConfigRepository.findById(e.getKey())
                        .orElse(new SitioConfig(e.getKey(), valor));
                fila.setValor(valor);
                fila.setActualizado(LocalDateTime.now());
                sitioConfigRepository.save(fila);
            }
        }
        return obtenerTodo();
    }
}
