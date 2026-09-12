// frontend/src/services/authService.js

import api from './api.js';
import { useAuthStore } from '../store/authStore.js';

export async function signup(name, email, password) {
  const { data } = await api.post('/auth/signup', { name, email, password });
  useAuthStore.getState().setAuth(data.user, data.token);
  return data;
}

export async function login(email, password) {
  const { data } = await api.post('/auth/login', { email, password });
  useAuthStore.getState().setAuth(data.user, data.token);
  return data;
}

export function logout() {
  useAuthStore.getState().logout();
}

export async function getMe() {
  const { data } = await api.get('/auth/me');
  return data.user;
}
