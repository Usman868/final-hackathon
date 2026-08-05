import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { connectSocket, disconnectSocket, getSocket, updateSocketAuth } from '../lib/socket';

/**
 * Keep a staff socket connection while authenticated.
 * Call from AppShell or AuthProvider consumers.
 */
export function useSocketConnection() {
  const { isAuthenticated, user } = useAuth();
  const connectedFor = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) {
      disconnectSocket();
      connectedFor.current = null;
      return;
    }

    const token = localStorage.getItem('accessToken');
    const s = connectSocket();
    updateSocketAuth(token);
    connectedFor.current = user?._id;

    return () => {
      // Don't disconnect on every re-render; only on logout (handled when !isAuthenticated)
    };
  }, [isAuthenticated, user?._id]);

  return getSocket();
}

/**
 * Subscribe to a socket event; auto-cleans on unmount.
 */
export function useSocketEvent(event, handler) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const s = getSocket() || connectSocket();
    if (!event || !s) return undefined;

    const listener = (data) => handlerRef.current?.(data);
    s.on(event, listener);
    return () => {
      s.off(event, listener);
    };
  }, [event]);
}
