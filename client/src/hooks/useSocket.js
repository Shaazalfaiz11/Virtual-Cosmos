import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useGame } from '../context/GameContext';
import { playConnectSound, playDisconnectSound, playMessageSound } from '../utils/sounds';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export function useSocket() {
  const socketRef = useRef(null);
  const { state, dispatch } = useGame();
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  useEffect(() => {
    if (socketRef.current) return;

    const socket = io(SERVER_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('user:self', (data) => {
      dispatchRef.current({ type: 'SET_SELF', payload: data });
    });

    socket.on('state:sync', ({ players, roomCounts }) => {
      dispatchRef.current({ type: 'SYNC_PLAYERS', payload: { players, roomCounts } });
    });

    socket.on('proximity:change', ({ connected, disconnected }) => {
      if (connected && connected.length > 0) {
        dispatchRef.current({ type: 'PROXIMITY_CONNECT', payload: { connected } });
        connected.forEach(c => {
          dispatchRef.current({
            type: 'ADD_TOAST',
            payload: { text: `Connected with ${c.name}`, type: 'connect' },
          });
        });
        playConnectSound();
      }
      if (disconnected && disconnected.length > 0) {
        dispatchRef.current({ type: 'PROXIMITY_DISCONNECT', payload: { disconnected } });
        disconnected.forEach(() => {
          dispatchRef.current({
            type: 'ADD_TOAST',
            payload: { text: `Disconnected`, type: 'disconnect' },
          });
        });
        playDisconnectSound();
      }
    });

    socket.on('chat:message', (msg) => {
      dispatchRef.current({ type: 'RECEIVE_MESSAGE', payload: msg });
      if (msg.from !== socketRef.current?.id) {
        playMessageSound();
      }
    });

    socket.on('chat:typing', ({ roomId, fromName, isTyping }) => {
      dispatchRef.current({
        type: 'SET_TYPING',
        payload: { roomId, fromName, isTyping },
      });
    });

    // Group chat events
    socket.on('group:created', (data) => {
      dispatchRef.current({ type: 'GROUP_CREATED', payload: data });
      dispatchRef.current({
        type: 'ADD_TOAST',
        payload: { text: `Group "${data.groupName}" created`, type: 'connect' },
      });
      playConnectSound();
    });

    socket.on('group:member-left', ({ groupId, userId, userName }) => {
      dispatchRef.current({
        type: 'GROUP_MEMBER_LEFT',
        payload: { groupId, userId },
      });
    });

    socket.on('user:left', ({ id }) => {
      dispatchRef.current({ type: 'PLAYER_LEFT', payload: id });
    });

    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const join = useCallback((name) => {
    if (socketRef.current) socketRef.current.emit('user:join', { name });
  }, []);

  const sendPosition = useCallback((x, y) => {
    if (socketRef.current) socketRef.current.emit('position:update', { x, y });
  }, []);

  // Send text or image message
  const sendMessage = useCallback((roomId, text, type = 'text', imageData = null) => {
    if (socketRef.current && roomId) {
      if (type === 'image' && imageData) {
        socketRef.current.emit('chat:message', { roomId, text: text || '📷 Image', type: 'image', imageData });
      } else if (text && text.trim()) {
        socketRef.current.emit('chat:message', { roomId, text: text.trim(), type: 'text' });
      }
    }
  }, []);

  const setStatus = useCallback((status) => {
    if (socketRef.current) socketRef.current.emit('user:status', { status });
  }, []);

  const sendTyping = useCallback((roomId, isTyping) => {
    if (socketRef.current && roomId) socketRef.current.emit('chat:typing', { roomId, isTyping });
  }, []);

  // Create group chat
  const createGroup = useCallback((name, memberIds) => {
    if (socketRef.current) {
      socketRef.current.emit('group:create', { name, memberIds });
    }
  }, []);

  // Leave group
  const leaveGroup = useCallback((groupId) => {
    if (socketRef.current) {
      socketRef.current.emit('group:leave', { groupId });
      dispatchRef.current({ type: 'LEAVE_GROUP', payload: groupId });
    }
  }, []);

  return { socket: socketRef.current, join, sendPosition, sendMessage, setStatus, sendTyping, createGroup, leaveGroup };
}
