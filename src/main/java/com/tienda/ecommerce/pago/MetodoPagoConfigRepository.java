package com.tienda.ecommerce.pago;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface MetodoPagoConfigRepository extends JpaRepository<MetodoPagoConfig, String> {
    List<MetodoPagoConfig> findByActivoTrueOrderByOrdenAscNombreAsc();
    @Query(value = "SELECT m.* FROM metodos_pago_config m JOIN metodo_pago_monedas mm ON mm.metodo_codigo = m.codigo " +
            "JOIN monedas mo ON mo.codigo = mm.moneda_codigo WHERE m.activo = true AND mo.activa = true AND mm.moneda_codigo = :moneda ORDER BY m.orden, m.nombre", nativeQuery = true)
    List<MetodoPagoConfig> findActivosPorMoneda(@Param("moneda") String moneda);
    @Query(value = "SELECT EXISTS (SELECT 1 FROM metodo_pago_monedas WHERE metodo_codigo = :metodo AND moneda_codigo = :moneda)", nativeQuery = true)
    boolean existeParaMoneda(@Param("metodo") String metodo, @Param("moneda") String moneda);
}
