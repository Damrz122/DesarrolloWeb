package com.tienda.ecommerce.producto;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface ProductoRepository extends JpaRepository<Producto, Long> {

    @Query("""
        SELECT p FROM Producto p
        JOIN FETCH p.categoria
        WHERE p.activo = true
          AND (CAST(:nombre AS string) IS NULL OR LOWER(p.nombre) LIKE CONCAT('%', LOWER(CAST(:nombre AS string)), '%'))
          AND (:categoriaId IS NULL OR p.categoria.id = :categoriaId)
          AND (:precioMin IS NULL OR p.precio >= :precioMin)
          AND (:precioMax IS NULL OR p.precio <= :precioMax)
          AND (CAST(:etiqueta AS string) IS NULL OR p.etiqueta = CAST(:etiqueta AS string))
    """)
    Page<Producto> buscarActivosConFiltros(
            @Param("nombre") String nombre,
            @Param("categoriaId") Long categoriaId,
            @Param("precioMin") BigDecimal precioMin,
            @Param("precioMax") BigDecimal precioMax,
            @Param("etiqueta") String etiqueta,
            Pageable pageable
    );

    @Query("""
        SELECT p FROM Producto p
        JOIN FETCH p.categoria
        WHERE (CAST(:nombre AS string) IS NULL OR LOWER(p.nombre) LIKE CONCAT('%', LOWER(CAST(:nombre AS string)), '%'))
          AND (:categoriaId IS NULL OR p.categoria.id = :categoriaId)
          AND (:activo IS NULL OR p.activo = :activo)
    """)
    Page<Producto> buscarParaAdmin(
            @Param("nombre") String nombre,
            @Param("categoriaId") Long categoriaId,
            @Param("activo") Boolean activo,
            Pageable pageable
    );

    @Query("SELECT p FROM Producto p JOIN FETCH p.categoria WHERE p.id = :id AND p.activo = true")
    Optional<Producto> findByIdAndActivoTrue(@Param("id") Long id);

    @Query("SELECT p FROM Producto p JOIN FETCH p.categoria WHERE p.activo = true AND p.stock <= :umbral ORDER BY p.stock ASC")
    List<Producto> findProductosConBajoStock(@Param("umbral") int umbral);
}
