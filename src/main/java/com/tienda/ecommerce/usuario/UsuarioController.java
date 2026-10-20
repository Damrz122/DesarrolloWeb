package com.tienda.ecommerce.usuario;

import com.tienda.ecommerce.common.ApiResponse;
import com.tienda.ecommerce.common.BadRequestException;
import com.tienda.ecommerce.usuario.dto.ActualizarUsuarioRequest;
import com.tienda.ecommerce.usuario.dto.CambiarEstadoUsuarioRequest;
import com.tienda.ecommerce.usuario.dto.CambiarRolRequest;
import com.tienda.ecommerce.usuario.dto.CrearUsuarioRequest;
import com.tienda.ecommerce.usuario.dto.EditarUsuarioRequest;
import com.tienda.ecommerce.usuario.dto.UsuarioResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
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
    @PreAuthorize("hasAuthority('USUARIOS_GESTIONAR')")
    public ResponseEntity<ApiResponse<List<UsuarioResponse>>> listarTodos() {
        List<UsuarioResponse> usuarios = usuarioService.listarTodos();
        return ResponseEntity.ok(ApiResponse.exito("Listado de usuarios obtenido", usuarios));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('USUARIOS_GESTIONAR')")
    public ResponseEntity<ApiResponse<UsuarioResponse>> crear(
            @Valid @RequestBody CrearUsuarioRequest request
    ) {
        UsuarioResponse creado = usuarioService.crear(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.exito("Usuario creado exitosamente", creado));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('USUARIOS_GESTIONAR')")
    public ResponseEntity<ApiResponse<UsuarioResponse>> editar(
            @PathVariable Long id,
            @Valid @RequestBody EditarUsuarioRequest request
    ) {
        UsuarioResponse actualizado = usuarioService.editar(id, request);
        return ResponseEntity.ok(ApiResponse.exito("Usuario actualizado correctamente", actualizado));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('USUARIOS_GESTIONAR')")
    public ResponseEntity<ApiResponse<Void>> eliminar(
            @PathVariable Long id,
            Authentication authentication
    ) {
        UsuarioResponse objetivo = usuarioService.obtenerPorId(id);
        if (objetivo.getEmail().equalsIgnoreCase(authentication.getName())) {
            throw new BadRequestException("No puedes eliminar tu propia cuenta");
        }
        usuarioService.eliminar(id);
        return ResponseEntity.ok(ApiResponse.exito("Usuario eliminado correctamente", null));
    }

    @PatchMapping("/{id}/rol")
    @PreAuthorize("hasAuthority('USUARIOS_GESTIONAR')")
    public ResponseEntity<ApiResponse<UsuarioResponse>> cambiarRol(
            @PathVariable Long id,
            @Valid @RequestBody CambiarRolRequest request,
            Authentication authentication
    ) {
        UsuarioResponse objetivo = usuarioService.obtenerPorId(id);
        if (objetivo.getEmail().equalsIgnoreCase(authentication.getName())
                && !Rol.ADMIN.equals(request.getRol())) {
            throw new BadRequestException("No puedes quitarte tu propio rol de administrador");
        }
        UsuarioResponse actualizado = usuarioService.cambiarRol(id, request.getRol());
        return ResponseEntity.ok(ApiResponse.exito("Rol de usuario actualizado", actualizado));
    }

    @PatchMapping("/{id}/estado")
    @PreAuthorize("hasAuthority('USUARIOS_GESTIONAR')")
    public ResponseEntity<ApiResponse<UsuarioResponse>> cambiarEstado(
            @PathVariable Long id,
            @Valid @RequestBody CambiarEstadoUsuarioRequest request,
            Authentication authentication
    ) {
        UsuarioResponse objetivo = usuarioService.obtenerPorId(id);
        if (!request.getActivo() && objetivo.getEmail().equalsIgnoreCase(authentication.getName())) {
            throw new BadRequestException("No puedes desactivar tu propia cuenta");
        }
        UsuarioResponse actualizado = usuarioService.cambiarEstado(id, request.getActivo());
        String mensaje = request.getActivo() ? "Usuario activado" : "Usuario desactivado";
        return ResponseEntity.ok(ApiResponse.exito(mensaje, actualizado));
    }
}
