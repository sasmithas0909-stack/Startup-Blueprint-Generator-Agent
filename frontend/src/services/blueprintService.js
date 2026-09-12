// frontend/src/services/blueprintService.js

import api from './api.js';

export async function generateBlueprint(formData) {
  const { data } = await api.post('/blueprint/generate', formData);
  return data;
}

export async function getBlueprintStatus(id) {
  const { data } = await api.get(`/blueprint/${id}/status`);
  return data;
}

export async function getBlueprint(id) {
  const { data } = await api.get(`/blueprint/${id}`);
  return data;
}

export async function regenerateSection(blueprintId, sectionKey) {
  const { data } = await api.post(`/blueprint/${blueprintId}/section/${sectionKey}/regenerate`);
  return data;
}

export async function deleteBlueprint(id) {
  const { data } = await api.delete(`/blueprint/${id}`);
  return data;
}

export async function getUserBlueprints(page = 1, limit = 10) {
  const { data } = await api.get(`/user/blueprints?page=${page}&limit=${limit}`);
  return data;
}

export async function getUserProfile() {
  const { data } = await api.get('/user/me');
  return data;
}
