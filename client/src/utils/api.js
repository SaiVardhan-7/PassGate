import axios from 'axios';

// Normalize API base URL: handles both "https://domain.com" and "https://domain.com/api" seamlessly
const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (!envUrl || !envUrl.trim()) {
    return '/api';
  }
  let clean = envUrl.trim().replace(/\/+$/, '');
  if (clean.startsWith('http') && !clean.endsWith('/api')) {
    clean = `${clean}/api`;
  }
  return clean;
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add Authorization header if token exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to handle 401 unauthorized gracefully
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If unauthorized and token is invalid/expired
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/register') {
        // Only clear if not already on auth pages
        // localStorage.removeItem('token');
        // localStorage.removeItem('user');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
