package com.tienda.ecommerce.auth;

import com.tienda.ecommerce.auth.dto.AuthResponse;
import com.tienda.ecommerce.auth.dto.LoginRequest;
import com.tienda.ecommerce.auth.dto.RegistroRequest;
import com.tienda.ecommerce.carrito.CarritoService;
import com.tienda.ecommerce.common.BadRequestException;
import com.tienda.ecommerce.common.CredencialesInvalidasException;
import com.tienda.ecommerce.usuario.Rol;
import com.tienda.ecommerce.usuario.TipoDocumento;
import com.tienda.ecommerce.usuario.Usuario;
import com.tienda.ecommerce.usuario.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private CarritoService carritoService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;
    @Mock private com.tienda.ecommerce.configuracion.AccesoService acceso;

    @InjectMocks
    private AuthServiceImpl authService;

    private Usuario usuario;

    @BeforeEach
    void setUp() {
        lenient().when(acceso.rolActivo(any())).thenReturn(true);
        lenient().when(acceso.permisos(any())).thenReturn(java.util.Set.of("COMPRAR"));
        usuario = new Usuario(1L, "Carlos Lopez", "carlos@tienda.com", "hashBcrypt", Rol.CLIENTE, true);
    }

    @Test
    @DisplayName("Debe registrar un nuevo usuario y devolver token JWT")
    void registro_exitoso() {
        RegistroRequest request = new RegistroRequest("Carlos", "Lopez", "Perez",
                TipoDocumento.DNI, "12345678", "carlos@tienda.com", "pass12345");

        when(usuarioRepository.existsByEmail("carlos@tienda.com")).thenReturn(false);
        when(usuarioRepository.existsByNumeroDocumento("12345678")).thenReturn(false);
        when(passwordEncoder.encode("pass12345")).thenReturn("hashBcrypt");
        when(usuarioRepository.save(any(Usuario.class))).thenReturn(usuario);
        when(jwtService.generarToken(any(Usuario.class))).thenReturn("fake.jwt.token");

        AuthResponse response = authService.registro(request);

        assertNotNull(response);
        assertEquals("fake.jwt.token", response.getToken());
        assertEquals("carlos@tienda.com", response.getEmail());
        assertEquals(Rol.CLIENTE, response.getRol());

        verify(usuarioRepository, times(1)).save(any(Usuario.class));
        verify(carritoService, times(1)).obtenerOCrearCarritoEntity(1L);
    }

    @Test
    @DisplayName("Debe rechazar el registro si el email ya existe")
    void registro_emailDuplicado() {
        RegistroRequest request = new RegistroRequest("Carlos", "Lopez", "Perez",
                TipoDocumento.DNI, "12345678", "carlos@tienda.com", "pass12345");
        when(usuarioRepository.existsByEmail("carlos@tienda.com")).thenReturn(true);

        assertThrows(BadRequestException.class, () -> authService.registro(request));
        verify(usuarioRepository, never()).save(any(Usuario.class));
    }

    @Test
    @DisplayName("Debe rechazar DNI con formato inválido")
    void registro_dniInvalido() {
        RegistroRequest request = new RegistroRequest("Carlos", "Lopez", null,
                TipoDocumento.DNI, "1234", "carlos@tienda.com", "pass12345");

        assertThrows(BadRequestException.class, () -> authService.registro(request));
        verify(usuarioRepository, never()).save(any(Usuario.class));
    }

    @Test
    @DisplayName("Debe rechazar el registro si el documento ya existe")
    void registro_documentoDuplicado() {
        RegistroRequest request = new RegistroRequest("Carlos", "Lopez", null,
                TipoDocumento.DNI, "12345678", "carlos@tienda.com", "pass12345");
        when(usuarioRepository.existsByEmail("carlos@tienda.com")).thenReturn(false);
        when(usuarioRepository.existsByNumeroDocumento("12345678")).thenReturn(true);

        assertThrows(BadRequestException.class, () -> authService.registro(request));
        verify(usuarioRepository, never()).save(any(Usuario.class));
    }

    @Test
    @DisplayName("Debe aceptar nombre completo legado partiéndolo en partes")
    void registro_nombreLegado() {
        RegistroRequest request = new RegistroRequest("Carlos Lopez", "carlos@tienda.com", "pass12345");
        request.setTipoDocumento(TipoDocumento.DNI);
        request.setNumeroDocumento("12345678");

        when(usuarioRepository.existsByEmail("carlos@tienda.com")).thenReturn(false);
        when(usuarioRepository.existsByNumeroDocumento("12345678")).thenReturn(false);
        when(passwordEncoder.encode("pass12345")).thenReturn("hashBcrypt");
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtService.generarToken(any(Usuario.class))).thenReturn("fake.jwt.token");

        authService.registro(request);

        verify(usuarioRepository).save(argThat(u ->
                "Carlos".equals(u.getNombres()) && "Lopez".equals(u.getApellidoPaterno())));
    }

    @Test
    @DisplayName("Debe iniciar sesión exitosamente con credenciales válidas")
    void login_exitoso() {
        LoginRequest request = new LoginRequest("carlos@tienda.com", "pass12345");

        when(usuarioRepository.findByEmail("carlos@tienda.com")).thenReturn(Optional.of(usuario));
        when(passwordEncoder.matches("pass12345", "hashBcrypt")).thenReturn(true);
        when(jwtService.generarToken(usuario)).thenReturn("fake.jwt.token");

        AuthResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals("fake.jwt.token", response.getToken());
        assertEquals(1L, response.getId());
    }

    @Test
    @DisplayName("Debe lanzar CredencialesInvalidasException con contraseña errónea")
    void login_passwordIncorrecto() {
        LoginRequest request = new LoginRequest("carlos@tienda.com", "passwordIncorrecta");

        when(usuarioRepository.findByEmail("carlos@tienda.com")).thenReturn(Optional.of(usuario));
        when(passwordEncoder.matches("passwordIncorrecta", "hashBcrypt")).thenReturn(false);

        assertThrows(CredencialesInvalidasException.class, () -> authService.login(request));
        verify(jwtService, never()).generarToken(any(Usuario.class));
    }
}
