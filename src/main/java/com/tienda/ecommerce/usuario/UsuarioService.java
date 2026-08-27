package com.tienda.ecommerce.usuario;

import com.tienda.ecommerce.usuario.dto.ActualizarUsuarioRequest;
import com.tienda.ecommerce.usuario.dto.UsuarioResponse;

import java.util.List;

public interface UsuarioService {
    UsuarioResponse obtenerPorId(Long id);
    UsuarioResponse obtenerPorEmail(String email);
    UsuarioResponse actualizar(Long id, ActualizarUsuarioRequest request);
    UsuarioResponse cambiarRol(Long id, Rol nuevoRol);
    List<UsuarioResponse> listarTodos();
}
