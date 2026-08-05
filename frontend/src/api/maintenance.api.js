import api from './client';

export const getSchedules = (params = {}) =>
  api.get('/maintenance', { params });

export const getSchedule = (id) => api.get(`/maintenance/${id}`);

export const createSchedule = (payload) => api.post('/maintenance', payload);

export const updateSchedule = (id, payload) =>
  api.patch(`/maintenance/${id}`, payload);

export const completeSchedule = (id, notes) =>
  api.post(`/maintenance/${id}/complete`, { notes });

export const cancelSchedule = (id) => api.post(`/maintenance/${id}/cancel`);
