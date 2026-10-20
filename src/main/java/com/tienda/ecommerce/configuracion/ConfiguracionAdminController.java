package com.tienda.ecommerce.configuracion;

import com.tienda.ecommerce.common.ApiResponse;
import com.tienda.ecommerce.common.BadRequestException;
import com.tienda.ecommerce.pago.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.text.Normalizer;

@RestController
@RequestMapping("/api/admin/configuracion")
@PreAuthorize("hasAuthority('CONFIGURACION_GESTIONAR')")
public class ConfiguracionAdminController {
    private final MonedaRepository monedas;
    private final MetodoPagoConfigRepository metodos;
    private final TipoCambioRepository tasas;
    private final RolConfigRepository roles;
    private final FormularioPagoService formularios;
    public ConfiguracionAdminController(MonedaRepository monedas, MetodoPagoConfigRepository metodos,
            TipoCambioRepository tasas, RolConfigRepository roles, FormularioPagoService formularios) {
        this.monedas = monedas; this.metodos = metodos; this.tasas = tasas; this.roles = roles; this.formularios = formularios;
    }
    @GetMapping("/monedas") public ApiResponse<List<Moneda>> monedas() { return ApiResponse.exito("Monedas", monedas.findAll()); }
    @PostMapping("/monedas") public ApiResponse<Moneda> crearMoneda(@RequestBody Moneda m) {
        m.setCodigo(codigo(m.getCodigo()));
        if (monedas.existsById(m.getCodigo())) throw new BadRequestException("La moneda ya existe");
        validarMoneda(m);
        return ApiResponse.exito("Moneda creada", monedas.save(m));
    }
    @PutMapping("/monedas/{codigo}") public ApiResponse<Moneda> editarMoneda(@PathVariable String codigo, @RequestBody Moneda m) {
        m.setCodigo(codigo(codigo));
        if (!monedas.existsById(m.getCodigo())) throw new BadRequestException("La moneda no existe");
        if (m.getCodigo().equals("PEN") && !m.isActiva()) throw new BadRequestException("PEN es la moneda contable base y debe permanecer activa");
        validarMoneda(m);
        return ApiResponse.exito("Moneda actualizada", monedas.save(m));
    }
    @GetMapping("/tipos-cambio") public ApiResponse<List<TipoCambio>> tasas() { return ApiResponse.exito("Cotizaciones", tasas.findAllByOrderByVigenteDesdeDesc()); }
    public record NuevaTasa(String monedaOrigen, String monedaDestino, BigDecimal tasa, LocalDateTime vigenteDesde) {}
    @PostMapping("/tipos-cambio") public ApiResponse<TipoCambio> nuevaTasa(@RequestBody NuevaTasa r) {
        String origen = codigo(r.monedaOrigen()), destino = codigo(r.monedaDestino());
        if (origen.equals(destino) || !monedas.existsById(origen) || !monedas.existsById(destino)
                || r.tasa() == null || r.tasa().signum() <= 0 || r.tasa().scale() > 8 || r.tasa().precision() - r.tasa().scale() > 11)
            throw new BadRequestException("Indica monedas distintas y una tasa positiva de hasta 8 decimales");
        TipoCambio t = new TipoCambio(); t.setMonedaOrigen(origen); t.setMonedaDestino(destino); t.setTasa(r.tasa());
        t.setVigenteDesde(r.vigenteDesde() == null ? LocalDateTime.now() : r.vigenteDesde());
        return ApiResponse.exito("Cotización registrada sin alterar el historial", tasas.save(t));
    }
    @PatchMapping("/tipos-cambio/{id}") public ApiResponse<TipoCambio> estadoTasa(@PathVariable Long id, @RequestBody Map<String,Boolean> r) {
        TipoCambio t = tasas.findById(id).orElseThrow(() -> new BadRequestException("Cotización no encontrada"));
        t.setActivo(Boolean.TRUE.equals(r.get("activo"))); return ApiResponse.exito("Estado actualizado", tasas.save(t));
    }
    @GetMapping("/metodos-pago") public ApiResponse<List<MetodoPagoConfig>> metodos() { return ApiResponse.exito("Métodos", metodos.findAll()); }
    @PostMapping("/metodos-pago") public ApiResponse<MetodoPagoConfig> crearMetodo(@RequestBody MetodoPagoConfig m) {
        m.setCodigo(codigo(m.getCodigo()));
        if (metodos.existsById(m.getCodigo())) throw new BadRequestException("El método ya existe");
        formularioNormalizado(m);
        validarMetodo(m); return ApiResponse.exito("Método creado", metodos.save(m));
    }
    @Transactional
    @PutMapping("/metodos-pago/{codigo}") public ApiResponse<MetodoPagoConfig> editarMetodo(@PathVariable String codigo, @RequestBody MetodoPagoConfig m) {
        MetodoPagoConfig a = metodos.findById(codigo(codigo)).orElseThrow(() -> new BadRequestException("Método no encontrado"));
        m.setCodigo(a.getCodigo()); formularioNormalizado(m); validarMetodo(m);
        a.setNombre(m.getNombre()); a.setDescripcion(m.getDescripcion()); a.setInstrucciones(m.getInstrucciones());
        a.setActivo(m.isActivo()); a.setOrden(m.getOrden()); a.setProcesamiento(m.getProcesamiento());
        a.setRequiereReferencia(m.isRequiereReferencia()); a.setEtiquetaReferencia(m.getEtiquetaReferencia());
        a.setPrefijoTransaccion(m.getPrefijoTransaccion()); a.setIcono(m.getIcono()); a.setFormularioJson(m.getFormularioJson());
        a.getMonedas().clear(); a.getMonedas().addAll(m.getMonedas());
        return ApiResponse.exito("Método actualizado; pagos anteriores conservan sus datos", metodos.save(a));
    }
    @GetMapping("/roles") public ApiResponse<List<RolConfig>> roles() { return ApiResponse.exito("Roles", roles.findAll()); }
    @GetMapping("/permisos") public ApiResponse<Set<String>> permisos() { return ApiResponse.exito("Permisos disponibles", AccesoService.PERMISOS); }
    @PostMapping("/roles") @Transactional public ApiResponse<RolConfig> crearRol(@RequestBody RolConfig r) {
        // Los roles del sistema conservan ADMIN y CLIENTE. Los personalizados
        // reciben un código legible y consecutivo basado en su nombre.
        r.setCodigo(siguienteCodigoRol(r.getNombre())); r.setSistema(false);
        validarRol(r); return ApiResponse.exito("Rol creado", roles.save(r));
    }
    @Transactional
    @PutMapping("/roles/{codigo}") public ApiResponse<RolConfig> editarRol(@PathVariable String codigo, @RequestBody RolConfig r) {
        RolConfig a = roles.findById(codigo(codigo)).orElseThrow(() -> new BadRequestException("Rol no encontrado"));
        if (a.isSistema()) throw new BadRequestException("Los roles del sistema están protegidos; crea otro rol para personalizar permisos");
        validarRol(r); a.setNombre(r.getNombre()); a.setDescripcion(r.getDescripcion()); a.setActivo(r.isActivo());
        a.getPermisos().clear(); a.getPermisos().addAll(r.getPermisos());
        return ApiResponse.exito("Rol actualizado; permisos aplicados en la siguiente petición", roles.save(a));
    }
    private String codigo(String c) { return c == null ? "" : c.trim().toUpperCase(Locale.ROOT); }
    private synchronized String siguienteCodigoRol(String nombre) {
        texto(nombre, 80, "nombre del rol");
        String letras = Normalizer.normalize(nombre, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").replaceAll("[^A-Za-z]", "").toUpperCase(Locale.ROOT);
        if (letras.isBlank()) throw new BadRequestException("Indica un nombre de rol válido");
        String prefijo = (letras + "XXX").substring(0, 3);
        int siguiente = roles.findAll().stream()
                .map(RolConfig::getCodigo)
                .filter(c -> c != null && c.matches(prefijo + "\\d+"))
                .map(c -> Integer.parseInt(c.substring(prefijo.length())))
                .max(Integer::compareTo).orElse(0) + 1;
        return prefijo + String.format(Locale.ROOT, "%03d", siguiente);
    }
    private void formularioNormalizado(MetodoPagoConfig m) {
        if (m.getFormularioJson() == null || m.getFormularioJson().isBlank()) m.setFormularioJson("[]");
    }
    private void validarRol(RolConfig r) {
        texto(r.getNombre(),80,"nombre del rol");
        if (r.getPermisos() == null || !AccesoService.PERMISOS.containsAll(r.getPermisos())) throw new BadRequestException("Permisos no reconocidos");
        if (r.getDescripcion() != null && r.getDescripcion().length() > 255) throw new BadRequestException("Descripción demasiado larga");
    }
    private void validarMoneda(Moneda m) {
        try {
            Currency iso = Currency.getInstance(m.getCodigo());
            if (iso.getDefaultFractionDigits() < 0 || iso.getDefaultFractionDigits() > 4 || m.getDecimales() != iso.getDefaultFractionDigits())
                throw new IllegalArgumentException();
        } catch (Exception e) { throw new BadRequestException("Usa una moneda ISO válida y sus decimales oficiales (p. ej. USD 2, JPY 0)"); }
        texto(m.getNombre(),80,"nombre"); texto(m.getSimbolo(),12,"símbolo"); texto(m.getLocale(),20,"locale");
        if (Locale.forLanguageTag(m.getLocale()).getLanguage().isEmpty()) throw new BadRequestException("Locale inválido");
    }
    private void validarMetodo(MetodoPagoConfig m) {
        if (!m.getCodigo().matches("[A-Z][A-Z0-9_]{1,49}")) throw new BadRequestException("Código inválido");
        texto(m.getNombre(),100,"nombre");
        if (m.getProcesamiento() == null || !Set.of("SIMULADO","VERIFICACION_MANUAL","CONTRA_ENTREGA").contains(m.getProcesamiento())) throw new BadRequestException("Procesamiento inválido");
        if (m.getMonedas() == null || m.getMonedas().isEmpty() || m.getMonedas().stream().anyMatch(c -> !monedas.existsById(c))) throw new BadRequestException("Asocia al menos una moneda registrada");
        if (m.getDescripcion() != null && m.getDescripcion().length() > 255 || m.getInstrucciones() != null && m.getInstrucciones().length() > 5000) throw new BadRequestException("Texto demasiado largo");
        if (m.getIcono() == null || !Set.of("PAGO","TARJETA","TRANSFERENCIA","ENTREGA","YAPE","PLIN").contains(m.getIcono())) m.setIcono("PAGO");
        if (m.getPrefijoTransaccion() == null || !m.getPrefijoTransaccion().matches("[A-Z0-9_-]{1,20}")) m.setPrefijoTransaccion("TX-");
        if (m.getEtiquetaReferencia() != null && m.getEtiquetaReferencia().length() > 100) throw new BadRequestException("Etiqueta de referencia demasiado larga");
        formularios.campos(m);
    }
    private void texto(String v, int max, String campo) { if (v == null || v.isBlank() || v.length() > max) throw new BadRequestException("Revisa " + campo); }
}
