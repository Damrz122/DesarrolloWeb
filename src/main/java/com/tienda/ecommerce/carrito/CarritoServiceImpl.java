package com.tienda.ecommerce.carrito;

import com.tienda.ecommerce.carrito.dto.CarritoResponse;
import com.tienda.ecommerce.carrito.dto.ItemCarritoRequest;
import com.tienda.ecommerce.carrito.dto.ItemCarritoResponse;
import com.tienda.ecommerce.common.BadRequestException;
import com.tienda.ecommerce.common.RecursoNoEncontradoException;
import com.tienda.ecommerce.common.StockInsuficienteException;
import com.tienda.ecommerce.producto.Producto;
import com.tienda.ecommerce.producto.ProductoRepository;
import com.tienda.ecommerce.usuario.Usuario;
import com.tienda.ecommerce.usuario.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
public class CarritoServiceImpl implements CarritoService {

    private final CarritoRepository carritoRepository;
    private final ItemCarritoRepository itemCarritoRepository;
    private final ProductoRepository productoRepository;
    private final UsuarioRepository usuarioRepository;
    private final com.tienda.ecommerce.configuracion.MonetarioService dinero;
    private final jakarta.persistence.EntityManager entityManager;

    public CarritoServiceImpl(
            CarritoRepository carritoRepository,
            ItemCarritoRepository itemCarritoRepository,
            ProductoRepository productoRepository,
            UsuarioRepository usuarioRepository,
            com.tienda.ecommerce.configuracion.MonetarioService dinero,
            jakarta.persistence.EntityManager entityManager
    ) {
        this.carritoRepository = carritoRepository;
        this.itemCarritoRepository = itemCarritoRepository;
        this.productoRepository = productoRepository;
        this.usuarioRepository = usuarioRepository;
        this.dinero = dinero;
        this.entityManager = entityManager;
    }

    @Override
    @Transactional
    public CarritoResponse obtenerCarrito(Long usuarioId) {
        Carrito carrito = obtenerOCrearCarritoEntity(usuarioId);

        return mapearADto(carrito);
    }

