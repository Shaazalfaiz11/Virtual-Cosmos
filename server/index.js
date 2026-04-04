require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./db');
const { userStore } = require('./userStore');
const { checkProximity } = require('./proximityEngine');
const { joinRoom, leaveRoom } = require('./roomManager');
const Session = require('./models/Session');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: 5e6, // 5MB for image uploads
});

// Connect to MongoDB
connectDB();

// Avatar colors palette
const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F0B27A', '#82E0AA',
];

let colorIndex = 0;
function getNextColor() {
  const color = COLORS[colorIndex % COLORS.length];
  colorIndex++;
  return color;
}

// Room zones for user counting
const ROOMS = [
  { name: 'Room 1', x: 300, y: 300, w: 350, h: 250 },
  { name: 'Room 2', x: 1200, y: 200, w: 400, h: 280 },
  { name: 'Room 3', x: 700, y: 800, w: 380, h: 260 },
  { name: 'Room 4', x: 200, y: 1300, w: 320, h: 240 },
  { name: 'Room 5', x: 1300, y: 1100, w: 380, h: 280 },
];

function getRoomCounts() {
  const counts = {};
  ROOMS.forEach(room => { counts[room.name] = 0; });
  for (const [, user] of userStore) {
    for (const room of ROOMS) {
      if (user.x >= room.x && user.x <= room.x + room.w &&
          user.y >= room.y && user.y <= room.y + room.h) {
        counts[room.name]++;
      }
    }
  }
  return counts;
}

// ---- Group chat store ----
// Map<groupId, { id, name, members: Set<socketId>, createdBy }>
const groupStore = new Map();
let groupCounter = 0;

