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
    Optional<Pedido> findByCotizacionId(String cotizacionId);

    @Query("SELECT p FROM Pedido p JOIN FETCH p.usuario LEFT JOIN FETCH p.pago WHERE p.usuario.id = :usuarioId ORDER BY p.fecha DESC")
    List<Pedido> findByUsuarioIdOrderByFechaDesc(@Param("usuarioId") Long usuarioId);

    @Query(value = "SELECT p FROM Pedido p JOIN FETCH p.usuario LEFT JOIN FETCH p.pago WHERE (:estado IS NULL OR p.estado = :estado)",
           countQuery = "SELECT COUNT(p) FROM Pedido p WHERE (:estado IS NULL OR p.estado = :estado)")
    Page<Pedido> buscarPorEstado(@Param("estado") EstadoPedido estado, Pageable pageable);

    @Query("SELECT p FROM Pedido p JOIN FETCH p.usuario LEFT JOIN FETCH p.pago LEFT JOIN FETCH p.detalles d LEFT JOIN FETCH d.producto WHERE p.id = :id")
    Optional<Pedido> findByIdConDetalles(@Param("id") Long id);

    @Query("SELECT COUNT(p), COALESCE(SUM(COALESCE(p.totalBasePen, CASE WHEN p.monedaCodigo = 'PEN' THEN p.total ELSE 0 END)), 0) FROM Pedido p WHERE p.estado <> com.tienda.ecommerce.pedido.EstadoPedido.CANCELADO AND p.fecha BETWEEN :desde AND :hasta")
    List<Object[]> calcularResumenVentas(@Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta);

    @Query("SELECT CAST(p.fecha AS LocalDate), COALESCE(SUM(COALESCE(p.totalBasePen, CASE WHEN p.monedaCodigo = 'PEN' THEN p.total ELSE 0 END)), 0), COUNT(p) FROM Pedido p WHERE p.estado <> com.tienda.ecommerce.pedido.EstadoPedido.CANCELADO AND p.fecha BETWEEN :desde AND :hasta GROUP BY CAST(p.fecha AS LocalDate) ORDER BY CAST(p.fecha AS LocalDate) ASC")
    List<Object[]> agruparVentasPorFecha(@Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta);

    @Query("SELECT COUNT(p), COALESCE(SUM(COALESCE(p.totalBasePen, CASE WHEN p.monedaCodigo = 'PEN' THEN p.total ELSE 0 END)), 0) FROM Pedido p JOIN p.pago pag WHERE p.estado <> com.tienda.ecommerce.pedido.EstadoPedido.CANCELADO AND pag.estadoPago = com.tienda.ecommerce.pago.EstadoPago.APROBADO AND p.fecha BETWEEN :desde AND :hasta")
    List<Object[]> calcularResumenVentasPagadas(@Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta);

    @Query("SELECT CAST(p.fecha AS LocalDate), COALESCE(SUM(COALESCE(p.totalBasePen, CASE WHEN p.monedaCodigo = 'PEN' THEN p.total ELSE 0 END)), 0), COUNT(p) FROM Pedido p JOIN p.pago pag WHERE p.estado <> com.tienda.ecommerce.pedido.EstadoPedido.CANCELADO AND pag.estadoPago = com.tienda.ecommerce.pago.EstadoPago.APROBADO AND p.fecha BETWEEN :desde AND :hasta GROUP BY CAST(p.fecha AS LocalDate) ORDER BY CAST(p.fecha AS LocalDate) ASC")
    List<Object[]> agruparVentasPagadasPorFecha(@Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta);
    @Query("SELECT p.monedaCodigo, SUM(p.total), COUNT(p) FROM Pedido p JOIN p.pago pag WHERE pag.estadoPago = com.tienda.ecommerce.pago.EstadoPago.APROBADO AND p.estado <> com.tienda.ecommerce.pedido.EstadoPedido.CANCELADO AND p.fecha BETWEEN :desde AND :hasta GROUP BY p.monedaCodigo")
    List<Object[]> ventasPorMoneda(@Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta);
    @Query("SELECT COUNT(p) FROM Pedido p JOIN p.pago pag WHERE p.monedaCodigo <> 'PEN' AND p.totalBasePen IS NULL AND pag.estadoPago = com.tienda.ecommerce.pago.EstadoPago.APROBADO AND p.estado <> com.tienda.ecommerce.pedido.EstadoPedido.CANCELADO AND p.fecha BETWEEN :desde AND :hasta")
    long sinConversionHistorica(@Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta);
}
