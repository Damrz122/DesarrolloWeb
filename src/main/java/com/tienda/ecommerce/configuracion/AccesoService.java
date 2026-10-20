package com.tienda.ecommerce.configuracion;

import com.tienda.ecommerce.common.BadRequestException;
import com.tienda.ecommerce.usuario.Usuario;
import org.springframework.stereotype.Service;
import java.util.Set;

@Service
public class AccesoService {
    public static final Set<String> PERMISOS = Set.of("ADMIN_ACCESO", "PRODUCTOS_VER", "PRODUCTOS_GESTIONAR",
            "PRECIOS_GESTIONAR", "INVENTARIO_GESTIONAR", "CATEGORIAS_GESTIONAR", "PEDIDOS_GESTIONAR",
            "PAGOS_VERIFICAR", "USUARIOS_GESTIONAR", "REPORTES_VER", "CHAT_ATENDER", "APARIENCIA_GESTIONAR",
            "CONFIGURACION_GESTIONAR", "COMPRAR");
    private final RolConfigRepository roles;
    public AccesoService(RolConfigRepository roles) { this.roles = roles; }
    public Set<String> permisos(Usuario usuario) {
        if (!usuario.isActivo() || usuario.getRol() == null) return Set.of();
        return roles.findById(usuario.getRol().name()).filter(RolConfig::isActivo)
                .map(r -> Set.copyOf(r.getPermisos())).orElse(Set.of());
    }
    public boolean tiene(Usuario usuario, String permiso) { return permisos(usuario).contains(permiso); }
    public boolean rolActivo(Usuario usuario) {
        return usuario.getRol() != null && roles.findById(usuario.getRol().name()).filter(RolConfig::isActivo).isPresent();
    }
    public void validarRol(String codigo) {
        if (codigo == null || roles.findById(codigo).filter(RolConfig::isActivo).isEmpty())
            throw new BadRequestException("El rol no existe o está desactivado");
    }
}
