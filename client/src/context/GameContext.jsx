import { createContext, useContext, useReducer } from 'react';

const GameContext = createContext(null);

const initialState = {
  phase: 'join', // 'join' | 'playing'
  self: null,    // { id, name, x, y, color, status }
  players: {},   // { [id]: { id, name, x, y, color, status } }
  nearbyUsers: [], // [{ id, name, roomId }]
  messages: {},  // { [roomId]: [{ from, fromName, text, timestamp, type, imageData }] }
  activeRoom: null,
  toasts: [],    // [{ id, text, type }]
  typingUsers: {}, // { [roomId]: { fromName } }
  roomCounts: {}, // { 'Room 1': 2 }
  groups: {},    // { [groupId]: { id, name, members: [{id, name}], createdBy } }
};

function gameReducer(state, action) {
  switch (action.type) {
    case 'SET_SELF':
      return { ...state, self: action.payload, phase: 'playing' };

    case 'UPDATE_SELF_POSITION':
      return {
        ...state,
        self: { ...state.self, x: action.payload.x, y: action.payload.y },
      };

    case 'UPDATE_SELF_STATUS':
      return {
        ...state,
        self: { ...state.self, status: action.payload },
      };

    case 'SYNC_PLAYERS':
      return {
        ...state,
        players: action.payload.players,
        roomCounts: action.payload.roomCounts || state.roomCounts,
      };

    case 'PLAYER_LEFT': {
      const newPlayers = { ...state.players };
      delete newPlayers[action.payload];
      const newNearby = state.nearbyUsers.filter(u => u.id !== action.payload);
      return { ...state, players: newPlayers, nearbyUsers: newNearby };
    }

    case 'PROXIMITY_CONNECT': {
      const { connected } = action.payload;
      const existing = state.nearbyUsers.map(u => u.id);
      const newNearby = [
        ...state.nearbyUsers,
        ...connected.filter(c => !existing.includes(c.id)),
      ];
      const activeRoom = state.activeRoom || (connected.length > 0 ? connected[0].roomId : null);
      const newMessages = { ...state.messages };
      connected.forEach(c => {
        if (!newMessages[c.roomId]) newMessages[c.roomId] = [];
      });
      return {
        ...state,
        nearbyUsers: newNearby,
        activeRoom,
        messages: newMessages,
      };
    }

    case 'PROXIMITY_DISCONNECT': {
      const { disconnected } = action.payload;
      const discIds = disconnected.map(d => d.id);
      const discRooms = disconnected.map(d => d.roomId);
      const newNearby = state.nearbyUsers.filter(u => !discIds.includes(u.id));
      let activeRoom = state.activeRoom;
      if (discRooms.includes(activeRoom)) {
        activeRoom = newNearby.length > 0 ? newNearby[0].roomId : null;
      }
      return {
        ...state,
        nearbyUsers: newNearby,
        activeRoom,
      };
    }

    case 'RECEIVE_MESSAGE': {
      const msg = action.payload;
      const roomMessages = state.messages[msg.roomId] || [];
      return {
        ...state,
        messages: {
          ...state.messages,
          [msg.roomId]: [...roomMessages, msg],
        },
      };
    }

    case 'SET_ACTIVE_ROOM':
      return { ...state, activeRoom: action.payload };

    case 'SET_TYPING': {
      const { roomId, fromName, isTyping } = action.payload;
      const newTyping = { ...state.typingUsers };
      if (isTyping) {
        newTyping[roomId] = { fromName };
      } else {
        delete newTyping[roomId];
      }
      return { ...state, typingUsers: newTyping };
    }

    // ---- Group chat reducers ----
    case 'GROUP_CREATED': {
      const { groupId, groupName, members } = action.payload;
      const newMessages = { ...state.messages };
      if (!newMessages[groupId]) newMessages[groupId] = [];
      return {
        ...state,
        groups: {
          ...state.groups,
          [groupId]: { id: groupId, name: groupName, members },
        },
        messages: newMessages,
        activeRoom: groupId,
      };
    }

    case 'GROUP_MEMBER_LEFT': {
      const { groupId, userId } = action.payload;
      const group = state.groups[groupId];
      if (!group) return state;
      const updatedMembers = group.members.filter(m => m.id !== userId);
      return {
        ...state,
        groups: {
          ...state.groups,
          [groupId]: { ...group, members: updatedMembers },
        },
      };
    }

    case 'LEAVE_GROUP': {
      const gId = action.payload;
      const newGroups = { ...state.groups };
      delete newGroups[gId];
      let activeRoom = state.activeRoom;
      if (activeRoom === gId) {
        const nearbyRooms = state.nearbyUsers.map(u => u.roomId);
        const groupRooms = Object.keys(newGroups);
        activeRoom = nearbyRooms[0] || groupRooms[0] || null;
      }
      return { ...state, groups: newGroups, activeRoom };
    }

    case 'ADD_TOAST': {
      const toast = { id: Date.now(), ...action.payload };
      return { ...state, toasts: [...state.toasts, toast] };
    }

    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.payload) };

    default:
      return state;
  }
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
