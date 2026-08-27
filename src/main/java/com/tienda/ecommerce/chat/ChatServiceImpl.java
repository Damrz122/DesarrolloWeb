package com.tienda.ecommerce.chat;

import com.tienda.ecommerce.chat.dto.ConversacionResponse;
import com.tienda.ecommerce.chat.dto.MensajeChatRequest;
import com.tienda.ecommerce.chat.dto.MensajeChatResponse;
import com.tienda.ecommerce.common.RecursoNoEncontradoException;
import com.tienda.ecommerce.usuario.Rol;
import com.tienda.ecommerce.usuario.Usuario;
import com.tienda.ecommerce.usuario.UsuarioRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class ChatServiceImpl implements ChatService {

    private final ConversacionChatRepository conversacionRepository;
    private final ChatMensajeRepository chatMensajeRepository;
    private final UsuarioRepository usuarioRepository;

    public ChatServiceImpl(
            ConversacionChatRepository conversacionRepository,
            ChatMensajeRepository chatMensajeRepository,
            UsuarioRepository usuarioRepository
    ) {
        this.conversacionRepository = conversacionRepository;
        this.chatMensajeRepository = chatMensajeRepository;
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    @Transactional
    public ConversacionResponse obtenerOCrearConversacionCliente(Long clienteId) {
        ConversacionChat conversacion = conversacionRepository.findActivaByClienteId(clienteId)
                .orElseGet(() -> {
                    Usuario cliente = usuarioRepository.findById(clienteId)
                            .orElseThrow(() -> new RecursoNoEncontradoException("Usuario cliente no encontrado con id: " + clienteId));
                    ConversacionChat nueva = new ConversacionChat(null, cliente, null, "ACTIVA");
                    return conversacionRepository.save(nueva);
                });

        return mapearConversacion(conversacion);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ConversacionResponse> listarConversacionesAdmin() {
        List<ConversacionChat> lista = conversacionRepository.findAllConUsuarios();
        List<ConversacionResponse> respuesta = new ArrayList<>();

        for (ConversacionChat conv : lista) {
            String ultimo = chatMensajeRepository.findUltimoMensaje(conv.getId())
                    .map(ChatMensaje::getContenido)
                    .orElse("Sin mensajes");

            ConversacionResponse dto = mapearConversacion(conv);
            dto.setUltimoMensaje(ultimo);
            respuesta.add(dto);
        }

        return respuesta;
    }

    @Override
    @Transactional(readOnly = true)
    public List<MensajeChatResponse> obtenerHistorial(Long conversacionId, Long usuarioId, boolean esAdmin) {
        ConversacionChat conversacion = conversacionRepository.findById(conversacionId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Conversación no encontrada con id: " + conversacionId));

        if (!esAdmin && !conversacion.getCliente().getId().equals(usuarioId)) {
            throw new AccessDeniedException("No tienes permiso para consultar los mensajes de esta conversación");
        }

        return chatMensajeRepository.findByConversacionIdOrderByFechaEnvioAsc(conversacionId).stream()
                .map(this::mapearMensaje)
                .toList();
    }

    @Override
    @Transactional
    public MensajeChatResponse procesarYGuardarMensaje(MensajeChatRequest request) {
        ConversacionChat conversacion = conversacionRepository.findById(request.getConversacionId())
                .orElseThrow(() -> new RecursoNoEncontradoException("Conversación no encontrada con id: " + request.getConversacionId()));

        Usuario remitente = usuarioRepository.findById(request.getRemitenteId())
                .orElseThrow(() -> new RecursoNoEncontradoException("Remitente no encontrado con id: " + request.getRemitenteId()));

        // Si quien responde es un administrador y la conversación no tenía admin asignado, asignarlo
        if (remitente.getRol() == Rol.ADMIN && conversacion.getAdmin() == null) {
            conversacion.setAdmin(remitente);
            conversacionRepository.save(conversacion);
        }

        ChatMensaje mensaje = new ChatMensaje(
                null,
                conversacion,
                remitente,
                request.getContenido().trim()
        );
        mensaje.setFechaEnvio(LocalDateTime.now());

        ChatMensaje guardado = chatMensajeRepository.save(mensaje);
        return mapearMensaje(guardado);
    }

    private ConversacionResponse mapearConversacion(ConversacionChat c) {
        return new ConversacionResponse(
                c.getId(),
                c.getCliente() != null ? c.getCliente().getId() : null,
                c.getCliente() != null ? c.getCliente().getNombre() : "Cliente",
                c.getAdmin() != null ? c.getAdmin().getId() : null,
                c.getAdmin() != null ? c.getAdmin().getNombre() : "Sin asignar",
                c.getEstado(),
                c.getFechaCreacion(),
                null
        );
    }

    private MensajeChatResponse mapearMensaje(ChatMensaje m) {
        return new MensajeChatResponse(
                m.getId(),
                m.getConversacion().getId(),
                m.getRemitente().getId(),
                m.getRemitente().getNombre(),
                m.getRemitente().getRol(),
                m.getContenido(),
                m.getFechaEnvio()
        );
    }
}
