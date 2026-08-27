package com.tienda.ecommerce.carrito;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface CarritoRepository extends JpaRepository<Carrito, Long> {

    @Query("SELECT c FROM Carrito c LEFT JOIN FETCH c.items i LEFT JOIN FETCH i.producto WHERE c.usuario.id = :usuarioId")
    Optional<Carrito> findByUsuarioIdConItems(@Param("usuarioId") Long usuarioId);

    Optional<Carrito> findByUsuarioId(Long usuarioId);
}