io.on('connection', (socket) => {
  console.log(`🔌 Connected: ${socket.id}`);

  // --- user:join ---
  socket.on('user:join', async ({ name }) => {
    const color = getNextColor();
    const x = 400 + Math.random() * 400;
    const y = 300 + Math.random() * 200;

    const user = {
      id: socket.id,
      name,
      x,
      y,
      color,
      status: 'available',
      nearby: new Set(),
      groups: new Set(), // track which groups this user belongs to
    };
    userStore.set(socket.id, user);

    // Log session to MongoDB
    try {
      await Session.create({
        socketId: socket.id,
        name,
        joinedAt: new Date(),
        connections: [],
      });
    } catch (err) {
      console.error('MongoDB session log error:', err.message);
    }

    // Send the joining user their own data
    socket.emit('user:self', { id: socket.id, name, x, y, color, status: 'available' });

    // Broadcast updated player list to everyone
    broadcastPlayers();
  });

  // --- Feature #1: user:status ---
  socket.on('user:status', ({ status }) => {
    const user = userStore.get(socket.id);
    if (!user) return;
    user.status = status;
    broadcastPlayers();
  });

  // --- Feature #3: chat:typing ---
  socket.on('chat:typing', ({ roomId, isTyping }) => {
    const user = userStore.get(socket.id);
    if (!user) return;
    socket.to(roomId).emit('chat:typing', {
      from: socket.id,
      fromName: user.name,
      roomId,
      isTyping,
    });
  });

  // --- position:update ---
  socket.on('position:update', ({ x, y }) => {
    const user = userStore.get(socket.id);
    if (!user) return;

    user.x = x;
    user.y = y;

    // Run proximity check
    const events = checkProximity(user, userStore);

    // Handle connections
    for (const targetId of events.connected) {
      const target = userStore.get(targetId);
      if (!target) continue;

      user.nearby.add(targetId);
      target.nearby.add(socket.id);

      const roomId = joinRoom(io, socket.id, targetId);

      io.to(socket.id).emit('proximity:change', {
        connected: [{ id: targetId, name: target.name, roomId }],
        disconnected: [],
      });
      io.to(targetId).emit('proximity:change', {
        connected: [{ id: socket.id, name: user.name, roomId }],
        disconnected: [],
      });

      Session.updateOne(
        { socketId: socket.id },
        { $push: { connections: { withUser: targetId, withName: target.name, connectedAt: new Date() } } }
      ).catch(() => {});
    }

    // Handle disconnections
    for (const targetId of events.disconnected) {
      const target = userStore.get(targetId);

      user.nearby.delete(targetId);
      if (target) target.nearby.delete(socket.id);

      const roomId = leaveRoom(io, socket.id, targetId);

      io.to(socket.id).emit('proximity:change', {
        connected: [],
        disconnected: [{ id: targetId, roomId }],
      });
      io.to(targetId).emit('proximity:change', {
        connected: [],
        disconnected: [{ id: socket.id, roomId }],
      });

      Session.updateOne(
        { socketId: socket.id, 'connections.withUser': targetId, 'connections.disconnectedAt': null },
        { $set: { 'connections.$.disconnectedAt': new Date() } }
      ).catch(() => {});
    }

    broadcastPlayers();
  });

  // --- chat:message (text + image support) ---
  socket.on('chat:message', ({ roomId, text, type, imageData }) => {
    const user = userStore.get(socket.id);
    if (!user) return;

    const message = {
      from: socket.id,
      fromName: user.name,
      roomId,
      timestamp: Date.now(),
      type: type || 'text', // 'text' | 'image'
    };

    if (type === 'image' && imageData) {
      // imageData is a base64 data URL
      message.imageData = imageData;
      message.text = text || '📷 Image';
    } else {
      message.text = text;
    }

    io.to(roomId).emit('chat:message', message);
  });

  // --- group:create ---
  socket.on('group:create', ({ name, memberIds }) => {
    const user = userStore.get(socket.id);
    if (!user) return;

    groupCounter++;
    const groupId = `group_${groupCounter}_${Date.now()}`;
    const groupName = name || `Group ${groupCounter}`;

    // Include creator + selected members
    const allMembers = new Set([socket.id, ...memberIds]);

    const group = {
      id: groupId,
      name: groupName,
      members: allMembers,
      createdBy: socket.id,
      createdAt: Date.now(),
    };
    groupStore.set(groupId, group);

    // Join all members to the Socket.IO room
    for (const memberId of allMembers) {
      const memberSocket = io.sockets.sockets.get(memberId);
      if (memberSocket) {
        memberSocket.join(groupId);
        const memberUser = userStore.get(memberId);
        if (memberUser) memberUser.groups.add(groupId);
      }
    }

    // Build member names list
    const memberNames = [];
    for (const mid of allMembers) {
      const u = userStore.get(mid);
      if (u) memberNames.push({ id: mid, name: u.name });
    }

    // Notify all group members
    io.to(groupId).emit('group:created', {
      groupId,
      groupName,
      members: memberNames,
      createdBy: user.name,
    });

    console.log(`👥 Group "${groupName}" created by ${user.name} with ${allMembers.size} members`);
  });

  // --- group:leave ---
  socket.on('group:leave', ({ groupId }) => {
    const user = userStore.get(socket.id);
    const group = groupStore.get(groupId);
    if (!user || !group) return;

    group.members.delete(socket.id);
    user.groups.delete(groupId);
    socket.leave(groupId);

    // Notify remaining members
    io.to(groupId).emit('group:member-left', {
      groupId,
      userId: socket.id,
      userName: user.name,
    });

    // Delete group if empty
    if (group.members.size === 0) {
      groupStore.delete(groupId);
    }
  });

  // --- disconnect ---
  socket.on('disconnect', async () => {
    console.log(`❌ Disconnected: ${socket.id}`);
    const user = userStore.get(socket.id);
    if (!user) return;

    // Clean up proximity connections
    for (const targetId of user.nearby) {
      const target = userStore.get(targetId);
      if (target) {
        target.nearby.delete(socket.id);
        const roomId = leaveRoom(io, socket.id, targetId);
        io.to(targetId).emit('proximity:change', {
          connected: [],
          disconnected: [{ id: socket.id, roomId }],
        });
      }
    }

    // Clean up group memberships
    for (const groupId of user.groups) {
      const group = groupStore.get(groupId);
      if (group) {
        group.members.delete(socket.id);
        io.to(groupId).emit('group:member-left', {
          groupId,
          userId: socket.id,
          userName: user.name,
        });
        if (group.members.size === 0) {
          groupStore.delete(groupId);
        }
      }
    }

    userStore.delete(socket.id);

    // Update session in MongoDB
    try {
      await Session.updateOne(
        { socketId: socket.id, leftAt: null },
        { $set: { leftAt: new Date() } }
      );
    } catch (err) {
      console.error('MongoDB session update error:', err.message);
    }

    io.emit('user:left', { id: socket.id });
    broadcastPlayers();
  });
});

function broadcastPlayers() {
  const players = {};
  for (const [id, user] of userStore) {
    players[id] = {
      id: user.id,
      name: user.name,
      x: user.x,
      y: user.y,
      color: user.color,
      status: user.status || 'available',
    };
  }
  const roomCounts = getRoomCounts();
  io.emit('state:sync', { players, roomCounts });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', players: userStore.size });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
