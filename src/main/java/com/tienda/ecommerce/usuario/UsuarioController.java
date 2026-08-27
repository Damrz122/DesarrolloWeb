package com.tienda.ecommerce.usuario;

import com.tienda.ecommerce.common.ApiResponse;
import com.tienda.ecommerce.usuario.dto.ActualizarUsuarioRequest;
import com.tienda.ecommerce.usuario.dto.CambiarRolRequest;
import com.tienda.ecommerce.usuario.dto.UsuarioResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

    private final UsuarioService usuarioService;

    public UsuarioController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UsuarioResponse>> obtenerPerfil(Authentication authentication) {
        String email = authentication.getName();
        UsuarioResponse perfil = usuarioService.obtenerPorEmail(email);
        return ResponseEntity.ok(ApiResponse.exito("Perfil de usuario obtenido", perfil));
    }

    @PutMapping("/me")
    public ResponseEntity<ApiResponse<UsuarioResponse>> actualizarPerfil(
            Authentication authentication,
            @Valid @RequestBody ActualizarUsuarioRequest request
    ) {
        String email = authentication.getName();
        UsuarioResponse usuarioActual = usuarioService.obtenerPorEmail(email);
        UsuarioResponse actualizado = usuarioService.actualizar(usuarioActual.getId(), request);
        return ResponseEntity.ok(ApiResponse.exito("Perfil actualizado exitosamente", actualizado));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<UsuarioResponse>>> listarTodos() {
        List<UsuarioResponse> usuarios = usuarioService.listarTodos();
        return ResponseEntity.ok(ApiResponse.exito("Listado de usuarios obtenido", usuarios));
    }

    @PatchMapping("/{id}/rol")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UsuarioResponse>> cambiarRol(
            @PathVariable Long id,
            @Valid @RequestBody CambiarRolRequest request
    ) {
        UsuarioResponse actualizado = usuarioService.cambiarRol(id, request.getRol());
        return ResponseEntity.ok(ApiResponse.exito("Rol de usuario actualizado", actualizado));
    }
}
