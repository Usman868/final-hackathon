import api from './client';

export const getAuditLogs = (params = {}) => api.get('/audit', { params });
