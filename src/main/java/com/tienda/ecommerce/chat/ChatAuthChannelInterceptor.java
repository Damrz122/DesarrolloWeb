package com.tienda.ecommerce.chat;

import com.tienda.ecommerce.auth.JwtService;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;

import java.security.Principal;
import java.util.List;

// Interceptor WS: valida el JWT del header STOMP y fija el usuario autenticado.
@Component
public class ChatAuthChannelInterceptor implements ChannelInterceptor {

    private final JwtService jwtService;
    private final com.tienda.ecommerce.usuario.UsuarioRepository usuarios;
    private final com.tienda.ecommerce.configuracion.AccesoService acceso;
    private final ConversacionChatRepository conversaciones;

    public ChatAuthChannelInterceptor(JwtService jwtService, com.tienda.ecommerce.usuario.UsuarioRepository usuarios,
            com.tienda.ecommerce.configuracion.AccesoService acceso, ConversacionChatRepository conversaciones) {
        this.jwtService = jwtService;
        this.usuarios=usuarios;this.acceso=acceso;this.conversaciones=conversaciones;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String token = extraerToken(accessor);
            if (token != null && jwtService.esTokenValido(token)) {
                String email = jwtService.extraerEmail(token);
                if (email != null) {
                    UsernamePasswordAuthenticationToken auth =
                            new UsernamePasswordAuthenticationToken(email, null, List.of());
                    accessor.setUser(auth);
                }
            }
            if(accessor.getUser()==null) throw new org.springframework.security.access.AccessDeniedException("Sesión requerida");
        }
        if (accessor != null && accessor.getCommand() != null && accessor.getCommand() != StompCommand.DISCONNECT) {
            Principal principal=accessor.getUser();
            var usuario=principal==null?null:usuarios.findByEmail(principal.getName()).orElse(null);
            if(usuario==null || !usuario.isActivo() || !acceso.rolActivo(usuario)) throw new org.springframework.security.access.AccessDeniedException("Sesión inactiva");
            if(accessor.getCommand()==StompCommand.SUBSCRIBE) {
                String destino=accessor.getDestination();
                if(destino==null || !destino.matches("/topic/chat/[0-9]+")) throw new org.springframework.security.access.AccessDeniedException("Destino no autorizado");
                var conversacion=conversaciones.findById(Long.valueOf(destino.substring(destino.lastIndexOf('/')+1))).orElseThrow();
                if(!conversacion.getCliente().getId().equals(usuario.getId()) && !acceso.tiene(usuario,"CHAT_ATENDER")) throw new org.springframework.security.access.AccessDeniedException("Conversación no autorizada");
            }
        }
        return message;
    }

    private String extraerToken(StompHeaderAccessor accessor) {
        List<String> valores = accessor.getNativeHeader("Authorization");
        if (valores == null || valores.isEmpty()) {
            valores = accessor.getNativeHeader("authorization");
        }
        if (valores == null || valores.isEmpty() || valores.get(0) == null) {
            return null;
        }
        String header = valores.get(0);
        return header.startsWith("Bearer ") ? header.substring(7) : null;
    }
}
