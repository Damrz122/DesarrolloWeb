package com.tienda.ecommerce.chat;

import com.tienda.ecommerce.chat.dto.MensajeChatRequest;
import com.tienda.ecommerce.chat.dto.MensajeChatResponse;
import com.tienda.ecommerce.common.RecursoNoEncontradoException;
import com.tienda.ecommerce.usuario.Rol;
import com.tienda.ecommerce.usuario.Usuario;
import com.tienda.ecommerce.usuario.UsuarioRepository;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
public class ChatWebSocketController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;
    private final UsuarioRepository usuarioRepository;

    public ChatWebSocketController(ChatService chatService, SimpMessagingTemplate messagingTemplate,
                                   UsuarioRepository usuarioRepository) {
        this.chatService = chatService;
        this.messagingTemplate = messagingTemplate;
        this.usuarioRepository = usuarioRepository;
    }

    @MessageMapping("/chat.enviar")
    public void enviarMensaje(@Payload MensajeChatRequest request, Principal principal) {
        // Seguridad WS: exige usuario autenticado por JWT del CONNECT
        if (principal == null || principal.getName() == null) {
            throw new AccessDeniedException("Debes iniciar sesion para chatear");
        }
        Usuario usuario = usuarioRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado con email: " + principal.getName()));
        boolean esAdmin = usuario.getRol() == Rol.ADMIN;
        // Seguridad WS: guarda con el id autenticado, no el del payload
        MensajeChatResponse mensajeGuardado = chatService.procesarYGuardarMensaje(request, usuario.getId(), esAdmin);

        // Difunde al topico de la conversacion activa
        String destino = "/topic/chat/" + request.getConversacionId();
        messagingTemplate.convertAndSend(destino, mensajeGuardado);
    }
}
