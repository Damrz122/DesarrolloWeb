package com.tienda.ecommerce.pago;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tienda.ecommerce.common.BadRequestException;
import org.springframework.stereotype.Service;
import java.util.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@Service
public class FormularioPagoService {
    public record Campo(String clave, String etiqueta, String tipo, boolean obligatorio, Integer maxLongitud, List<String> opciones) {}
    private final ObjectMapper json;
    public FormularioPagoService(ObjectMapper json) { this.json = json; }
    public List<Campo> campos(MetodoPagoConfig metodo) {
        try {
            String contenido = metodo.getFormularioJson() == null ? "[]" : metodo.getFormularioJson();
            if (contenido.length() > 16000) throw new IllegalArgumentException();
            List<Campo> campos = json.readValue(contenido, new TypeReference<List<Campo>>() {});
            if (campos == null || campos.size() > 12) throw new IllegalArgumentException();
            Set<String> claves = new HashSet<>();
            for (Campo c : campos) {
                if (c == null || c.clave() == null || !c.clave().matches("[a-z][a-zA-Z0-9_]{0,39}")
                        || !claves.add(c.clave()) || c.etiqueta() == null || c.etiqueta().isBlank() || c.etiqueta().length() > 100
                        || !Set.of("text","tel","select","date","textarea").contains(c.tipo())
                        || c.maxLongitud() != null && (c.maxLongitud() < 1 || c.maxLongitud() > 1000)
                        || c.opciones() != null && (c.opciones().size() > 30 || c.opciones().stream().anyMatch(o -> o == null || o.length() > 100))
                        || c.tipo().equals("select") && (c.opciones() == null || c.opciones().isEmpty())) throw new IllegalArgumentException();
            }
            return List.copyOf(campos);
        } catch (Exception e) { throw new BadRequestException("Formulario inválido en el método " + metodo.getCodigo()); }
    }
    public String version(MetodoPagoConfig m) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(
                    (m.getFormularioJson() + ":" + m.isRequiereReferencia() + ":" + m.getProcesamiento()).getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) { throw new IllegalStateException(e); }
    }
    public String validar(MetodoPagoConfig m, Map<String,String> datos) {
        Map<String,String> entrada = datos == null ? Map.of() : datos;
        if (entrada.size() > 12 || entrada.entrySet().stream().anyMatch(e -> e.getKey() == null || e.getValue() == null))
            throw new BadRequestException("Datos de pago inválidos");
        List<Campo> campos = campos(m);
        Set<String> permitidos = new HashSet<>();
        for (Campo c : campos) {
            permitidos.add(c.clave());
            String valor = entrada.getOrDefault(c.clave(), "").trim();
            if (c.obligatorio() && valor.isEmpty()) throw new BadRequestException("Completa " + c.etiqueta());
            if (valor.length() > (c.maxLongitud() == null ? 100 : c.maxLongitud())) throw new BadRequestException("Valor demasiado largo: " + c.etiqueta());
            if (!valor.isEmpty() && c.tipo().equals("select") && !c.opciones().contains(valor)) throw new BadRequestException("Opción inválida: " + c.etiqueta());
            if (!valor.isEmpty() && c.tipo().equals("tel") && !valor.matches("[+0-9 ()-]{6,25}")) throw new BadRequestException("Teléfono inválido: " + c.etiqueta());
            if (!valor.isEmpty() && c.tipo().equals("date")) {
                try { java.time.LocalDate.parse(valor); } catch (Exception e) { throw new BadRequestException("Fecha inválida: " + c.etiqueta()); }
            }
        }
        if (!permitidos.containsAll(entrada.keySet())) throw new BadRequestException("El formulario contiene campos no admitidos");
        try { return json.writeValueAsString(entrada); } catch (Exception e) { throw new BadRequestException("Datos de pago inválidos"); }
    }
}
