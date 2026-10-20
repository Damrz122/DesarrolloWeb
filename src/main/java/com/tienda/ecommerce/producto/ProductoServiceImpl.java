package com.tienda.ecommerce.producto;

import com.tienda.ecommerce.common.BadRequestException;
import com.tienda.ecommerce.common.PaginaResponse;
import com.tienda.ecommerce.common.RecursoNoEncontradoException;
import com.tienda.ecommerce.producto.dto.ProductoRequest;
import com.tienda.ecommerce.producto.dto.ProductoResponse;
import com.tienda.ecommerce.reporte.dto.ProductoBajoStockDTO;
import com.tienda.ecommerce.configuracion.MonedaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
public class ProductoServiceImpl implements ProductoService {

    private final ProductoRepository productoRepository;
    private final CategoriaRepository categoriaRepository;
    private final MonedaRepository monedaRepository;
    private final com.tienda.ecommerce.configuracion.MonetarioService dinero;

    public ProductoServiceImpl(ProductoRepository productoRepository, CategoriaRepository categoriaRepository, MonedaRepository monedaRepository, com.tienda.ecommerce.configuracion.MonetarioService dinero) {
        this.productoRepository = productoRepository;
        this.categoriaRepository = categoriaRepository;
        this.monedaRepository = monedaRepository;
        this.dinero = dinero;
    }

    @Override
    @Transactional(readOnly = true)
    public PaginaResponse<ProductoResponse> listarPublico(String nombre, Long categoriaId, BigDecimal precioMin, BigDecimal precioMax, String etiqueta, Pageable pageable) {
        String nombreFiltro = (nombre != null && !nombre.trim().isEmpty()) ? nombre.trim() : null;
        String etiquetaFiltro = normalizarEtiqueta(etiqueta);
        Page<Producto> pagina = productoRepository.buscarActivosConFiltros(nombreFiltro, categoriaId, precioMin, precioMax, etiquetaFiltro, pageable);
        List<ProductoResponse> contenido = pagina.getContent().stream().map(this::mapearADto).toList();
        return PaginaResponse.de(pagina, contenido);
    }

