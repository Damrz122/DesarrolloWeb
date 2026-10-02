package com.tienda.ecommerce.producto;

import com.tienda.ecommerce.common.PaginaResponse;
import com.tienda.ecommerce.producto.dto.ProductoRequest;
import com.tienda.ecommerce.producto.dto.ProductoResponse;
import com.tienda.ecommerce.reporte.dto.ProductoBajoStockDTO;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.List;

public interface ProductoService {
    PaginaResponse<ProductoResponse> listarPublico(String nombre, Long categoriaId, BigDecimal precioMin, BigDecimal precioMax, String etiqueta, Pageable pageable);
    ProductoResponse obtenerPorIdPublico(Long id);
    PaginaResponse<ProductoResponse> listarParaAdmin(String nombre, Long categoriaId, Boolean activo, Pageable pageable);
    ProductoResponse obtenerPorId(Long id);
    ProductoResponse crear(ProductoRequest request);
    ProductoResponse actualizar(Long id, ProductoRequest request);
    void eliminar(Long id);
    List<ProductoBajoStockDTO> obtenerProductosBajoStock(int umbral);
}
