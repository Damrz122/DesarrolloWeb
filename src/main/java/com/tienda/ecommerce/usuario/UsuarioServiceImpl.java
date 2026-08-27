package com.tienda.ecommerce.usuario;

import com.tienda.ecommerce.common.RecursoNoEncontradoException;
import com.tienda.ecommerce.usuario.dto.ActualizarUsuarioRequest;
import com.tienda.ecommerce.usuario.dto.UsuarioResponse;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class UsuarioServiceImpl implements UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    public UsuarioServiceImpl(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional(readOnly = true)
    public UsuarioResponse obtenerPorId(Long id) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado con id: " + id));
        return mapearADto(usuario);
    }

    @Override
    @Transactional(readOnly = true)
    public UsuarioResponse obtenerPorEmail(String email) {
        Usuario usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado con email: " + email));
        return mapearADto(usuario);
    }

    @Override
    @Transactional
    public UsuarioResponse actualizar(Long id, ActualizarUsuarioRequest request) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado con id: " + id));

        usuario.setNombre(request.getNombre().trim());
        if (request.getPassword() != null && !request.getPassword().trim().isEmpty()) {
            usuario.setPasswordHash(passwordEncoder.encode(request.getPassword().trim()));
        }

        Usuario guardado = usuarioRepository.save(usuario);
        return mapearADto(guardado);
    }

    @Override
    @Transactional
    public UsuarioResponse cambiarRol(Long id, Rol nuevoRol) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado con id: " + id));

        usuario.setRol(nuevoRol);
        Usuario guardado = usuarioRepository.save(usuario);
        return mapearADto(guardado);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UsuarioResponse> listarTodos() {
        return usuarioRepository.findAll().stream()
                .map(this::mapearADto)
                .toList();
    }

    private UsuarioResponse mapearADto(Usuario u) {
        return new UsuarioResponse(
                u.getId(),
                u.getNombre(),
                u.getEmail(),
                u.getRol(),
                u.isActivo(),
                u.getFechaRegistro()
        );
    }
}
