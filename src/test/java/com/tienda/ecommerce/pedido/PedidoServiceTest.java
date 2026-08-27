package com.tienda.ecommerce.pedido;

import com.tienda.ecommerce.carrito.Carrito;
import com.tienda.ecommerce.carrito.CarritoRepository;
import com.tienda.ecommerce.carrito.CarritoService;
import com.tienda.ecommerce.carrito.ItemCarrito;
import com.tienda.ecommerce.common.BadRequestException;
import com.tienda.ecommerce.common.StockInsuficienteException;
import com.tienda.ecommerce.pedido.dto.CrearPedidoRequest;
import com.tienda.ecommerce.pedido.dto.PedidoResponse;
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
class PedidoServiceTest {

    @Mock
    private PedidoRepository pedidoRepository;

    @Mock
    private ProductoRepository productoRepository;

    @Mock
    private CarritoRepository carritoRepository;

    @Mock
    private CarritoService carritoService;

    @Mock
    private UsuarioRepository usuarioRepository;

    @InjectMocks
    private PedidoServiceImpl pedidoService;

    private Usuario usuario;
    private Producto producto;
    private Carrito carrito;

    @BeforeEach
    void setUp() {
        usuario = new Usuario(1L, "María Gomez", "maria@ejemplo.com", "pass123", Rol.CLIENTE, true);
        Categoria cat = new Categoria(1L, "Periféricos", "Mouse");
        producto = new Producto(5L, "Mouse Logitech", "Mouse inalámbrico", BigDecimal.valueOf(150.00), 10, "mouse.jpg", cat, true);

        carrito = new Carrito(1L, usuario);
        ItemCarrito item = new ItemCarrito(100L, carrito, producto, 2);
        carrito.agregarItem(item);
    }

    @Test
    @DisplayName("Debe crear pedido descontando stock y vaciando el carrito")
    void crearDesdeCarrito_exitoso() {
        CrearPedidoRequest request = new CrearPedidoRequest("Av. Principal 123", "987654321");

        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuario));
        when(carritoService.obtenerOCrearCarritoEntity(1L)).thenReturn(carrito);
        when(productoRepository.save(any(Producto.class))).thenAnswer(i -> i.getArgument(0));
        when(pedidoRepository.save(any(Pedido.class))).thenAnswer(i -> {
            Pedido p = i.getArgument(0);
            p.setId(50L);
            return p;
        });

        PedidoResponse response = pedidoService.crearDesdeCarrito(1L, request);

        assertNotNull(response);
        assertEquals(50L, response.getId());
        assertEquals(EstadoPedido.PENDIENTE, response.getEstado());
        assertEquals(0, new BigDecimal("300.00").compareTo(response.getTotal()));
        assertEquals(8, producto.getStock()); // 10 - 2 = 8

        verify(productoRepository, times(1)).save(producto);
        verify(pedidoRepository, times(1)).save(any(Pedido.class));
        verify(carritoRepository, times(1)).save(carrito);
        assertTrue(carrito.getItems().isEmpty());
    }

    @Test
    @DisplayName("Debe fallar al intentar crear pedido con carrito vacío")
    void crearDesdeCarrito_carritoVacio() {
        carrito.getItems().clear();
        CrearPedidoRequest request = new CrearPedidoRequest("Av. Principal 123", "987654321");

        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuario));
        when(carritoService.obtenerOCrearCarritoEntity(1L)).thenReturn(carrito);

        assertThrows(BadRequestException.class, () -> pedidoService.crearDesdeCarrito(1L, request));
        verify(pedidoRepository, never()).save(any(Pedido.class));
    }

    @Test
    @DisplayName("Debe fallar si el stock disponible es menor a la cantidad solicitada")
    void crearDesdeCarrito_stockInsuficiente() {
        producto.setStock(1); // El carrito tiene 2
        CrearPedidoRequest request = new CrearPedidoRequest("Av. Principal 123", "987654321");

        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuario));
        when(carritoService.obtenerOCrearCarritoEntity(1L)).thenReturn(carrito);

        assertThrows(StockInsuficienteException.class, () -> pedidoService.crearDesdeCarrito(1L, request));
        verify(pedidoRepository, never()).save(any(Pedido.class));
    }

    @Test
    @DisplayName("Debe cambiar el estado de un pedido")
    void cambiarEstado_exitoso() {
        Pedido pedido = new Pedido(50L, usuario, EstadoPedido.PENDIENTE, BigDecimal.valueOf(300), "Dir", "Tel");
        when(pedidoRepository.findById(50L)).thenReturn(Optional.of(pedido));
        when(pedidoRepository.save(any(Pedido.class))).thenAnswer(i -> i.getArgument(0));

        PedidoResponse response = pedidoService.cambiarEstado(50L, EstadoPedido.EN_PROCESO);

        assertNotNull(response);
        assertEquals(EstadoPedido.EN_PROCESO, response.getEstado());
        verify(pedidoRepository, times(1)).save(pedido);
    }
}
