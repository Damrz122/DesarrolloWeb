package com.tienda.ecommerce.producto;

import com.tienda.ecommerce.producto.dto.CategoriaRequest;
import com.tienda.ecommerce.producto.dto.CategoriaResponse;
import java.util.List;

public interface CategoriaService {
    List<CategoriaResponse> listarTodas();
    CategoriaResponse obtenerPorId(Long id);
    CategoriaResponse crear(CategoriaRequest request);
    CategoriaResponse actualizar(Long id, CategoriaRequest request);
    void eliminar(Long id);
}
