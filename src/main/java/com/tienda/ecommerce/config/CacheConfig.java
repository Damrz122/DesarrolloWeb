package com.tienda.ecommerce.config;

import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.jsontype.BasicPolymorphicTypeValidator;
import com.fasterxml.jackson.databind.jsontype.PolymorphicTypeValidator;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CachingConfigurer;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.interceptor.CacheErrorHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

/**
 * Configuración de Caché Distribuido con Redis (Patrón Cache-Aside).
 * Implementa CachingConfigurer con CacheErrorHandler para tolerancia a fallas:
 * si Redis no está disponible o falla temporalmente, la aplicación continúa
 * operando consultando directamente la base de datos PostgreSQL (Graceful Degradation).
 */
@Configuration
@EnableCaching
@Profile("!test | redis-test")
public class CacheConfig implements CachingConfigurer {

    private static final Logger log = LoggerFactory.getLogger(CacheConfig.class);

    public static final String CACHE_CATEGORIAS = "categorias";
    public static final String CACHE_PRODUCTOS = "productos";
    public static final String CACHE_PRODUCTOS_DESTACADOS = "productos_destacados";

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        GenericJackson2JsonRedisSerializer jsonSerializer = catalogSerializer();

        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
                .computePrefixWith(name -> "electronix:v2:" + name + "::")
                .entryTtl(Duration.ofMinutes(10))
                .disableCachingNullValues()
                .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(jsonSerializer));

        Map<String, RedisCacheConfiguration> cacheConfigurations = new HashMap<>();
        cacheConfigurations.put(CACHE_CATEGORIAS, defaultConfig.entryTtl(Duration.ofMinutes(30)));
        cacheConfigurations.put(CACHE_PRODUCTOS, defaultConfig.entryTtl(Duration.ofMinutes(10)));
        cacheConfigurations.put(CACHE_PRODUCTOS_DESTACADOS, defaultConfig.entryTtl(Duration.ofMinutes(5)));

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaultConfig)
                .withInitialCacheConfigurations(cacheConfigurations)
                .build();
    }

    public static GenericJackson2JsonRedisSerializer catalogSerializer() {
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        // Nunca autorizar Object como tipo base: anularía la lista de subtipos.
        PolymorphicTypeValidator ptv = BasicPolymorphicTypeValidator.builder()
                .allowIfSubType(com.tienda.ecommerce.producto.dto.ProductoResponse.class)
                .allowIfSubType(com.tienda.ecommerce.producto.dto.CategoriaResponse.class)
                .allowIfSubType(java.util.ArrayList.class)
                .allowIfSubType("java.util.ImmutableCollections$")
                .allowIfSubType(java.math.BigDecimal.class)
                .allowIfSubType(java.time.LocalDateTime.class)
                .allowIfSubType(Long.class)
                .allowIfSubType(Integer.class)
                .allowIfSubType(Boolean.class)
                .allowIfSubType(String.class)
                .build();

        objectMapper.activateDefaultTyping(
                ptv,
                ObjectMapper.DefaultTyping.EVERYTHING,
                JsonTypeInfo.As.PROPERTY
        );

        return new GenericJackson2JsonRedisSerializer(objectMapper);
    }

    /**
     * Tolerancia a fallas: si Redis se desconecta, no arroja 500 al cliente,
     * sino que degrada suavemente hacia PostgreSQL.
     */
    @Override
    public CacheErrorHandler errorHandler() {
        return new CacheErrorHandler() {
            @Override
            public void handleCacheGetError(RuntimeException exception, org.springframework.cache.Cache cache, Object key) {
                log.warn("Redis GET error en cache '{}' para key '{}'. Degradando a PostgreSQL. Causa: {}",
                        cache.getName(), key, exception.getMessage());
            }

            @Override
            public void handleCachePutError(RuntimeException exception, org.springframework.cache.Cache cache, Object key, Object value) {
                log.warn("Redis PUT error en cache '{}' para key '{}'. Causa: {}",
                        cache.getName(), key, exception.getMessage());
            }

            @Override
            public void handleCacheEvictError(RuntimeException exception, org.springframework.cache.Cache cache, Object key) {
                log.error("Fallo crítico desalojando clave '{}' de cache '{}'. Propagando error para evitar inconsistencias: {}",
                        key, cache.getName(), exception.getMessage(), exception);
                throw exception;
            }

            @Override
            public void handleCacheClearError(RuntimeException exception, org.springframework.cache.Cache cache) {
                log.error("Fallo crítico limpiando cache '{}'. Propagando error: {}",
                        cache.getName(), exception.getMessage(), exception);
                throw exception;
            }
        };
    }
}
