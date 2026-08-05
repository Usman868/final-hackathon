import { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import toast from 'react-hot-toast';
import Sidebar from '../components/layout/Sidebar';
import Topbar from '../components/layout/Topbar';
import { useSocketConnection, useSocketEvent } from '../hooks/useSocket';
import { useAuth } from '../context/AuthContext';
import ErrorBoundary from '../components/common/ErrorBoundary';

/**
 * Authenticated app chrome: sidebar + topbar + live socket.
 * Public routes must NOT use this layout.
 */
export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadBump, setUnreadBump] = useState(0);
  const { isAuthenticated } = useAuth();

  useSocketConnection();

  const onNotification = useCallback((payload) => {
    const n = payload?.notification || payload;
    if (n?.title) {
      toast(n.title, {
        icon: '🔔',
        duration: 4000,
      });
    }
    setUnreadBump((x) => x + 1);
  }, []);

  useSocketEvent('notification:new', onNotification);
  useSocketEvent('issue:updated', () => {
    // soft signal for open dashboards; pages can refetch on focus
  });

  // Reset bump is handled inside Topbar via prop change
  useEffect(() => {
    if (!isAuthenticated) setUnreadBump(0);
  }, [isAuthenticated]);

  return (
    <div className="min-h-screen bg-surface-muted">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-with-sidebar flex min-h-screen flex-col">
        <Topbar
          onMenuClick={() => setSidebarOpen(true)}
          unreadBump={unreadBump}
        />
        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <ErrorBoundary soft>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
