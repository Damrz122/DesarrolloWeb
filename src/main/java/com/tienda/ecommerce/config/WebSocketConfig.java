package com.tienda.ecommerce.config;

import com.tienda.ecommerce.chat.ChatAuthChannelInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final ChatAuthChannelInterceptor chatAuthInterceptor;

    public WebSocketConfig(ChatAuthChannelInterceptor chatAuthInterceptor) {
        this.chatAuthInterceptor = chatAuthInterceptor;
    }

    @Value("${app.cors.allowed-origins:http://localhost:8080,http://localhost:3000}")
    private String[] allowedOrigins;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Endpoint WS: solo origenes configurados, con JWT en CONNECT
        registry.addEndpoint("/ws-chat")
                .setAllowedOriginPatterns(allowedOrigins)
                .withSockJS();

        // Endpoint WS: solo origenes configurados, con JWT en CONNECT
        registry.addEndpoint("/ws-chat")
                .setAllowedOriginPatterns(allowedOrigins);
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Broker simple: envia mensajes a los clientes suscritos
        config.enableSimpleBroker("/topic", "/queue");
        // Prefijo app: recibe mensajes de los clientes
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // Interceptor auth: valida JWT en CONNECT del chat
        registration.interceptors(chatAuthInterceptor);
    }
}
