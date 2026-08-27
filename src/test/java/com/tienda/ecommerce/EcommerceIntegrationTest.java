package com.tienda.ecommerce;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tienda.ecommerce.auth.dto.LoginRequest;
import com.tienda.ecommerce.auth.dto.RegistroRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class EcommerceIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("Flujo de Integración: Registro -> Login -> Consultar Catálogo")
    void flujoCompletoRegistroLoginYCatalogo() throws Exception {
        // 1. Registro de nuevo usuario
        RegistroRequest registroReq = new RegistroRequest(
                "Estudiante Test",
                "estudiante@tienda.com",
                "passwordSegura123"
        );

        MvcResult resultRegistro = mockMvc.perform(post("/api/auth/registro")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registroReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.exito").value(true))
                .andExpect(jsonPath("$.datos.token").isNotEmpty())
                .andExpect(jsonPath("$.datos.email").value("estudiante@tienda.com"))
                .andReturn();

        // 2. Login con credenciales creadas
        LoginRequest loginReq = new LoginRequest("estudiante@tienda.com", "passwordSegura123");

        MvcResult resultLogin = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.exito").value(true))
                .andExpect(jsonPath("$.datos.token").isNotEmpty())
                .andReturn();

        String responseJson = resultLogin.getResponse().getContentAsString();
        JsonNode root = objectMapper.readTree(responseJson);
        String jwtToken = root.path("datos").path("token").asText();

        // 3. Consultar catálogo público de productos
        mockMvc.perform(get("/api/productos")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.exito").value(true))
                .andExpect(jsonPath("$.datos.contenido").isArray());

        // 4. Consultar perfil con token JWT
        mockMvc.perform(get("/api/usuarios/me")
                        .header("Authorization", "Bearer " + jwtToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.exito").value(true))
                .andExpect(jsonPath("$.datos.email").value("estudiante@tienda.com"));
    }

    @Test
    @DisplayName("Seguridad: Intento de acceso a endpoint de admin sin token debe ser denegado")
    void accesoAdminSinToken_debeSerDenegado() throws Exception {
        mockMvc.perform(get("/api/reportes/ventas"))
                .andExpect(status().isForbidden());
    }
}
