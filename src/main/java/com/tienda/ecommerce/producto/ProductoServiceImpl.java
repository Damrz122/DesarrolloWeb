package com.tienda.ecommerce.producto;

import com.tienda.ecommerce.common.PaginaResponse;
import com.tienda.ecommerce.common.RecursoNoEncontradoException;
import com.tienda.ecommerce.producto.dto.ProductoRequest;
import com.tienda.ecommerce.producto.dto.ProductoResponse;
import com.tienda.ecommerce.reporte.dto.ProductoBajoStockDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class ProductoServiceImpl implements ProductoService {

    private final ProductoRepository productoRepository;
    private final CategoriaRepository categoriaRepository;

    public ProductoServiceImpl(ProductoRepository productoRepository, CategoriaRepository categoriaRepository) {
        this.productoRepository = productoRepository;
        this.categoriaRepository = categoriaRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public PaginaResponse<ProductoResponse> listarPublico(String nombre, Long categoriaId, BigDecimal precioMin, BigDecimal precioMax, Pageable pageable) {
        String nombreFiltro = (nombre != null && !nombre.trim().isEmpty()) ? nombre.trim() : null;
        Page<Producto> pagina = productoRepository.buscarActivosConFiltros(nombreFiltro, categoriaId, precioMin, precioMax, pageable);
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
        producto.setStock(request.getStock());
        producto.setImagenUrl(request.getImagenUrl());
        producto.setCategoria(categoria);
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
        producto.setStock(request.getStock());
        producto.setImagenUrl(request.getImagenUrl());
        producto.setCategoria(categoria);

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
        return new ProductoResponse(
                p.getId(),
                p.getNombre(),
                p.getDescripcion(),
                p.getPrecio(),
                p.getStock(),
                p.getImagenUrl(),
                p.getCategoria() != null ? p.getCategoria().getId() : null,
                p.getCategoria() != null ? p.getCategoria().getNombre() : null,
                p.isActivo(),
                p.getFechaCreacion()
        );
    }
}
