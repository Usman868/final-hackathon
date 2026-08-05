import api from './client';

export const getIssues = (params = {}) => api.get('/issues', { params });

export const getIssueById = (id) => api.get(`/issues/${id}`);

export const createInternalIssue = (payload) => api.post('/issues', payload);

export const updateIssue = (id, payload) => api.patch(`/issues/${id}`, payload);

export const assignIssue = (id, technicianId) =>
  api.post(`/issues/${id}/assign`, { technicianId });

export const transitionStatus = (id, payload) =>
  api.patch(`/issues/${id}/status`, payload);

export const getIssueStats = () => api.get('/issues/stats/summary');

export const uploadEvidence = (id, formData) =>
  api.post(`/issues/${id}/evidence`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const deleteEvidence = (id, evidenceId) =>
  api.delete(`/issues/${id}/evidence/${evidenceId}`);
