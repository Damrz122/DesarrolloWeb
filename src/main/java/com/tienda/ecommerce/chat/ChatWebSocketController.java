package com.tienda.ecommerce.chat;

import com.tienda.ecommerce.chat.dto.MensajeChatRequest;
import com.tienda.ecommerce.chat.dto.MensajeChatResponse;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
public class ChatWebSocketController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;

    public ChatWebSocketController(ChatService chatService, SimpMessagingTemplate messagingTemplate) {
        this.chatService = chatService;
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/chat.enviar")
    public void enviarMensaje(@Payload MensajeChatRequest request) {
        // Persistir el mensaje en base de datos antes de retransmitirlo
        MensajeChatResponse mensajeGuardado = chatService.procesarYGuardarMensaje(request);

        // Difundir al tópico de la conversación activa
        String destino = "/topic/chat/" + request.getConversacionId();
        messagingTemplate.convertAndSend(destino, mensajeGuardado);
    }
}
