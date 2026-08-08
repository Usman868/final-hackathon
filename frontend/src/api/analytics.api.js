import api from './client';

export const getTechnicianPerformance = (params = {}) =>
  api.get('/analytics/technicians', { params });

export const getAnalyticsOverview = (params = {}) =>
  api.get('/analytics/overview', { params });
