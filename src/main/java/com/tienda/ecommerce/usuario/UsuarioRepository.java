package com.tienda.ecommerce.usuario;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    Optional<Usuario> findByEmail(String email);
    boolean existsByEmail(String email);
    boolean existsByNumeroDocumento(String numeroDocumento);
    List<Usuario> findByRol(Rol rol);
}
