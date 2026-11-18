package com.tienda.ecommerce.crm;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tienda.ecommerce.crm.dto.CrearClienteNotaRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CrmSecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void reglasPublicasNoExponenDatosDeClientes() throws Exception {
        mockMvc.perform(get("/api/crm/puntos/reglas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.datos.minimoPuntosCanje").isNumber())
                .andExpect(jsonPath("$.datos.factorSolPorPunto").isNumber())
                .andExpect(jsonPath("$.datos.usuarioEmail").doesNotExist())
                .andExpect(jsonPath("$.datos.transacciones").doesNotExist());
    }

    @Test
    void resumenDeCheckoutNoEsPublico() throws Exception {
        mockMvc.perform(post("/api/checkout/beneficios").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cotizacionToken\":\"x\",\"puntosACanjear\":0}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "sinpermiso@example.test", authorities = {"CRM_VER_PUNTOS"})
    void resumenDeCheckoutExigeComprar() throws Exception {
        mockMvc.perform(post("/api/checkout/beneficios").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cotizacionToken\":\"x\",\"puntosACanjear\":0}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("SEC-CRM-403: Solicitud anónima a CRM clientes debe ser rechazada con 403 Forbidden")
    void clientes_anonimo_rechazado() throws Exception {
        mockMvc.perform(get("/api/admin/crm/clientes"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("SEC-CRM-403: Solicitud con rol CLIENTE sin CRM_GESTIONAR debe retornar 403 Forbidden")
    @WithMockUser(username = "cliente@tienda.com", authorities = {"CLIENTE"})
    void clientes_clienteComun_prohibido() throws Exception {
        mockMvc.perform(get("/api/admin/crm/clientes"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("SEC-CRM-200: Administrador con autoridad CRM_GESTIONAR puede acceder a la lista CRM")
    @WithMockUser(username = "admin@tienda.com", authorities = {"CRM_GESTIONAR"})
    void clientes_adminConPermiso_accesoPermitido() throws Exception {
        mockMvc.perform(get("/api/admin/crm/clientes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.exito").value(true));
    }

    @Test
    @DisplayName("SEC-CRM-400: Registrar nota con texto en blanco debe fallar validación HTTP 400")
    @WithMockUser(username = "admin@tienda.com", authorities = {"CRM_GESTIONAR"})
    void agregarNota_textoEnBlanco_retorna400BadRequest() throws Exception {
        CrearClienteNotaRequest req = new CrearClienteNotaRequest("    ");
        mockMvc.perform(post("/api/admin/crm/clientes/1/notas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("SEC-CRM-400: Registrar nota que excede 2000 caracteres debe fallar validación HTTP 400")
    @WithMockUser(username = "admin@tienda.com", authorities = {"CRM_GESTIONAR"})
    void agregarNota_textoExcesivo_retorna400BadRequest() throws Exception {
        CrearClienteNotaRequest req = new CrearClienteNotaRequest("A".repeat(2005));
        mockMvc.perform(post("/api/admin/crm/clientes/1/notas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("SEC-CRM-403: Registrar nota sin autenticación debe retornar 403 Forbidden")
    void agregarNota_sinAutenticacion_rechazado() throws Exception {
        CrearClienteNotaRequest req = new CrearClienteNotaRequest("Nota válida");
        mockMvc.perform(post("/api/admin/crm/clientes/1/notas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }
}
