package com.tienda.ecommerce.config;

import com.tienda.ecommerce.auth.JwtAuthFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    @Value("${app.cors.allowed-origins:http://localhost:8080,http://localhost:3000}")
    private String[] allowedOrigins;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Recursos estáticos del frontend
                        .requestMatchers(
                                "/",
                                "/index.html",
                                "/producto.html",
                                "/carrito.html",
                                "/checkout.html",
                                "/mis-pedidos.html",
                                "/login.html",
                                "/registro.html",
                                "/uploads/**",
                                "/admin/**",
                                "/assets/**",
                                "/static/**",
                                "/favicon.ico",
                                "/*.css",
                                "/*.js",
                                "/*.html"
                        ).permitAll()

                        // Endpoints públicos de autenticación
                        .requestMatchers("/api/auth/**").permitAll()

                        // Endpoints públicos de catálogo
                        .requestMatchers(HttpMethod.GET, "/api/categorias/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/pagos/metodos").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/monedas").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/sitio/publico").permitAll()
                        .requestMatchers(HttpMethod.GET, "/uploads/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/productos/admin").hasAnyAuthority("PRODUCTOS_VER", "PRODUCTOS_GESTIONAR", "INVENTARIO_GESTIONAR")
                        .requestMatchers(HttpMethod.GET, "/api/productos/**").permitAll()

                        // Handshake de WebSocket
                        .requestMatchers("/ws-chat/**").permitAll()

                        // Endpoints administrativos
                        .requestMatchers("/api/admin/**").hasAuthority("CONFIGURACION_GESTIONAR")
                        .requestMatchers("/api/reportes/**").hasAuthority("REPORTES_VER")

                        // Cualquier otra petición requiere autenticación
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // CORS restringido: solo origenes configurados
        configuration.setAllowedOriginPatterns(List.of(allowedOrigins));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
