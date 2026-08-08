import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import AppShell from './layouts/AppShell';

import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import AssetsListPage from './pages/assets/AssetsListPage';
import AssetDetailPage from './pages/assets/AssetDetailPage';
import AssetFormPage from './pages/assets/AssetFormPage';
import IssuesListPage from './pages/issues/IssuesListPage';
import IssueDetailPage from './pages/issues/IssueDetailPage';
import PublicAssetPage from './pages/public/PublicAssetPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import TechniciansPage from './pages/technicians/TechniciansPage';
import SettingsPage from './pages/settings/SettingsPage';
import UsersPage from './pages/users/UsersPage';
import ReportsPage from './pages/reports/ReportsPage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import MaintenancePage from './pages/maintenance/MaintenancePage';
import AuditLogPage from './pages/audit/AuditLogPage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-muted">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-700" />
          <p className="text-sm text-ink-500">Loading MaintainIQ…</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/public/asset/:publicId" element={<PublicAssetPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />

        <Route path="assets" element={<AssetsListPage />} />
        <Route
          path="assets/new"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <AssetFormPage />
            </ProtectedRoute>
          }
        />
        <Route path="assets/:id" element={<AssetDetailPage />} />
        <Route
          path="assets/:id/edit"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <AssetFormPage />
            </ProtectedRoute>
          }
        />

        <Route path="issues" element={<IssuesListPage />} />
        <Route path="issues/:id" element={<IssueDetailPage />} />
        <Route path="maintenance" element={<MaintenancePage />} />
        <Route
          path="audit"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <AuditLogPage />
            </ProtectedRoute>
          }
        />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route
          path="technicians"
          element={
            <ProtectedRoute roles={['ADMIN', 'SUPERVISOR']}>
              <TechniciansPage />
            </ProtectedRoute>
          }
        />
        <Route path="settings" element={<SettingsPage />} />
        <Route
          path="users"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="reports"
          element={
            <ProtectedRoute roles={['ADMIN', 'SUPERVISOR']}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="analytics"
          element={
            <ProtectedRoute roles={['ADMIN', 'SUPERVISOR']}>
              <AnalyticsPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}

export default App;
