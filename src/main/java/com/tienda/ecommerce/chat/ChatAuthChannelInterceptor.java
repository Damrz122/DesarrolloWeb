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

    public ChatAuthChannelInterceptor(JwtService jwtService) {
        this.jwtService = jwtService;
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
