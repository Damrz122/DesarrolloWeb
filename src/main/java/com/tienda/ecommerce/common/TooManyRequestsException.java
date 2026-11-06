package com.tienda.ecommerce.common;

public class TooManyRequestsException extends RuntimeException {
    public TooManyRequestsException(String mensaje) {
        super(mensaje);
    }
}
