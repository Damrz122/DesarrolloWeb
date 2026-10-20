package com.tienda.ecommerce.chat;

import com.tienda.ecommerce.chat.dto.ConversacionResponse;
import com.tienda.ecommerce.chat.dto.MensajeChatResponse;
import com.tienda.ecommerce.common.ApiResponse;
import com.tienda.ecommerce.common.RecursoNoEncontradoException;
import com.tienda.ecommerce.usuario.Rol;
import com.tienda.ecommerce.usuario.Usuario;
import com.tienda.ecommerce.usuario.UsuarioRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chat")
public class ChatRestController {

    private final ChatService chatService;
    private final UsuarioRepository usuarioRepository;

    public ChatRestController(ChatService chatService, UsuarioRepository usuarioRepository) {
        this.chatService = chatService;
        this.usuarioRepository = usuarioRepository;
    }

    private Usuario obtenerUsuarioAutenticado(Authentication authentication) {
        return usuarioRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado con email: " + authentication.getName()));
    }

    @GetMapping("/mi-conversacion")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<ConversacionResponse>> obtenerMiConversacion(Authentication authentication) {
        Usuario usuario = obtenerUsuarioAutenticado(authentication);
        ConversacionResponse conversacion = chatService.obtenerOCrearConversacionCliente(usuario.getId());
        return ResponseEntity.ok(ApiResponse.exito("Conversación activa obtenida", conversacion));
    }

    @GetMapping("/conversaciones")
    @PreAuthorize("hasAuthority('CHAT_ATENDER')")
    public ResponseEntity<ApiResponse<List<ConversacionResponse>>> listarConversaciones() {
        List<ConversacionResponse> conversaciones = chatService.listarConversacionesAdmin();
        return ResponseEntity.ok(ApiResponse.exito("Conversaciones de chat obtenidas", conversaciones));
    }

    @GetMapping("/conversaciones/{id}/mensajes")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<MensajeChatResponse>>> obtenerMensajes(
            Authentication authentication,
            @PathVariable Long id
    ) {
        Usuario usuario = obtenerUsuarioAutenticado(authentication);
        boolean esAdmin = authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("CHAT_ATENDER"));
        List<MensajeChatResponse> mensajes = chatService.obtenerHistorial(id, usuario.getId(), esAdmin);
        return ResponseEntity.ok(ApiResponse.exito("Historial de mensajes obtenido", mensajes));
    }
}
