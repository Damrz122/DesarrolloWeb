package com.tienda.ecommerce.carrito;

import com.tienda.ecommerce.carrito.dto.ActualizarItemCarritoRequest;
import com.tienda.ecommerce.carrito.dto.CarritoResponse;
import com.tienda.ecommerce.carrito.dto.ItemCarritoRequest;
import com.tienda.ecommerce.common.ApiResponse;
import com.tienda.ecommerce.common.RecursoNoEncontradoException;
import com.tienda.ecommerce.usuario.Usuario;
import com.tienda.ecommerce.usuario.UsuarioRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/carrito")
@PreAuthorize("hasRole('CLIENTE') or hasRole('ADMIN')")
public class CarritoController {

    private final CarritoService carritoService;
    private final UsuarioRepository usuarioRepository;

    public CarritoController(CarritoService carritoService, UsuarioRepository usuarioRepository) {
        this.carritoService = carritoService;
        this.usuarioRepository = usuarioRepository;
    }

    private Long obtenerUsuarioId(Authentication authentication) {
        Usuario usuario = usuarioRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado con email: " + authentication.getName()));
        return usuario.getId();
    }

    @GetMapping
    public ResponseEntity<ApiResponse<CarritoResponse>> obtenerCarrito(Authentication authentication) {
        Long usuarioId = obtenerUsuarioId(authentication);
        CarritoResponse carrito = carritoService.obtenerCarrito(usuarioId);
        return ResponseEntity.ok(ApiResponse.exito("Carrito obtenido exitosamente", carrito));
    }

    @PostMapping("/items")
    public ResponseEntity<ApiResponse<CarritoResponse>> agregarItem(
            Authentication authentication,
            @Valid @RequestBody ItemCarritoRequest request
    ) {
        Long usuarioId = obtenerUsuarioId(authentication);
        CarritoResponse carrito = carritoService.agregarItem(usuarioId, request);
        return ResponseEntity.ok(ApiResponse.exito("Producto agregado al carrito", carrito));
    }

    @PutMapping("/items/{id}")
    public ResponseEntity<ApiResponse<CarritoResponse>> actualizarCantidadItem(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody ActualizarItemCarritoRequest request
    ) {
        Long usuarioId = obtenerUsuarioId(authentication);
        CarritoResponse carrito = carritoService.actualizarCantidadItem(usuarioId, id, request.getCantidad());
        return ResponseEntity.ok(ApiResponse.exito("Cantidad actualizada en el carrito", carrito));
    }

    @DeleteMapping("/items/{id}")
    public ResponseEntity<ApiResponse<CarritoResponse>> removerItem(
            Authentication authentication,
            @PathVariable Long id
    ) {
        Long usuarioId = obtenerUsuarioId(authentication);
        CarritoResponse carrito = carritoService.removerItem(usuarioId, id);
        return ResponseEntity.ok(ApiResponse.exito("Producto removido del carrito", carrito));
    }
}
