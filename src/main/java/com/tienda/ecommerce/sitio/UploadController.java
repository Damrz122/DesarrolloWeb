package com.tienda.ecommerce.sitio;

import com.tienda.ecommerce.common.ApiResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

// Upload de imágenes de apariencia (fondos y productos PNG).
// Guarda en disco y devuelve URL pública /uploads/xxx.
@RestController
@RequestMapping("/api/sitio")
public class UploadController {

    private static final Set<String> TIPOS = Set.of("image/png", "image/jpeg", "image/webp");
    private static final long MAX_BYTES = 5 * 1024 * 1024;

    private final Path directorio;

    public UploadController(@Value("${app.upload-dir:uploads}") String dir) throws IOException {
        this.directorio = Paths.get(dir).toAbsolutePath().normalize();
        Files.createDirectories(this.directorio);
    }

    @PostMapping(value = "/uploads", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, String>>> subir(
            @RequestParam("archivo") MultipartFile archivo
    ) throws IOException {
        if (archivo == null || archivo.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Archivo vacío"));
        }
        if (archivo.getSize() > MAX_BYTES) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("El archivo supera los 5MB"));
        }
        String tipo = archivo.getContentType();
        if (tipo == null || !TIPOS.contains(tipo.toLowerCase())) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Solo se permiten PNG, JPG o WEBP"));
        }
        String ext = switch (tipo.toLowerCase()) {
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> ".jpg";
        };
        String nombre = UUID.randomUUID() + ext;
        Path destino = directorio.resolve(nombre).normalize();
        if (!destino.startsWith(directorio)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Nombre inválido"));
        }
        try (var in = archivo.getInputStream()) {
            Files.copy(in, destino, StandardCopyOption.REPLACE_EXISTING);
        }
        return ResponseEntity.ok(ApiResponse.exito("Archivo subido", Map.of("url", "/uploads/" + nombre)));
    }
}
