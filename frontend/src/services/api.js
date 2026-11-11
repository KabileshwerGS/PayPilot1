const BASE_URL = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

class ApiService {
  getToken() {
    return localStorage.getItem('paypilot_token');
  }

  setToken(token) {
    if (token) {
      localStorage.setItem('paypilot_token', token);
    } else {
      localStorage.removeItem('paypilot_token');
    }
  }

  async request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);

      if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
        this.setToken(null);
        window.dispatchEvent(new CustomEvent('auth:expired'));
        throw new Error('Session expired. Please log in again.');
      }

      // Handle non-JSON or blob response
      if (options.responseType === 'blob') {
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        return await response.blob();
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMsg = data?.detail || data?.message || `Request failed with status ${response.status}`;
        throw new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
      }

      return data;
    } catch (err) {
      throw err;
    }
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  put(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  download(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET', responseType: 'blob' });
  }
}

export const api = new ApiService();
export default api;

