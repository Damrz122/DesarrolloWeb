package com.tienda.ecommerce.auth;

import com.tienda.ecommerce.usuario.UsuarioRepository;
import com.tienda.ecommerce.configuracion.AccesoService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UsuarioRepository usuarios;
    private final AccesoService acceso;

    public JwtAuthFilter(JwtService jwtService, UsuarioRepository usuarios, AccesoService acceso) {
        this.jwtService = jwtService;
        this.usuarios = usuarios;
        this.acceso = acceso;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        final String jwt = authHeader.substring(7);

        if (jwtService.esTokenValido(jwt)) {
            Long id = jwtService.extraerId(jwt);
            var usuario = id == null ? null : usuarios.findById(id).orElse(null);
            if (usuario != null && usuario.isActivo() && acceso.rolActivo(usuario)
                    && SecurityContextHolder.getContext().getAuthentication() == null) {
                var authorities = new java.util.ArrayList<SimpleGrantedAuthority>();
                acceso.permisos(usuario).forEach(p -> authorities.add(new SimpleGrantedAuthority(p)));
                authorities.add(new SimpleGrantedAuthority("ROLE_" + usuario.getRol().name()));

                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        usuario.getEmail(),
                        null,
                        authorities
                );
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }

        filterChain.doFilter(request, response);
    }
}
