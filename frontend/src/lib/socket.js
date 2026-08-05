import { io } from 'socket.io-client';
import { SOCKET_URL } from '../constants';

let socket = null;

/**
 * Shared Socket.IO client. Connect with JWT from localStorage.
 */
export function getSocket() {
  return socket;
}

export function connectSocket() {
  if (socket?.connected) return socket;

  const token = localStorage.getItem('accessToken');

  socket = io(SOCKET_URL, {
    autoConnect: true,
    withCredentials: true,
    auth: token ? { token } : {},
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1500,
  });

  socket.on('connect', () => {
    if (token) {
      socket.emit('join:dashboard');
    }
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function updateSocketAuth(token) {
  if (!socket) return;
  socket.auth = token ? { token } : {};
  if (socket.connected) {
    socket.disconnect().connect();
  }
}
