// Backend API base URL
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Core request wrapper supporting JSON bodies, credentials, and custom options
async function request(endpoint, options = {}) {
    const url = endpoint.startsWith('http://') || endpoint.startsWith('https://')
        ? endpoint
        : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    // If body is already FormData, delete Content-Type so browser sets boundary
    if (options.body instanceof FormData) {
        delete headers['Content-Type'];
    }

    const config = {
        credentials: 'include', // Ensures session cookie is sent with every request
        headers,
        ...options
    };

    const response = await fetch(url, config);

    // Parse response body if JSON or text
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        data = await response.json();
    } else {
        data = await response.text();
    }

    if (!response.ok) {
        const error = new Error((data && data.message) || response.statusText || 'Request failed');
        error.status = response.status;
        error.data = data;
        throw error;
    }

    return data;
}

// Reusable HTTP helper methods
export const api = {
    get(endpoint, options = {}) {
        return request(endpoint, {
            method: 'GET',
            ...options
        });
    },

    post(endpoint, body, options = {}) {
        return request(endpoint, {
            method: 'POST',
            body: body instanceof FormData ? body : JSON.stringify(body),
            ...options
        });
    },

    put(endpoint, body, options = {}) {
        return request(endpoint, {
            method: 'PUT',
            body: body instanceof FormData ? body : JSON.stringify(body),
            ...options
        });
    },

    delete(endpoint, body, options = {}) {
        return request(endpoint, {
            method: 'DELETE',
            body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
            ...options
        });
    }
};

export default api;
