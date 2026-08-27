package com.tienda.ecommerce.chat;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ChatMensajeRepository extends JpaRepository<ChatMensaje, Long> {

    @Query("SELECT m FROM ChatMensaje m JOIN FETCH m.remitente WHERE m.conversacion.id = :conversacionId ORDER BY m.fechaEnvio ASC")
    List<ChatMensaje> findByConversacionIdOrderByFechaEnvioAsc(@Param("conversacionId") Long conversacionId);

    @Query("SELECT m FROM ChatMensaje m WHERE m.conversacion.id = :conversacionId ORDER BY m.fechaEnvio DESC LIMIT 1")
    Optional<ChatMensaje> findUltimoMensaje(@Param("conversacionId") Long conversacionId);
}
