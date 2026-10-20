package com.tienda.ecommerce.configuracion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface TipoCambioRepository extends JpaRepository<TipoCambio,Long>{
 List<TipoCambio> findAllByOrderByVigenteDesdeDesc();
 java.util.Optional<TipoCambio> findFirstByMonedaOrigenAndMonedaDestinoAndActivoTrueAndVigenteDesdeLessThanEqualOrderByVigenteDesdeDescIdDesc(String origen, String destino, java.time.LocalDateTime ahora);
}
