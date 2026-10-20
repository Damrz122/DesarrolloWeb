package com.tienda.ecommerce.producto;

import com.tienda.ecommerce.common.ApiResponse;
import com.tienda.ecommerce.producto.dto.CategoriaRequest;
import com.tienda.ecommerce.producto.dto.CategoriaResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categorias")
public class CategoriaController {

    private final CategoriaService categoriaService;

    public CategoriaController(CategoriaService categoriaService) {
        this.categoriaService = categoriaService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<CategoriaResponse>>> listarTodas() {
        List<CategoriaResponse> categorias = categoriaService.listarTodas();
        return ResponseEntity.ok(ApiResponse.exito("Categorías obtenidas correctamente", categorias));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CategoriaResponse>> obtenerPorId(@PathVariable Long id) {
        CategoriaResponse categoria = categoriaService.obtenerPorId(id);
        return ResponseEntity.ok(ApiResponse.exito("Categoría encontrada", categoria));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('CATEGORIAS_GESTIONAR')")
    public ResponseEntity<ApiResponse<CategoriaResponse>> crear(@Valid @RequestBody CategoriaRequest request) {
        CategoriaResponse creada = categoriaService.crear(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.exito("Categoría creada exitosamente", creada));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('CATEGORIAS_GESTIONAR')")
    public ResponseEntity<ApiResponse<CategoriaResponse>> actualizar(
            @PathVariable Long id,
            @Valid @RequestBody CategoriaRequest request
    ) {
        CategoriaResponse actualizada = categoriaService.actualizar(id, request);
        return ResponseEntity.ok(ApiResponse.exito("Categoría actualizada exitosamente", actualizada));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('CATEGORIAS_GESTIONAR')")
    public ResponseEntity<ApiResponse<Void>> eliminar(@PathVariable Long id) {
        categoriaService.eliminar(id);
        return ResponseEntity.ok(ApiResponse.exito("Categoría eliminada exitosamente", null));
    }
}
