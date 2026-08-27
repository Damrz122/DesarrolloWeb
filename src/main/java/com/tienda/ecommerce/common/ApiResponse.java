package com.tienda.ecommerce.common;

import java.time.LocalDateTime;

public class ApiResponse<T> {

    private boolean exito;
    private String mensaje;
    private T datos;
    private LocalDateTime timestamp;

    public ApiResponse() {
        this.timestamp = LocalDateTime.now();
    }

    public ApiResponse(boolean exito, String mensaje, T datos) {
        this.exito = exito;
        this.mensaje = mensaje;
        this.datos = datos;
        this.timestamp = LocalDateTime.now();
    }

    public static <T> ApiResponse<T> exito(T datos) {
        return new ApiResponse<>(true, "Operación exitosa", datos);
    }

    public static <T> ApiResponse<T> exito(String mensaje, T datos) {
        return new ApiResponse<>(true, mensaje, datos);
    }

    public static <T> ApiResponse<T> error(String mensaje) {
        return new ApiResponse<>(false, mensaje, null);
    }

    public static <T> ApiResponse<T> error(String mensaje, T datos) {
        return new ApiResponse<>(false, mensaje, datos);
    }

    public boolean isExito() {
        return exito;
    }

    public void setExito(boolean exito) {
        this.exito = exito;
    }

    public String getMensaje() {
        return mensaje;
    }

    public void setMensaje(String mensaje) {
        this.mensaje = mensaje;
    }

    public T getDatos() {
        return datos;
    }

    public void setDatos(T datos) {
        this.datos = datos;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
}
