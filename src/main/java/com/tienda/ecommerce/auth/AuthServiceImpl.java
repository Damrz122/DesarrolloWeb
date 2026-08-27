package com.tienda.ecommerce.auth;

import com.tienda.ecommerce.auth.dto.AuthResponse;
import com.tienda.ecommerce.auth.dto.LoginRequest;
import com.tienda.ecommerce.auth.dto.RegistroRequest;
import com.tienda.ecommerce.carrito.CarritoService;
import com.tienda.ecommerce.common.BadRequestException;
import com.tienda.ecommerce.common.CredencialesInvalidasException;
import com.tienda.ecommerce.usuario.Rol;
import com.tienda.ecommerce.usuario.Usuario;
import com.tienda.ecommerce.usuario.UsuarioRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthServiceImpl implements AuthService {

    private final UsuarioRepository usuarioRepository;
    private final CarritoService carritoService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthServiceImpl(
            UsuarioRepository usuarioRepository,
            CarritoService carritoService,
            PasswordEncoder passwordEncoder,
            JwtService jwtService
    ) {
        this.usuarioRepository = usuarioRepository;
        this.carritoService = carritoService;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Override
    @Transactional
    public AuthResponse registro(RegistroRequest request) {
        String email = request.getEmail().trim().toLowerCase();

        if (usuarioRepository.existsByEmail(email)) {
            throw new BadRequestException("Ya existe una cuenta registrada con el email: " + email);
        }

        Usuario usuario = new Usuario();
        usuario.setNombre(request.getNombre().trim());
        usuario.setEmail(email);
        usuario.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        usuario.setRol(Rol.CLIENTE);
        usuario.setActivo(true);

        Usuario guardado = usuarioRepository.save(usuario);

        // Inicializar carrito para el nuevo usuario
        carritoService.obtenerOCrearCarritoEntity(guardado.getId());

        String token = jwtService.generarToken(guardado);
        return new AuthResponse(token, guardado.getId(), guardado.getNombre(), guardado.getEmail(), guardado.getRol());
    }

    @Override
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String email = request.getEmail().trim().toLowerCase();

        Usuario usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new CredencialesInvalidasException("Credenciales incorrectas: email o contraseña no válidos"));

        if (!usuario.isActivo()) {
            throw new BadRequestException("Tu cuenta se encuentra inactiva. Contacta al administrador.");
        }

        if (!passwordEncoder.matches(request.getPassword(), usuario.getPasswordHash())) {
            throw new CredencialesInvalidasException("Credenciales incorrectas: email o contraseña no válidos");
        }

        String token = jwtService.generarToken(usuario);
        return new AuthResponse(token, usuario.getId(), usuario.getNombre(), usuario.getEmail(), usuario.getRol());
    }
}
