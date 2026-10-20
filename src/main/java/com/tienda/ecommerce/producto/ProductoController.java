package com.tienda.ecommerce.producto;

import com.tienda.ecommerce.common.ApiResponse;
import com.tienda.ecommerce.common.PaginaResponse;
import com.tienda.ecommerce.producto.dto.ProductoRequest;
import com.tienda.ecommerce.producto.dto.ProductoResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/productos")
public class ProductoController {

    private final ProductoService productoService;

    public ProductoController(ProductoService productoService) {
        this.productoService = productoService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PaginaResponse<ProductoResponse>>> listarPublico(
            @RequestParam(required = false) String nombre,
            @RequestParam(required = false) Long categoriaId,
            @RequestParam(required = false) BigDecimal precioMin,
            @RequestParam(required = false) BigDecimal precioMax,
            @RequestParam(required = false) String etiqueta,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "fechaCreacion") String sortBy,
            @RequestParam(defaultValue = "desc") String direction
    ) {
        Sort sort = direction.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);
        PaginaResponse<ProductoResponse> resultado = productoService.listarPublico(nombre, categoriaId, precioMin, precioMax, etiqueta, pageable);
        return ResponseEntity.ok(ApiResponse.exito("Catálogo de productos obtenido", resultado));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductoResponse>> obtenerPorIdPublico(@PathVariable Long id) {
        ProductoResponse producto = productoService.obtenerPorIdPublico(id);
        return ResponseEntity.ok(ApiResponse.exito("Detalle del producto", producto));
    }

    @GetMapping("/admin")
    @PreAuthorize("hasAnyAuthority('PRODUCTOS_VER','PRODUCTOS_GESTIONAR','INVENTARIO_GESTIONAR')")
    public ResponseEntity<ApiResponse<PaginaResponse<ProductoResponse>>> listarParaAdmin(
            @RequestParam(required = false) String nombre,
            @RequestParam(required = false) Long categoriaId,
            @RequestParam(required = false) Boolean activo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        PaginaResponse<ProductoResponse> resultado = productoService.listarParaAdmin(nombre, categoriaId, activo, pageable);
        return ResponseEntity.ok(ApiResponse.exito("Listado administrativo de productos", resultado));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('PRODUCTOS_GESTIONAR') and hasAuthority('PRECIOS_GESTIONAR')")
    public ResponseEntity<ApiResponse<ProductoResponse>> crear(@Valid @RequestBody ProductoRequest request) {
        ProductoResponse creado = productoService.crear(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.exito("Producto creado exitosamente", creado));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('PRODUCTOS_GESTIONAR') and hasAuthority('PRECIOS_GESTIONAR')")
    public ResponseEntity<ApiResponse<ProductoResponse>> actualizar(
            @PathVariable Long id,
            @Valid @RequestBody ProductoRequest request
    ) {
        ProductoResponse actualizado = productoService.actualizar(id, request);
        return ResponseEntity.ok(ApiResponse.exito("Producto actualizado exitosamente", actualizado));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('PRODUCTOS_GESTIONAR')")
    public ResponseEntity<ApiResponse<Void>> eliminar(@PathVariable Long id) {
        productoService.eliminar(id);
        return ResponseEntity.ok(ApiResponse.exito("Producto desactivado correctamente", null));
    }
    public record StockRequest(@jakarta.validation.constraints.PositiveOrZero int stock) {}
    @PatchMapping("/{id}/stock")
    @PreAuthorize("hasAuthority('INVENTARIO_GESTIONAR')")
    public ResponseEntity<ApiResponse<Void>> stock(@PathVariable Long id, @Valid @RequestBody StockRequest request) {
        inventario.actualizar(id, request.stock());
        return ResponseEntity.ok(ApiResponse.exito("Stock actualizado", null));
    }
    @org.springframework.beans.factory.annotation.Autowired private InventarioService inventario;
}
