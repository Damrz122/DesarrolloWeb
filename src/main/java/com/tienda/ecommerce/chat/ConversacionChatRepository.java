package com.tienda.ecommerce.chat;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ConversacionChatRepository extends JpaRepository<ConversacionChat, Long> {

    @Query("SELECT c FROM ConversacionChat c JOIN FETCH c.cliente LEFT JOIN FETCH c.admin WHERE c.cliente.id = :clienteId AND c.estado = 'ACTIVA'")
    Optional<ConversacionChat> findActivaByClienteId(@Param("clienteId") Long clienteId);

    @Query("SELECT c FROM ConversacionChat c JOIN FETCH c.cliente LEFT JOIN FETCH c.admin ORDER BY c.fechaCreacion DESC")
    List<ConversacionChat> findAllConUsuarios();
}