    @Override
    @Transactional(readOnly = true)
    public ProductoResponse obtenerPorIdPublico(Long id) {
        Producto producto = productoRepository.findByIdAndActivoTrue(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Producto no encontrado o no disponible con id: " + id));
        return mapearADto(producto);
    }

    @Override
    @Transactional(readOnly = true)
    public PaginaResponse<ProductoResponse> listarParaAdmin(String nombre, Long categoriaId, Boolean activo, Pageable pageable) {
        String nombreFiltro = (nombre != null && !nombre.trim().isEmpty()) ? nombre.trim() : null;
        Page<Producto> pagina = productoRepository.buscarParaAdmin(nombreFiltro, categoriaId, activo, pageable);
        List<ProductoResponse> contenido = pagina.getContent().stream().map(this::mapearADto).toList();
        return PaginaResponse.de(pagina, contenido);
    }

    @Override
    @Transactional(readOnly = true)
    public ProductoResponse obtenerPorId(Long id) {
        Producto producto = productoRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Producto no encontrado con id: " + id));
        return mapearADto(producto);
    }

    @Override
    @Transactional
    public ProductoResponse crear(ProductoRequest request) {
        Categoria categoria = categoriaRepository.findById(request.getCategoriaId())
                .orElseThrow(() -> new RecursoNoEncontradoException("Categoría no encontrada con id: " + request.getCategoriaId()));

        Producto producto = new Producto();
        producto.setNombre(request.getNombre().trim());
        producto.setDescripcion(request.getDescripcion());
        producto.setPrecio(request.getPrecio());
        producto.setMonedaCodigo(validarMoneda(request.getMonedaCodigo()));
        dinero.validarPrecio(request.getPrecio(), producto.getMonedaCodigo());
        if (request.getPrecioOferta() != null) dinero.validarPrecio(request.getPrecioOferta(), producto.getMonedaCodigo());
        producto.setStock(request.getStock());
        List<String> galeria = resolverGaleria(request);
        producto.setImagenUrl(galeria.isEmpty() ? null : galeria.get(0));
        producto.reemplazarImagenes(galeria);
        producto.setCategoria(categoria);
        String etiqueta = normalizarEtiqueta(request.getEtiqueta());
        producto.setEtiqueta(etiqueta);
        producto.setPrecioOferta(validarPrecioOferta(etiqueta, request.getPrecio(), request.getPrecioOferta()));
        producto.setImpuestoPorcentaje(validarImpuesto(request.getImpuestoPorcentaje()));
        producto.setActivo(true);

        Producto guardado = productoRepository.save(producto);
        return mapearADto(guardado);
    }

    @Override
    @Transactional
    public ProductoResponse actualizar(Long id, ProductoRequest request) {
        Producto producto = productoRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Producto no encontrado con id: " + id));

        Categoria categoria = categoriaRepository.findById(request.getCategoriaId())
                .orElseThrow(() -> new RecursoNoEncontradoException("Categoría no encontrada con id: " + request.getCategoriaId()));

        producto.setNombre(request.getNombre().trim());
        producto.setDescripcion(request.getDescripcion());
        producto.setPrecio(request.getPrecio());
        producto.setMonedaCodigo(validarMoneda(request.getMonedaCodigo()));
        dinero.validarPrecio(request.getPrecio(), producto.getMonedaCodigo());
        if (request.getPrecioOferta() != null) dinero.validarPrecio(request.getPrecioOferta(), producto.getMonedaCodigo());
        producto.setStock(request.getStock());
        List<String> galeria = resolverGaleria(request);
        producto.setImagenUrl(galeria.isEmpty() ? null : galeria.get(0));
        // Borra primero y fuerza el DELETE antes de insertar: si no, el INSERT
        // de las mismas URLs choca con uk_producto_imagen_url (producto_id, url).
        producto.getImagenes().clear();
        productoRepository.saveAndFlush(producto);
        int orden = 0;
        for (String url : galeria) {
            producto.agregarImagen(url, orden++);
        }
        producto.setCategoria(categoria);
        String etiqueta = normalizarEtiqueta(request.getEtiqueta());
        producto.setEtiqueta(etiqueta);
        producto.setPrecioOferta(validarPrecioOferta(etiqueta, request.getPrecio(), request.getPrecioOferta()));
        producto.setImpuestoPorcentaje(validarImpuesto(request.getImpuestoPorcentaje()));

        Producto actualizado = productoRepository.save(producto);
        return mapearADto(actualizado);
    }

    @Override
    @Transactional
    public void eliminar(Long id) {
        Producto producto = productoRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Producto no encontrado con id: " + id));
        // Soft delete según especificación RF06
        producto.setActivo(false);
        productoRepository.save(producto);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductoBajoStockDTO> obtenerProductosBajoStock(int umbral) {
        return productoRepository.findProductosConBajoStock(umbral).stream()
                .map(p -> new ProductoBajoStockDTO(
                        p.getId(),
                        p.getNombre(),
                        p.getStock(),
                        p.getCategoria() != null ? p.getCategoria().getNombre() : "Sin categoría"
                ))
                .toList();
    }

    private ProductoResponse mapearADto(Producto p) {
        List<String> galeria = new ArrayList<>();
        if (p.getImagenes() != null) {
            galeria = p.getImagenes().stream()
                    .sorted((a, b) -> {
                        int c = Integer.compare(a.getOrden(), b.getOrden());
                        return c != 0 ? c : Long.compare(
                                a.getId() != null ? a.getId() : 0L,
                                b.getId() != null ? b.getId() : 0L);
                    })
                    .map(img -> img.getUrl())
                    .filter(url -> url != null && !url.trim().isEmpty())
                    .toList();
        }
        if (galeria.isEmpty() && p.getImagenUrl() != null && !p.getImagenUrl().trim().isEmpty()) {
            galeria = List.of(p.getImagenUrl());
        }
        String portada = galeria.isEmpty() ? p.getImagenUrl() : galeria.get(0);
        ProductoResponse dto = new ProductoResponse(
                p.getId(),
                p.getNombre(),
                p.getDescripcion(),
                p.getPrecio(),
                p.getStock(),
                portada,
                galeria,
                p.getCategoria() != null ? p.getCategoria().getId() : null,
                p.getCategoria() != null ? p.getCategoria().getNombre() : null,
                p.isActivo(),
                p.getFechaCreacion()
        );
        dto.setEtiqueta(p.getEtiqueta());
        dto.setPrecioOferta(p.getPrecioOferta());
        dto.setMonedaCodigo(p.getMonedaCodigo());
        dto.setImpuestoPorcentaje(p.getImpuestoPorcentaje());
        return dto;
    }

    private String validarMoneda(String codigo) {
        String valor = codigo == null || codigo.isBlank() ? "PEN" : codigo.trim().toUpperCase();
        dinero.activa(valor);
        return valor;
    }

    /**
     * OFERTA exige precio rebajado mayor a 0 y menor al precio base;
     * con cualquier otra etiqueta el precio de oferta se descarta (NULL).
     */
    private BigDecimal validarPrecioOferta(String etiqueta, BigDecimal precio, BigDecimal precioOferta) {
        if (!"OFERTA".equals(etiqueta)) {
            return null;
        }
        if (precioOferta == null) {
            throw new BadRequestException("La etiqueta OFERTA requiere un precio de oferta");
        }
        if (precioOferta.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("El precio de oferta debe ser mayor a 0");
        }
        if (precio != null && precioOferta.compareTo(precio) >= 0) {
            throw new BadRequestException("El precio de oferta debe ser menor al precio base");
        }
        return precioOferta;
    }

    private BigDecimal validarImpuesto(BigDecimal impuesto) {
        BigDecimal valor = impuesto == null ? BigDecimal.ZERO : impuesto;
        if (valor.compareTo(BigDecimal.ZERO) < 0 || valor.compareTo(new BigDecimal("100")) > 0) {
            throw new BadRequestException("El impuesto debe estar entre 0 y 100%");
        }
        if (valor.scale() > 2 && valor.stripTrailingZeros().scale() > 2) {
            throw new BadRequestException("El impuesto admite máximo 2 decimales");
        }
        return valor.setScale(2);
    }

    /**
     * Solo acepta NUEVO, OFERTA o TENDENCIA; cualquier otro valor queda sin etiqueta.
     */
    private String normalizarEtiqueta(String etiqueta) {
        if (etiqueta == null) {
            return null;
        }
        String valor = etiqueta.trim().toUpperCase();
        if (valor.equals("NUEVO") || valor.equals("OFERTA") || valor.equals("TENDENCIA")) {
            return valor;
        }
        return null;
    }

    /**
     * 4FN: si el cliente envía galería, manda; si no, se degrada a imagenUrl única.
     */
    private List<String> resolverGaleria(ProductoRequest request) {
        if (request.getImagenes() != null) {
            List<String> limpia = request.getImagenes().stream()
                    .filter(url -> url != null && !url.trim().isEmpty())
                    .map(String::trim)
                    .distinct()
                    .toList();
            if (!limpia.isEmpty()) {
                return limpia;
            }
        }
        if (request.getImagenUrl() != null && !request.getImagenUrl().trim().isEmpty()) {
            return List.of(request.getImagenUrl().trim());
        }
        return List.of();
    }
}
