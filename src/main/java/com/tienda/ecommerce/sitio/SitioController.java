package com.tienda.ecommerce.sitio;

import com.tienda.ecommerce.common.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

// sitio controller: config editable del home (apariencia). Lo publico lo lee la tienda.
@RestController
@RequestMapping("/api/sitio")
public class SitioController {

    private final SitioService sitioService;

    public SitioController(SitioService sitioService) {
        this.sitioService = sitioService;
    }

    @GetMapping("/publico")
    public ResponseEntity<ApiResponse<Map<String, String>>> obtenerPublico() {
        return ResponseEntity.ok(ApiResponse.exito("Configuración del sitio", sitioService.obtenerTodo()));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('APARIENCIA_GESTIONAR')")
    public ResponseEntity<ApiResponse<Map<String, String>>> obtenerTodo() {
        return ResponseEntity.ok(ApiResponse.exito("Configuración del sitio", sitioService.obtenerTodo()));
    }

    @PutMapping
    @PreAuthorize("hasAuthority('APARIENCIA_GESTIONAR')")
    public ResponseEntity<ApiResponse<Map<String, String>>> guardar(
            @RequestBody Map<String, String> cambios
    ) {
        return ResponseEntity.ok(ApiResponse.exito("Apariencia actualizada", sitioService.guardarTodo(cambios)));
    }
}
