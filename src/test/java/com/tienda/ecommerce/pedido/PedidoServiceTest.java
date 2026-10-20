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
    @Mock private com.tienda.ecommerce.pago.MetodoPagoConfigRepository metodoPagoConfigRepository;
    @Mock private CotizacionService cotizaciones;
    @Mock private com.tienda.ecommerce.pago.FormularioPagoService formularios;
    @Mock private jakarta.persistence.EntityManager entityManager;

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
        var metodo = new com.tienda.ecommerce.pago.MetodoPagoConfig(); metodo.setCodigo("TARJETA_CREDITO"); metodo.setNombre("Tarjeta simulada"); metodo.setProcesamiento("SIMULADO"); metodo.setPrefijoTransaccion("TX-");metodo.setMonedas(java.util.Set.of("PEN"));
        lenient().when(metodoPagoConfigRepository.findById("TARJETA_CREDITO")).thenReturn(Optional.of(metodo));
        lenient().when(formularios.version(any())).thenReturn("v1");
        lenient().when(formularios.validar(any(),any())).thenReturn("{}");
        var linea = new CotizacionService.Linea(5L,"Mouse",2,new BigDecimal("150.00"),"PEN",BigDecimal.ONE,new BigDecimal("150.00"),new BigDecimal("300.00"));
        var cotizacion = new CotizacionService.Datos("00000000-0000-0000-0000-000000000001",1L,"huella","PEN",new BigDecimal("300.00"),BigDecimal.ONE,new BigDecimal("300.00"),java.util.List.of(linea));
        lenient().when(cotizaciones.verificar(any(),any(),any())).thenReturn(cotizacion);
    }

    @Test
    @DisplayName("Debe crear pedido descontando stock y vaciando el carrito")
    void crearDesdeCarrito_exitoso() {
        CrearPedidoRequest request = new CrearPedidoRequest("Av. Principal 123", "987654321");
        request.setMetodoPago("TARJETA_CREDITO");request.setVersionMetodo("v1");

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
        request.setMetodoPago("TARJETA_CREDITO");request.setVersionMetodo("v1");

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
        request.setMetodoPago("TARJETA_CREDITO");request.setVersionMetodo("v1");

        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuario));
        when(carritoService.obtenerOCrearCarritoEntity(1L)).thenReturn(carrito);

        assertThrows(StockInsuficienteException.class, () -> pedidoService.crearDesdeCarrito(1L, request));
        verify(pedidoRepository, never()).save(any(Pedido.class));
    }

    @Test
    @DisplayName("Debe cambiar el estado de un pedido")
    void cambiarEstado_exitoso() {
        Pedido pedido = new Pedido(50L, usuario, EstadoPedido.PENDIENTE, BigDecimal.valueOf(300), "Dir", "Tel");
        when(pedidoRepository.findByIdConDetalles(50L)).thenReturn(Optional.of(pedido));
        when(pedidoRepository.save(any(Pedido.class))).thenAnswer(i -> i.getArgument(0));

        PedidoResponse response = pedidoService.cambiarEstado(50L, EstadoPedido.EN_PROCESO);

        assertNotNull(response);
        assertEquals(EstadoPedido.EN_PROCESO, response.getEstado());
        verify(pedidoRepository, times(1)).save(pedido);
    }

    @Test
    @DisplayName("Contraentrega ENTREGADO debe quedar cobrado (APROBADO)")
    void cambiarEstado_contraentregaEntregada_cobra() {
        Pedido pedido = new Pedido(51L, usuario, EstadoPedido.ENVIADO, BigDecimal.valueOf(600), "Dir", "Tel");
        com.tienda.ecommerce.pago.Pago pago = new com.tienda.ecommerce.pago.Pago(
                pedido, "PAGO_CONTRAENTREGA", "CONTRA_ENTREGA",
                com.tienda.ecommerce.pago.EstadoPago.PENDIENTE, BigDecimal.valueOf(600), "COD-1");
        pedido.setPago(pago);
        when(pedidoRepository.findByIdConDetalles(51L)).thenReturn(Optional.of(pedido));
        when(pedidoRepository.save(any(Pedido.class))).thenAnswer(i -> i.getArgument(0));

        PedidoResponse response = pedidoService.cambiarEstado(51L, EstadoPedido.ENTREGADO);

        assertEquals(EstadoPedido.ENTREGADO, response.getEstado());
        assertEquals(com.tienda.ecommerce.pago.EstadoPago.APROBADO, response.getEstadoPago());
        assertEquals("PAGO_CONTRAENTREGA", response.getMetodoPago());
    }

    @Test
    @DisplayName("Yape ENVIADO no debe auto-aprobarse, requiere verificación")
    void cambiarEstado_yapeNoAutoAprueba() {
        Pedido pedido = new Pedido(52L, usuario, EstadoPedido.PENDIENTE, BigDecimal.valueOf(100), "Dir", "Tel");
        com.tienda.ecommerce.pago.Pago pago = new com.tienda.ecommerce.pago.Pago(
                pedido, "YAPE", "VERIFICACION_MANUAL",
                com.tienda.ecommerce.pago.EstadoPago.PENDIENTE, BigDecimal.valueOf(100), "YAPE-1");
        pago.setReferenciaComprobante("OP-123456");
        pedido.setPago(pago);
        when(pedidoRepository.findByIdConDetalles(52L)).thenReturn(Optional.of(pedido));
        when(pedidoRepository.save(any(Pedido.class))).thenAnswer(i -> i.getArgument(0));

        PedidoResponse response = pedidoService.cambiarEstado(52L, EstadoPedido.ENVIADO);

        assertEquals(com.tienda.ecommerce.pago.EstadoPago.PENDIENTE, response.getEstadoPago());
    }

    @Test
    @DisplayName("Verificar pago Yape lo deja APROBADO")
    void verificarPago_aprueba() {
        Pedido pedido = new Pedido(53L, usuario, EstadoPedido.ENVIADO, BigDecimal.valueOf(100), "Dir", "Tel");
        com.tienda.ecommerce.pago.Pago pago = new com.tienda.ecommerce.pago.Pago(
                pedido, "YAPE", "VERIFICACION_MANUAL",
                com.tienda.ecommerce.pago.EstadoPago.PENDIENTE, BigDecimal.valueOf(100), "YAPE-2");
        pedido.setPago(pago);
        when(pedidoRepository.findByIdConDetalles(53L)).thenReturn(Optional.of(pedido));
        when(pedidoRepository.save(any(Pedido.class))).thenAnswer(i -> i.getArgument(0));

        PedidoResponse response = pedidoService.verificarPago(53L, com.tienda.ecommerce.pago.EstadoPago.APROBADO);

        assertEquals(com.tienda.ecommerce.pago.EstadoPago.APROBADO, response.getEstadoPago());
    }
}
