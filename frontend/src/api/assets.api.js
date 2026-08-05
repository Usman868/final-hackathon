import api from './client';

export const getAssets = (params = {}) =>
  api.get('/assets', { params });

export const getAssetById = (id) =>
  api.get(`/assets/${id}`);

export const createAsset = (payload) =>
  api.post('/assets', payload);

export const updateAsset = (id, payload) =>
  api.patch(`/assets/${id}`, payload);

export const retireAsset = (id, reason) =>
  api.post(`/assets/${id}/retire`, { reason });

export const getAssetQR = (id) =>
  api.get(`/assets/${id}/qr`);

export const getAssetHistory = (id, params = {}) =>
  api.get(`/assets/${id}/history`, { params });

export const getAssetStats = () =>
  api.get('/assets/stats/summary');
