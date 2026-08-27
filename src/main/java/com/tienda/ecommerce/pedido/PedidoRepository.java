package com.tienda.ecommerce.pedido;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PedidoRepository extends JpaRepository<Pedido, Long> {

    @Query("SELECT p FROM Pedido p JOIN FETCH p.usuario WHERE p.usuario.id = :usuarioId ORDER BY p.fecha DESC")
    List<Pedido> findByUsuarioIdOrderByFechaDesc(@Param("usuarioId") Long usuarioId);

    @Query(value = "SELECT p FROM Pedido p JOIN FETCH p.usuario WHERE (:estado IS NULL OR p.estado = :estado)",
           countQuery = "SELECT COUNT(p) FROM Pedido p WHERE (:estado IS NULL OR p.estado = :estado)")
    Page<Pedido> buscarPorEstado(@Param("estado") EstadoPedido estado, Pageable pageable);

    @Query("SELECT p FROM Pedido p JOIN FETCH p.usuario LEFT JOIN FETCH p.detalles d LEFT JOIN FETCH d.producto WHERE p.id = :id")
    Optional<Pedido> findByIdConDetalles(@Param("id") Long id);

    @Query("SELECT COUNT(p), COALESCE(SUM(p.total), 0) FROM Pedido p WHERE p.estado <> com.tienda.ecommerce.pedido.EstadoPedido.CANCELADO AND p.fecha BETWEEN :desde AND :hasta")
    List<Object[]> calcularResumenVentas(@Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta);

    @Query("SELECT CAST(p.fecha AS LocalDate), COALESCE(SUM(p.total), 0), COUNT(p) FROM Pedido p WHERE p.estado <> com.tienda.ecommerce.pedido.EstadoPedido.CANCELADO AND p.fecha BETWEEN :desde AND :hasta GROUP BY CAST(p.fecha AS LocalDate) ORDER BY CAST(p.fecha AS LocalDate) ASC")
    List<Object[]> agruparVentasPorFecha(@Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta);
}
