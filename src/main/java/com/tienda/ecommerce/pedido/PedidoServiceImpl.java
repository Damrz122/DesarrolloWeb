package com.tienda.ecommerce.pedido;

import com.tienda.ecommerce.carrito.Carrito;
import com.tienda.ecommerce.carrito.CarritoRepository;
import com.tienda.ecommerce.carrito.CarritoService;
import com.tienda.ecommerce.carrito.ItemCarrito;
import com.tienda.ecommerce.common.BadRequestException;
import com.tienda.ecommerce.common.PaginaResponse;
import com.tienda.ecommerce.common.RecursoNoEncontradoException;
import com.tienda.ecommerce.common.StockInsuficienteException;
import com.tienda.ecommerce.pedido.dto.CrearPedidoRequest;
import com.tienda.ecommerce.pedido.dto.DetallePedidoResponse;
import com.tienda.ecommerce.pedido.dto.PedidoResponse;
import com.tienda.ecommerce.producto.Producto;
import com.tienda.ecommerce.producto.ProductoRepository;
import com.tienda.ecommerce.usuario.Usuario;
import com.tienda.ecommerce.usuario.UsuarioRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
public class PedidoServiceImpl implements PedidoService {

    private final PedidoRepository pedidoRepository;
    private final ProductoRepository productoRepository;
    private final CarritoRepository carritoRepository;
    private final CarritoService carritoService;
    private final UsuarioRepository usuarioRepository;

    public PedidoServiceImpl(
            PedidoRepository pedidoRepository,
            ProductoRepository productoRepository,
            CarritoRepository carritoRepository,
            CarritoService carritoService,
            UsuarioRepository usuarioRepository
    ) {
        this.pedidoRepository = pedidoRepository;
        this.productoRepository = productoRepository;
        this.carritoRepository = carritoRepository;
        this.carritoService = carritoService;
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    @Transactional
    public PedidoResponse crearDesdeCarrito(Long usuarioId, CrearPedidoRequest request) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado con id: " + usuarioId));

        Carrito carrito = carritoService.obtenerOCrearCarritoEntity(usuarioId);

        if (carrito.getItems() == null || carrito.getItems().isEmpty()) {
            throw new BadRequestException("No se puede crear un pedido con el carrito vacío");
        }

        Pedido pedido = new Pedido();
        pedido.setUsuario(usuario);
        pedido.setEstado(EstadoPedido.PENDIENTE);
        pedido.setDireccionEnvio(request.getDireccionEnvio().trim());
        pedido.setTelefono(request.getTelefono().trim());

        BigDecimal total = BigDecimal.ZERO;
        List<DetallePedido> detalles = new ArrayList<>();

        for (ItemCarrito item : carrito.getItems()) {
            Producto producto = item.getProducto();

            // Validar stock disponible
            if (producto.getStock() < item.getCantidad()) {
                throw new StockInsuficienteException(
                        String.format("Stock insuficiente para '%s'. Disponible: %d, en carrito: %d",
                                producto.getNombre(), producto.getStock(), item.getCantidad())
                );
            }

            // Descontar inventario (atómico en la transacción)
            producto.setStock(producto.getStock() - item.getCantidad());
            productoRepository.save(producto);

            // Crear detalle de pedido congelando el precio unitario del momento de compra
            DetallePedido detalle = new DetallePedido();
            detalle.setPedido(pedido);
            detalle.setProducto(producto);
            detalle.setCantidad(item.getCantidad());
            detalle.setPrecioUnitario(producto.getPrecio());
            detalles.add(detalle);

            BigDecimal subtotal = producto.getPrecio().multiply(BigDecimal.valueOf(item.getCantidad()));
            total = total.add(subtotal);
        }

        pedido.setTotal(total);
        pedido.setDetalles(detalles);

        // Crear registro de Pago asociado
        com.tienda.ecommerce.pago.Pago pago = new com.tienda.ecommerce.pago.Pago(
                pedido,
                com.tienda.ecommerce.pago.MetodoPago.TARJETA_CREDITO,
                com.tienda.ecommerce.pago.EstadoPago.APROBADO,
                total,
                "TX-" + System.currentTimeMillis()
        );
        pedido.setPago(pago);

        // Crear registro de Envío asociado
        com.tienda.ecommerce.envio.Envio envio = new com.tienda.ecommerce.envio.Envio(
                pedido,
                pedido.getDireccionEnvio(),
                "Electronix Express Logistics"
        );
        envio.setNumeroGuia("GUIA-ELX-" + System.currentTimeMillis());
        pedido.setEnvio(envio);

        // Guardar el pedido, detalles, pago y envío en cascada
        Pedido pedidoGuardado = pedidoRepository.save(pedido);

        // Vaciar el carrito del usuario tras confirmar la compra
        carrito.getItems().clear();
        carritoRepository.save(carrito);

        return mapearADto(pedidoGuardado);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PedidoResponse> listarMisPedidos(Long usuarioId) {
        return pedidoRepository.findByUsuarioIdOrderByFechaDesc(usuarioId).stream()
                .map(this::mapearADto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PedidoResponse obtenerPorId(Long pedidoId, Long usuarioId, boolean esAdmin) {
        Pedido pedido = pedidoRepository.findByIdConDetalles(pedidoId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Pedido no encontrado con id: " + pedidoId));

        if (!esAdmin && !pedido.getUsuario().getId().equals(usuarioId)) {
            throw new AccessDeniedException("No tienes permiso para ver este pedido");
        }

        return mapearADto(pedido);
    }

    @Override
    @Transactional(readOnly = true)
    public PaginaResponse<PedidoResponse> listarParaAdmin(EstadoPedido estado, Pageable pageable) {
        Page<Pedido> pagina = pedidoRepository.buscarPorEstado(estado, pageable);
        List<PedidoResponse> contenido = pagina.getContent().stream().map(this::mapearADto).toList();
        return PaginaResponse.de(pagina, contenido);
    }

    @Override
    @Transactional
    public PedidoResponse cambiarEstado(Long pedidoId, EstadoPedido nuevoEstado) {
        Pedido pedido = pedidoRepository.findById(pedidoId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Pedido no encontrado con id: " + pedidoId));

        pedido.setEstado(nuevoEstado);
        Pedido actualizado = pedidoRepository.save(pedido);
        return mapearADto(actualizado);
    }

    private PedidoResponse mapearADto(Pedido p) {
        List<DetallePedidoResponse> detallesDto = new ArrayList<>();
        if (p.getDetalles() != null) {
            for (DetallePedido d : p.getDetalles()) {
                BigDecimal subtotal = d.getPrecioUnitario().multiply(BigDecimal.valueOf(d.getCantidad()));
                detallesDto.add(new DetallePedidoResponse(
                        d.getId(),
                        d.getProducto() != null ? d.getProducto().getId() : null,
                        d.getProducto() != null ? d.getProducto().getNombre() : "Producto",
                        d.getCantidad(),
                        d.getPrecioUnitario(),
                        subtotal
                ));
            }
        }

        return new PedidoResponse(
                p.getId(),
                p.getUsuario() != null ? p.getUsuario().getId() : null,
                p.getUsuario() != null ? p.getUsuario().getNombre() : null,
                p.getUsuario() != null ? p.getUsuario().getEmail() : null,
                p.getEstado(),
                p.getTotal(),
                p.getDireccionEnvio(),
                p.getTelefono(),
                p.getFecha(),
                detallesDto
        );
    }
}
