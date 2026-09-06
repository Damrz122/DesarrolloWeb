package com.tienda.ecommerce.chat;

import com.tienda.ecommerce.usuario.Usuario;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "chat_mensajes",
    indexes = {
        @Index(name = "idx_chat_mensaje_conversacion_fecha", columnList = "conversacion_id, fecha_envio"),
        @Index(name = "idx_chat_mensaje_remitente", columnList = "remitente_id")
    }
)
public class ChatMensaje {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversacion_id", nullable = false)
    private ConversacionChat conversacion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "remitente_id", nullable = false)
    private Usuario remitente;

    @Column(nullable = false, length = 1000)
    private String contenido;

    @Column(name = "fecha_envio", nullable = false)
    private LocalDateTime fechaEnvio = LocalDateTime.now();

    public ChatMensaje() {
    }

    public ChatMensaje(Long id, ConversacionChat conversacion, Usuario remitente, String contenido) {
        this.id = id;
        this.conversacion = conversacion;
        this.remitente = remitente;
        this.contenido = contenido;
        this.fechaEnvio = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public ConversacionChat getConversacion() {
        return conversacion;
    }

    public void setConversacion(ConversacionChat conversacion) {
        this.conversacion = conversacion;
    }

    public Usuario getRemitente() {
        return remitente;
    }

    public void setRemitente(Usuario remitente) {
        this.remitente = remitente;
    }

    public String getContenido() {
        return contenido;
    }

    public void setContenido(String contenido) {
        this.contenido = contenido;
    }

    public LocalDateTime getFechaEnvio() {
        return fechaEnvio;
    }

    public void setFechaEnvio(LocalDateTime fechaEnvio) {
        this.fechaEnvio = fechaEnvio;
    }
}
