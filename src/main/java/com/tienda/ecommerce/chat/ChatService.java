package com.tienda.ecommerce.chat;

import com.tienda.ecommerce.chat.dto.ConversacionResponse;
import com.tienda.ecommerce.chat.dto.MensajeChatRequest;
import com.tienda.ecommerce.chat.dto.MensajeChatResponse;

import java.util.List;

public interface ChatService {
    ConversacionResponse obtenerOCrearConversacionCliente(Long clienteId);
    List<ConversacionResponse> listarConversacionesAdmin();
    List<MensajeChatResponse> obtenerHistorial(Long conversacionId, Long usuarioId, boolean esAdmin);
    MensajeChatResponse procesarYGuardarMensaje(MensajeChatRequest request, Long remitenteAutenticadoId, boolean esAdmin);
}
