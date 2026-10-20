// api.js - Cliente HTTP centralizado para consumo de API REST con JWT

const API_BASE = '';

export const api = {
    getToken() {
        return localStorage.getItem('ecommerce_token') || sessionStorage.getItem('ecommerce_token');
    },

    setToken(token, persistir = true) {
        (persistir ? sessionStorage : localStorage).removeItem('ecommerce_token');
        if (persistir) {
            localStorage.setItem('ecommerce_token', token);
        } else {
            sessionStorage.setItem('ecommerce_token', token);
        }
    },

    removeToken() {
        localStorage.removeItem('ecommerce_token');
        sessionStorage.removeItem('ecommerce_token');
    },

    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    },

    async request(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const config = {
            ...options,
            headers: {
                ...this.getHeaders(),
                ...(options.headers || {})
            }
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json().catch(() => null);

            if (!response.ok) {
                const mensaje = (data && data.mensaje) ? data.mensaje : `Error del servidor (${response.status})`;
                const error = new Error(mensaje);
                error.status = response.status;
                error.data = data;
                throw error;
            }

            return data;
        } catch (error) {
            console.error(`[API Error] ${endpoint}:`, error);
            throw error;
        }
    },

    get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },

    post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    },

    put(endpoint, body) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    },

    patch(endpoint, body) {
        return this.request(endpoint, {
            method: 'PATCH',
            body: body ? JSON.stringify(body) : null
        });
    },

    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
};
