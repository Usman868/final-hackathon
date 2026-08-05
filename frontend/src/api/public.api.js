import api from './client';

/** Safe public asset (no auth) */
export const getPublicAsset = (publicId) =>
  api.get(`/public/assets/${publicId}`);

/** Public report issue */
export const reportPublicIssue = (publicId, payload) =>
  api.post(`/public/assets/${publicId}/issues`, payload);

/** AI triage – public allowed via optionalAuth */
export const runTriage = (payload) =>
  api.post('/ai/triage', payload);
