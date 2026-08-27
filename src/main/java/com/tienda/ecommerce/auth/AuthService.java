package com.tienda.ecommerce.auth;

import com.tienda.ecommerce.auth.dto.AuthResponse;
import com.tienda.ecommerce.auth.dto.LoginRequest;
import com.tienda.ecommerce.auth.dto.RegistroRequest;

public interface AuthService {
    AuthResponse registro(RegistroRequest request);
    AuthResponse login(LoginRequest request);
}
