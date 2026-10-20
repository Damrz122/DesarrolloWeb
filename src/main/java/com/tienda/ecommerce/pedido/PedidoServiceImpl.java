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
import com.tienda.ecommerce.pago.MetodoPagoConfig;
import com.tienda.ecommerce.pago.MetodoPagoConfigRepository;
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
    private final MetodoPagoConfigRepository metodoPagoConfigRepository;
    private final CotizacionService cotizaciones;
    private final com.tienda.ecommerce.pago.FormularioPagoService formularios;
    private final jakarta.persistence.EntityManager entityManager;

    public PedidoServiceImpl(
            PedidoRepository pedidoRepository,
            ProductoRepository productoRepository,
            CarritoRepository carritoRepository,
            CarritoService carritoService,
            UsuarioRepository usuarioRepository,
            MetodoPagoConfigRepository metodoPagoConfigRepository,
            CotizacionService cotizaciones,
            com.tienda.ecommerce.pago.FormularioPagoService formularios,
            jakarta.persistence.EntityManager entityManager
    ) {
        this.pedidoRepository = pedidoRepository;
        this.productoRepository = productoRepository;
        this.carritoRepository = carritoRepository;
        this.carritoService = carritoService;
        this.usuarioRepository = usuarioRepository;
        this.metodoPagoConfigRepository = metodoPagoConfigRepository;
        this.cotizaciones = cotizaciones;
        this.formularios = formularios;
        this.entityManager = entityManager;
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
        entityManager.lock(carrito, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        entityManager.refresh(carrito);
        if (carrito.getItems().isEmpty()) throw new BadRequestException("El carrito ya fue procesado");
        carrito.getItems().stream().map(ItemCarrito::getProducto).sorted(java.util.Comparator.comparing(Producto::getId))
                .forEach(p -> entityManager.refresh(p, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE));

        if (!usuario.isActivo()) throw new BadRequestException("La cuenta está desactivada");
        CotizacionService.Datos cotizacion = cotizaciones.verificar(request.getCotizacionToken(), usuarioId, carrito);
        if (pedidoRepository.findByCotizacionId(cotizacion.id()).isPresent()) throw new BadRequestException("Esta cotización ya fue utilizada");
        String monedaPedido = cotizacion.monedaCodigo();
        String codigoMetodo = request.getMetodoPago() == null ? "" : request.getMetodoPago().trim().toUpperCase(java.util.Locale.ROOT);
        MetodoPagoConfig metodoPago = metodoPagoConfigRepository.findById(codigoMetodo).filter(MetodoPagoConfig::isActivo)
                .orElseThrow(() -> new BadRequestException("El método de pago no está disponible"));
        if (!metodoPago.getMonedas().contains(monedaPedido)) throw new BadRequestException("El método no acepta " + monedaPedido);
        if (!formularios.version(metodoPago).equals(request.getVersionMetodo())) throw new BadRequestException("El formulario de pago cambió; vuelve a seleccionar el método");
        String datosPago = formularios.validar(metodoPago, request.getDatosPago());
        if (metodoPago.isRequiereReferencia() && (request.getReferenciaComprobante() == null || request.getReferenciaComprobante().trim().length() < 6 || request.getReferenciaComprobante().length() > 100))
            throw new BadRequestException("Completa la referencia de pago (6 a 100 caracteres)");

        Pedido pedido = new Pedido();
        pedido.setUsuario(usuario);
        pedido.setEstado(EstadoPedido.PENDIENTE);
        pedido.setDireccionEnvio(request.getDireccionEnvio().trim());
        pedido.setTelefono(request.getTelefono().trim());
        pedido.setMonedaCodigo(monedaPedido);
        pedido.setCotizacionId(cotizacion.id());
        pedido.setTotalBasePen(cotizacion.totalBasePen());
        pedido.setCambioSnapshot(cotizaciones.serializar(cotizacion));

        BigDecimal total = BigDecimal.ZERO;
        List<DetallePedido> detalles = new ArrayList<>();

        for (ItemCarrito item : carrito.getItems()) {
            Producto producto = item.getProducto();
            CotizacionService.Linea linea = cotizacion.items().stream().filter(l -> l.productoId().equals(producto.getId())).findFirst().orElseThrow();

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
            detalle.setPrecioUnitario(linea.precioUnitario());
            detalle.setMonedaCodigo(monedaPedido);
            detalle.setPrecioOriginal(linea.precioOriginal());
            detalle.setMonedaOriginal(linea.monedaOriginal());
            detalle.setProductoNombre(linea.nombre());
            detalles.add(detalle);

            BigDecimal subtotal = linea.subtotal();
            total = total.add(subtotal);
        }

        pedido.setTotal(total);
        pedido.setDetalles(detalles);

        // Crear registro de Pago asociado.
        // - TARJETA (crédito/débito): cobro instantáneo simulado -> APROBADO.
        // - YAPE / PLIN / TRANSFERENCIA: requiere verificación manual del admin
        //   con N° de operación -> nace PENDIENTE.
        // - PAGO_CONTRAENTREGA: se cobra al entregar -> nace PENDIENTE.
        com.tienda.ecommerce.pago.EstadoPago estadoPago;
        if (!"SIMULADO".equals(metodoPago.getProcesamiento())) {
            estadoPago = com.tienda.ecommerce.pago.EstadoPago.PENDIENTE;
        } else {
            estadoPago = com.tienda.ecommerce.pago.EstadoPago.APROBADO;
        }
        String prefijoTx = metodoPago.getPrefijoTransaccion();
        com.tienda.ecommerce.pago.Pago pago = new com.tienda.ecommerce.pago.Pago(
                pedido,
                metodoPago.getCodigo(), metodoPago.getProcesamiento(),
                estadoPago,
                total,
                prefijoTx + java.util.UUID.randomUUID()
        );
        if (request.getReferenciaComprobante() != null && !request.getReferenciaComprobante().isBlank()) {
            String ref = request.getReferenciaComprobante().trim().toUpperCase();
            if (ref.length() > 100) {
                ref = ref.substring(0, 100);
            }
            pago.setReferenciaComprobante(ref);
        }
        pago.setMonedaCodigo(monedaPedido);
        pago.setMetodoNombre(metodoPago.getNombre());
        pago.setFormularioSnapshot(metodoPago.getFormularioJson());
        pago.setDatosPagoJson(datosPago);
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
        Pedido pedido = pedidoRepository.findByIdConDetalles(pedidoId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Pedido no encontrado con id: " + pedidoId));

        pedido.setEstado(nuevoEstado);

        // Sincronizar pago para que el reporte "Ventas del mes" (solo APROBADO)
        // incluya lo cobrado:
        // - CONTRAENTREGA: al llegar a ENTREGADO se cobra automáticamente.
        // - YAPE/PLIN/TRANSFERENCIA: NO se auto-aprueban (requieren verificación
        //   manual del admin con N° de operación), salvo que ya estuvieran APROBADOS.
        // - TARJETA: ya nace APROBADA.
        // - CANCELADO: pago queda RECHAZADO (salvo REEMBOLSADO).
        if (pedido.getPago() != null && pedido.getPago().getEstadoPago() != null) {
            com.tienda.ecommerce.pago.EstadoPago estadoPagoActual = pedido.getPago().getEstadoPago();
            String procesamiento = pedido.getPago().getProcesamientoPago();
            if (nuevoEstado == EstadoPedido.CANCELADO) {
                if (estadoPagoActual != com.tienda.ecommerce.pago.EstadoPago.REEMBOLSADO) {
                    pedido.getPago().setEstadoPago(com.tienda.ecommerce.pago.EstadoPago.RECHAZADO);
                }
            } else if (nuevoEstado == EstadoPedido.ENTREGADO
                    && estadoPagoActual == com.tienda.ecommerce.pago.EstadoPago.PENDIENTE
                    && "CONTRA_ENTREGA".equals(procesamiento)) {
                pedido.getPago().setEstadoPago(com.tienda.ecommerce.pago.EstadoPago.APROBADO);
                pedido.getPago().setFechaPago(java.time.LocalDateTime.now());
            }
        }

        Pedido actualizado = pedidoRepository.save(pedido);
        return mapearADto(actualizado);
    }

    @Override
    @Transactional
    public PedidoResponse verificarPago(Long pedidoId, com.tienda.ecommerce.pago.EstadoPago estadoPago) {
        if (estadoPago != com.tienda.ecommerce.pago.EstadoPago.APROBADO
                && estadoPago != com.tienda.ecommerce.pago.EstadoPago.RECHAZADO) {
            throw new com.tienda.ecommerce.common.BadRequestException("Solo se puede aprobar o rechazar el pago");
        }
        Pedido pedido = pedidoRepository.findByIdConDetalles(pedidoId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Pedido no encontrado con id: " + pedidoId));
        if (pedido.getPago() == null) {
            throw new com.tienda.ecommerce.common.BadRequestException("El pedido no tiene pago asociado");
        }
        if (pedido.getEstado() == EstadoPedido.CANCELADO && estadoPago == com.tienda.ecommerce.pago.EstadoPago.APROBADO) {
            throw new com.tienda.ecommerce.common.BadRequestException("No se puede aprobar el pago de un pedido cancelado");
        }
        pedido.getPago().setEstadoPago(estadoPago);
        if (estadoPago == com.tienda.ecommerce.pago.EstadoPago.APROBADO) {
            pedido.getPago().setFechaPago(java.time.LocalDateTime.now());
        }
        Pedido actualizado = pedidoRepository.save(pedido);
        return mapearADto(actualizado);
    }

    private PedidoResponse mapearADto(Pedido p) {
        List<DetallePedidoResponse> detallesDto = new ArrayList<>();
        if (p.getDetalles() != null) {
            for (DetallePedido d : p.getDetalles()) {
                BigDecimal subtotal = d.getPrecioUnitario().multiply(BigDecimal.valueOf(d.getCantidad()));
                DetallePedidoResponse detalleDto = new DetallePedidoResponse(
                        d.getId(),
                        d.getProducto() != null ? d.getProducto().getId() : null,
                        d.getProductoNombre() != null ? d.getProductoNombre() : (d.getProducto() != null ? d.getProducto().getNombre() : "Producto"),
                        d.getCantidad(),
                        d.getPrecioUnitario(),
                        subtotal
                );
                detalleDto.setMonedaCodigo(d.getMonedaCodigo());
                detallesDto.add(detalleDto);
            }
        }

        com.tienda.ecommerce.pago.Pago pago = null;
        try {
            pago = p.getPago();
        } catch (Exception ignored) {
        }
        PedidoResponse respuesta = new PedidoResponse(
                p.getId(),
                p.getUsuario() != null ? p.getUsuario().getId() : null,
                p.getUsuario() != null ? p.getUsuario().getNombre() : null,
                p.getUsuario() != null ? p.getUsuario().getEmail() : null,
                p.getEstado(),
                p.getTotal(),
                p.getDireccionEnvio(),
                p.getTelefono(),
                p.getFecha(),
                detallesDto,
                pago != null ? pago.getMetodoPago() : null,
                pago != null ? pago.getEstadoPago() : null,
                pago != null ? pago.getReferenciaComprobante() : null,
                pago != null ? pago.getCodigoTransaccion() : null,
                pago != null ? pago.getFechaPago() : null
        );
        respuesta.setMonedaCodigo(p.getMonedaCodigo());
        respuesta.setProcesamientoPago(pago != null ? pago.getProcesamientoPago() : null);
        respuesta.setMetodoNombre(pago != null ? pago.getMetodoNombre() : null);
        respuesta.setTotalBasePen(p.getTotalBasePen());
        return respuesta;
    }
}
