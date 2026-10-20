package com.tienda.ecommerce.carrito;

import com.tienda.ecommerce.carrito.dto.CarritoResponse;
import com.tienda.ecommerce.carrito.dto.ItemCarritoRequest;
import com.tienda.ecommerce.common.StockInsuficienteException;
import com.tienda.ecommerce.producto.Categoria;
import com.tienda.ecommerce.producto.Producto;
import com.tienda.ecommerce.producto.ProductoRepository;
import com.tienda.ecommerce.usuario.Rol;
import com.tienda.ecommerce.usuario.Usuario;
import com.tienda.ecommerce.usuario.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CarritoServiceTest {

    @Mock
    private CarritoRepository carritoRepository;

    @Mock
    private ItemCarritoRepository itemCarritoRepository;

    @Mock
    private ProductoRepository productoRepository;

    @Mock
    private UsuarioRepository usuarioRepository;
    @Mock private com.tienda.ecommerce.configuracion.MonetarioService dinero;
    @Mock private jakarta.persistence.EntityManager entityManager;

    @InjectMocks
    private CarritoServiceImpl carritoService;

    private Usuario usuario;
    private Producto producto;
    private Carrito carrito;

    @BeforeEach
    void setUp() {
        lenient().when(dinero.tasa(any(),any())).thenReturn(BigDecimal.ONE);
        lenient().when(dinero.redondear(any(),any())).thenAnswer(i -> i.getArgument(0));
        usuario = new Usuario(1L, "Juan Pérez", "juan@ejemplo.com", "pass123", Rol.CLIENTE, true);
        Categoria cat = new Categoria(1L, "Audio", "Audífonos");
        producto = new Producto(10L, "Audífonos Sony", "Inalámbricos", BigDecimal.valueOf(200.00), 5, "audio.jpg", cat, true);
        carrito = new Carrito(1L, usuario);
    }

    @Test
    @DisplayName("Debe obtener o inicializar el carrito del usuario")
    void obtenerCarrito_exitoso() {
        when(carritoRepository.findByUsuarioIdConItems(1L)).thenReturn(Optional.of(carrito));

        CarritoResponse response = carritoService.obtenerCarrito(1L);

        assertNotNull(response);
        assertEquals(0, response.getItems().size());
        assertEquals(BigDecimal.ZERO, response.getTotal());
        verify(carritoRepository, times(1)).findByUsuarioIdConItems(1L);
    }

    @Test
    @DisplayName("Debe agregar ítem al carrito si hay stock suficiente")
    void agregarItem_exitoso() {
        ItemCarritoRequest request = new ItemCarritoRequest(10L, 2);

        when(productoRepository.findByIdAndActivoTrue(10L)).thenReturn(Optional.of(producto));
        when(carritoRepository.findByUsuarioIdConItems(1L)).thenReturn(Optional.of(carrito));
        when(carritoRepository.save(any(Carrito.class))).thenAnswer(i -> i.getArgument(0));

        CarritoResponse response = carritoService.agregarItem(1L, request);

        assertNotNull(response);
        assertEquals(1, response.getItems().size());
        assertEquals(2, response.getCantidadTotal());
        assertEquals(0, new BigDecimal("400.00").compareTo(response.getTotal()));
        verify(carritoRepository, times(1)).save(any(Carrito.class));
    }

    @Test
    @DisplayName("Debe lanzar StockInsuficienteException si se solicita más de lo disponible")
    void agregarItem_stockInsuficiente() {
        ItemCarritoRequest request = new ItemCarritoRequest(10L, 10); // Stock es 5

        when(productoRepository.findByIdAndActivoTrue(10L)).thenReturn(Optional.of(producto));
        when(carritoRepository.findByUsuarioIdConItems(1L)).thenReturn(Optional.of(carrito));

        assertThrows(StockInsuficienteException.class, () -> carritoService.agregarItem(1L, request));
        verify(carritoRepository, never()).save(any(Carrito.class));
    }
}
