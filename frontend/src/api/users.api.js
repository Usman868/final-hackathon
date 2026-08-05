import api from './client';

export const getTechnicians = () => api.get('/auth/technicians');

/** Admin: list all users */
export const getUsers = (params = {}) => api.get('/auth/users', { params });

/** Admin: create user (register) */
export const createUser = (payload) => api.post('/auth/register', payload);

/** Admin: activate / deactivate */
export const setUserActive = (id, isActive) =>
  api.patch(`/auth/users/${id}/status`, { isActive });
