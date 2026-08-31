import axios from 'axios';

const api = axios.create({
  // In production the reverse proxy serves the API under the same HTTPS origin.
  // A custom URL is kept only for local development.
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
});

export default api;
