package com.tienda.ecommerce.usuario;

import com.tienda.ecommerce.usuario.dto.ActualizarUsuarioRequest;
import com.tienda.ecommerce.usuario.dto.CrearUsuarioRequest;
import com.tienda.ecommerce.usuario.dto.EditarUsuarioRequest;
import com.tienda.ecommerce.usuario.dto.UsuarioResponse;

import java.util.List;

public interface UsuarioService {
    UsuarioResponse obtenerPorId(Long id);
    UsuarioResponse obtenerPorEmail(String email);
    UsuarioResponse crear(CrearUsuarioRequest request);
    UsuarioResponse actualizar(Long id, ActualizarUsuarioRequest request);
    UsuarioResponse editar(Long id, EditarUsuarioRequest request);
    UsuarioResponse cambiarRol(Long id, Rol nuevoRol);
    UsuarioResponse cambiarEstado(Long id, boolean activo);
    void eliminar(Long id);
    List<UsuarioResponse> listarTodos();
}
