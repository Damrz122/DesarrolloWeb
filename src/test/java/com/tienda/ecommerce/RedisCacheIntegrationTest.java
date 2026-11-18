package com.tienda.ecommerce;

import com.tienda.ecommerce.carrito.CarritoService;
import com.tienda.ecommerce.carrito.dto.ItemCarritoRequest;
import com.tienda.ecommerce.config.CacheConfig;
import com.tienda.ecommerce.pago.FormularioPagoService;
import com.tienda.ecommerce.pago.MetodoPagoConfigRepository;
import com.tienda.ecommerce.pedido.CotizacionService;
import com.tienda.ecommerce.pedido.PedidoService;
import com.tienda.ecommerce.pedido.dto.CrearPedidoRequest;
import com.tienda.ecommerce.producto.*;
import com.tienda.ecommerce.producto.dto.CategoriaRequest;
import com.tienda.ecommerce.usuario.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.cache.CacheManager;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.utility.DockerImageName;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.Map;

import static org.awaitility.Awaitility.await;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Redis real y desechable; H2 aislado para no comprar ni alterar inventario real. Requiere Docker. */
@SpringBootTest(properties = {"management.health.redis.enabled=true", "spring.jpa.show-sql=false",
        "spring.datasource.url=jdbc:h2:mem:redis-tests;MODE=PostgreSQL;DB_CLOSE_DELAY=-1"})
@ActiveProfiles({"test", "redis-test"})
@Transactional
class RedisCacheIntegrationTest {
    static final GenericContainer<?> REDIS = new GenericContainer<>(DockerImageName.parse("redis:7-alpine"))
            .withExposedPorts(6379).withCommand("redis-server", "--requirepass", "isolated-redis-test-only");
    static { REDIS.start(); }

    @DynamicPropertySource
    static void redisProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.data.redis.host", REDIS::getHost);
        registry.add("spring.data.redis.port", () -> REDIS.getMappedPort(6379));
        registry.add("spring.data.redis.password", () -> "isolated-redis-test-only");
    }

    @AfterAll static void stopRedis() { REDIS.stop(); }

    @Autowired CacheManager caches;
    @Autowired StringRedisTemplate redis;
    @Autowired ProductoService catalogo;
    @Autowired CategoriaService categorias;
    @Autowired InventarioService inventario;
    @SpyBean ProductoRepository productos;
    @SpyBean CategoriaRepository categoriaRepository;
    @Autowired UsuarioRepository usuarios;
    @Autowired CarritoService carritos;
    @Autowired CotizacionService cotizaciones;
    @Autowired PedidoService pedidos;
    @Autowired FormularioPagoService formularios;
    @Autowired MetodoPagoConfigRepository metodos;

    @BeforeEach void clearIsolatedCaches() {
        caches.getCacheNames().forEach(name -> caches.getCache(name).clear());
        assertInstanceOf(org.springframework.data.redis.cache.RedisCacheManager.class, caches);
        assertEquals("PONG", redis.getConnectionFactory().getConnection().ping());
    }

    private Producto producto() {
        var c = categoriaRepository.saveAndFlush(new Categoria(null, "Redis prueba", "Aislada"));
        return productos.saveAndFlush(new Producto(null, "Producto Redis", "Prueba",
                new BigDecimal("100.00"), 20, "/assets/img/logo.svg", c, true));
    }

    private String key(Long id) { return "electronix:v2:productos::" + id; }

    @Test void cacheHitTtlExpiracionEInvalidacionDeStock() {
        var p = producto();
        clearInvocations(productos);
        var primero = catalogo.obtenerPorIdPublico(p.getId());
        var segundo = catalogo.obtenerPorIdPublico(p.getId());
        assertEquals(primero.getPrecio(), segundo.getPrecio());
        assertEquals(primero.getFechaCreacion(), segundo.getFechaCreacion());
        assertEquals(primero.getImagenes(), segundo.getImagenes());
        verify(productos, times(1)).findByIdAndActivoTrue(p.getId());
        assertTrue(redis.hasKey(key(p.getId())), "Debe existir la entrada en Redis, no solo en memoria");
        assertTrue(redis.getExpire(key(p.getId())) > 590);
        assertTrue(redis.getExpire(key(p.getId())) <= 600);
        redis.expire(key(p.getId()), Duration.ofMillis(40));
        await().atMost(Duration.ofSeconds(3)).until(() -> !Boolean.TRUE.equals(redis.hasKey(key(p.getId()))));
        catalogo.obtenerPorIdPublico(p.getId());
        verify(productos, times(2)).findByIdAndActivoTrue(p.getId());
        inventario.actualizar(p.getId(), 7);
        assertFalse(redis.hasKey(key(p.getId())));
        assertEquals(7, catalogo.obtenerPorIdPublico(p.getId()).getStock());
    }

    @Test void listaInmutableDeCategoriasSeRecuperaDeRedisYSeInvalidaAlEditar() {
        var c = categorias.crear(new CategoriaRequest("Categoria Redis", "Antes"));
        clearInvocations(categoriaRepository);
        assertFalse(categorias.listarTodas().isEmpty());
        assertFalse(categorias.listarTodas().isEmpty());
        verify(categoriaRepository, times(1)).findAll();
        assertTrue(redis.hasKey("electronix:v2:categorias::todas"));
        assertTrue(redis.getExpire("electronix:v2:categorias::todas") > 1790);
        categorias.actualizar(c.getId(), new CategoriaRequest("Categoria editada", "Después"));
        assertFalse(redis.hasKey("electronix:v2:categorias::todas"));
        assertTrue(categorias.listarTodas().stream().anyMatch(dto -> dto.getNombre().equals("Categoria editada")));
    }

    @Test void compraAisladaInvalidaElProductoInclusoDespuesDeVaciarElCarrito() {
        var p = producto();
        var u = usuarios.saveAndFlush(new Usuario(null, "Cliente", "Redis", null, TipoDocumento.DNI,
                "98765432", "redis@example.test", "hash-no-usado", Rol.CLIENTE, true));
        carritos.agregarItem(u.getId(), new ItemCarritoRequest(p.getId(), 2));
        var q = cotizaciones.generar(u.getId(), "PEN");
        catalogo.obtenerPorIdPublico(p.getId());
        assertTrue(redis.hasKey(key(p.getId())));
        var request = new CrearPedidoRequest("Calle aislada 123", "987654321");
        request.setCotizacionToken(q.token());
        request.setMetodoPago("PAGO_CONTRAENTREGA");
        request.setVersionMetodo(formularios.version(metodos.findById("PAGO_CONTRAENTREGA").orElseThrow()));
        request.setDatosPago(Map.of());
        var pedido = pedidos.crearDesdeCarrito(u.getId(), request);
        assertNotNull(pedido.getId());
        assertTrue(carritos.obtenerCarrito(u.getId()).getItems().isEmpty());
        assertFalse(redis.hasKey(key(p.getId())));
        assertEquals(18, catalogo.obtenerPorIdPublico(p.getId()).getStock());
    }
}