    @Override
    @Transactional
    public CarritoResponse agregarItem(Long usuarioId, ItemCarritoRequest request) {
        if (request.getCantidad() <= 0) {
            throw new BadRequestException("La cantidad debe ser mayor a cero");
        }

        Producto producto = productoRepository.findByIdAndActivoTrue(request.getProductoId())
                .orElseThrow(() -> new RecursoNoEncontradoException("Producto no disponible con id: " + request.getProductoId()));

        Carrito carrito = obtenerOCrearCarritoEntity(usuarioId);

        // Buscar si ya existe el producto en el carrito
        entityManager.lock(carrito, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        entityManager.refresh(carrito);
        ItemCarrito itemExistente = carrito.getItems().stream()
                .filter(i -> i.getProducto().getId().equals(producto.getId()))
                .findFirst()
                .orElse(null);

        int cantidadFinal = request.getCantidad() + (itemExistente != null ? itemExistente.getCantidad() : 0);

        if (producto.getStock() < cantidadFinal) {
            throw new StockInsuficienteException(
                    String.format("Stock insuficiente para '%s'. Disponible: %d, Solicitado: %d",
                            producto.getNombre(), producto.getStock(), cantidadFinal)
            );
        }

        if (itemExistente != null) {
            itemExistente.setCantidad(cantidadFinal);
        } else {
            ItemCarrito nuevoItem = new ItemCarrito(null, carrito, producto, request.getCantidad());
            carrito.agregarItem(nuevoItem);
        }

        Carrito guardado = carritoRepository.save(carrito);
        return mapearADto(guardado);
    }

    @Override
    @Transactional
    public CarritoResponse actualizarCantidadItem(Long usuarioId, Long itemId, int cantidad) {
        if (cantidad <= 0) {
            throw new BadRequestException("La cantidad debe ser al menos 1");
        }

        Carrito carrito = obtenerOCrearCarritoEntity(usuarioId);
        entityManager.lock(carrito, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        entityManager.refresh(carrito);

        ItemCarrito item = carrito.getItems().stream()
                .filter(i -> i.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new RecursoNoEncontradoException("Ítem no encontrado en el carrito con id: " + itemId));

        if (item.getProducto().getStock() < cantidad) {
            throw new StockInsuficienteException(
                    String.format("Stock insuficiente para '%s'. Disponible: %d, Solicitado: %d",
                            item.getProducto().getNombre(), item.getProducto().getStock(), cantidad)
            );
        }

        item.setCantidad(cantidad);
        Carrito guardado = carritoRepository.save(carrito);
        return mapearADto(guardado);
    }

    @Override
    @Transactional
    public CarritoResponse removerItem(Long usuarioId, Long itemId) {
        Carrito carrito = obtenerOCrearCarritoEntity(usuarioId);
        entityManager.lock(carrito, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        entityManager.refresh(carrito);

        ItemCarrito item = carrito.getItems().stream()
                .filter(i -> i.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new RecursoNoEncontradoException("Ítem no encontrado en el carrito con id: " + itemId));

        carrito.removerItem(item);
        Carrito guardado = carritoRepository.save(carrito);
        return mapearADto(guardado);
    }

    @Override
    @Transactional
    public void vaciarCarrito(Long usuarioId) {
        Carrito carrito = obtenerOCrearCarritoEntity(usuarioId);
        entityManager.lock(carrito, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        entityManager.refresh(carrito);
        carrito.getItems().clear();
        carritoRepository.save(carrito);
    }

    @Override
    @Transactional
    public Carrito obtenerOCrearCarritoEntity(Long usuarioId) {
        return carritoRepository.findByUsuarioIdConItems(usuarioId)
                .orElseGet(() -> {
                    Usuario usuario = usuarioRepository.findById(usuarioId)
                            .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado con id: " + usuarioId));
                    Carrito nuevo = new Carrito(null, usuario);
                    return carritoRepository.save(nuevo);
                });
    }

    private CarritoResponse mapearADto(Carrito carrito) {
        List<ItemCarritoResponse> itemsDto = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        BigDecimal subtotalSinImpuesto = BigDecimal.ZERO;
        BigDecimal impuestoTotal = BigDecimal.ZERO;
        int cantidadTotal = 0;
        String monedaTotal = carrito.getItems() == null || carrito.getItems().isEmpty() ? "PEN" : carrito.getItems().get(0).getProducto().getMonedaCodigo();

        if (carrito.getItems() != null) {
            for (ItemCarrito item : carrito.getItems()) {
                BigDecimal precioBase = dinero.redondear(item.getProducto().getPrecioVigente().multiply(
                        dinero.tasa(item.getProducto().getMonedaCodigo(), monedaTotal)), monedaTotal);
                BigDecimal impuestoPorcentaje = item.getProducto().getImpuestoPorcentaje() == null ? BigDecimal.ZERO : item.getProducto().getImpuestoPorcentaje();
                BigDecimal impuestoUnitario = dinero.redondear(precioBase.multiply(impuestoPorcentaje).movePointLeft(2), monedaTotal);
                BigDecimal precioVigente = precioBase.add(impuestoUnitario);
                BigDecimal subtotalItem = precioVigente.multiply(BigDecimal.valueOf(item.getCantidad()));
                BigDecimal impuestoItem = impuestoUnitario.multiply(BigDecimal.valueOf(item.getCantidad()));
                total = total.add(subtotalItem);
                subtotalSinImpuesto = subtotalSinImpuesto.add(precioBase.multiply(BigDecimal.valueOf(item.getCantidad())));
                impuestoTotal = impuestoTotal.add(impuestoItem);
                cantidadTotal += item.getCantidad();

                itemsDto.add(new ItemCarritoResponse(
                        item.getId(),
                        item.getProducto().getId(),
                        item.getProducto().getNombre(),
                        precioVigente,
                        item.getCantidad(),
                        subtotalItem,
                        item.getProducto().getImagenUrl()
                ));
                ItemCarritoResponse dto = itemsDto.get(itemsDto.size() - 1);
                dto.setSubtotalSinImpuesto(precioBase.multiply(BigDecimal.valueOf(item.getCantidad())));
                dto.setImpuestoPorcentaje(impuestoPorcentaje);
                dto.setImpuestoMonto(impuestoItem);
            }
        }

        CarritoResponse respuesta = new CarritoResponse(carrito.getId(), itemsDto, total, cantidadTotal);
        String moneda = "PEN";
        if (carrito.getItems() != null && !carrito.getItems().isEmpty()) moneda = carrito.getItems().get(0).getProducto().getMonedaCodigo();
        respuesta.setMonedaCodigo(moneda);
        respuesta.setSubtotal(subtotalSinImpuesto);
        respuesta.setImpuestoTotal(impuestoTotal);
        for (ItemCarritoResponse item : itemsDto) item.setMonedaCodigo(moneda);
        return respuesta;
    }
}
