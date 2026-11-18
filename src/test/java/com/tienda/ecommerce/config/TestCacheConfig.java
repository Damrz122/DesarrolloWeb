package com.tienda.ecommerce.config;

import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * Aísla las pruebas de Redis: usan una caché en memoria equivalente.
 * La configuración distribuida de producción sigue en CacheConfig.
 */
@Configuration
@EnableCaching
@Profile("test & !redis-test")
public class TestCacheConfig {

    @Bean
    public CacheManager cacheManager() {
        return new ConcurrentMapCacheManager(
                CacheConfig.CACHE_CATEGORIAS,
                CacheConfig.CACHE_PRODUCTOS,
                CacheConfig.CACHE_PRODUCTOS_DESTACADOS
        );
    }
}
