package com.tienda.ecommerce.pedido;

import com.tienda.ecommerce.common.ApiResponse;
import com.tienda.ecommerce.common.PaginaResponse;
import com.tienda.ecommerce.common.RecursoNoEncontradoException;
import com.tienda.ecommerce.pedido.dto.CambiarEstadoPedidoRequest;
import com.tienda.ecommerce.pedido.dto.CrearPedidoRequest;
import com.tienda.ecommerce.pedido.dto.PedidoResponse;
import com.tienda.ecommerce.usuario.Rol;
import com.tienda.ecommerce.usuario.Usuario;
import com.tienda.ecommerce.usuario.UsuarioRepository;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pedidos")
public class PedidoController {

    private final PedidoService pedidoService;
    private final UsuarioRepository usuarioRepository;

    public PedidoController(PedidoService pedidoService, UsuarioRepository usuarioRepository) {
        this.pedidoService = pedidoService;
        this.usuarioRepository = usuarioRepository;
    }

    private Usuario obtenerUsuarioAutenticado(Authentication authentication) {
        return usuarioRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado con email: " + authentication.getName()));
    }

    @PostMapping
    @PreAuthorize("hasRole('CLIENTE') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PedidoResponse>> crearPedido(
            Authentication authentication,
            @Valid @RequestBody CrearPedidoRequest request
    ) {
        Usuario usuario = obtenerUsuarioAutenticado(authentication);
        PedidoResponse creado = pedidoService.crearDesdeCarrito(usuario.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.exito("Pedido generado exitosamente", creado));
    }

    @GetMapping("/mios")
    @PreAuthorize("hasRole('CLIENTE') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<PedidoResponse>>> listarMisPedidos(Authentication authentication) {
        Usuario usuario = obtenerUsuarioAutenticado(authentication);
        List<PedidoResponse> pedidos = pedidoService.listarMisPedidos(usuario.getId());
        return ResponseEntity.ok(ApiResponse.exito("Historial de pedidos obtenido", pedidos));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<PedidoResponse>> obtenerPorId(
            Authentication authentication,
            @PathVariable Long id
    ) {
        Usuario usuario = obtenerUsuarioAutenticado(authentication);
        boolean esAdmin = usuario.getRol() == Rol.ADMIN;
        PedidoResponse pedido = pedidoService.obtenerPorId(id, usuario.getId(), esAdmin);
        return ResponseEntity.ok(ApiResponse.exito("Detalle del pedido obtenido", pedido));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PaginaResponse<PedidoResponse>>> listarParaAdmin(
            @RequestParam(required = false) EstadoPedido estado,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("fecha").descending());
        PaginaResponse<PedidoResponse> resultado = pedidoService.listarParaAdmin(estado, pageable);
        return ResponseEntity.ok(ApiResponse.exito("Listado de pedidos obtenido", resultado));
    }

    @PatchMapping("/{id}/estado")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PedidoResponse>> cambiarEstado(
            @PathVariable Long id,
            @Valid @RequestBody CambiarEstadoPedidoRequest request
    ) {
        PedidoResponse actualizado = pedidoService.cambiarEstado(id, request.getEstado());
        return ResponseEntity.ok(ApiResponse.exito("Estado del pedido actualizado exitosamente", actualizado));
    }
}
