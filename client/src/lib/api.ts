import axios from 'axios';

const rawUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '/api';
const API_BASE_URL = rawUrl.startsWith('http') && !rawUrl.endsWith('/api') ? `${rawUrl.replace(/\/$/, '')}/api` : rawUrl;

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('garudapath_token') || localStorage.getItem('routewise_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.startsWith('/login')) {
      localStorage.removeItem('garudapath_token');
      localStorage.removeItem('garudapath_user');
      localStorage.removeItem('routewise_token');
      localStorage.removeItem('routewise_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
