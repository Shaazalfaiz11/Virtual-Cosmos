# 🌌 Virtual Cosmos — 2D Proximity Chat

A real-time 2D virtual space where users walk around as avatars and automatically connect to chat when they come near each other. Walk away and the chat disconnects — just like real-world proximity.

![Demo](https://img.shields.io/badge/Status-Live-4ECDC4?style=flat-square)
![Tech](https://img.shields.io/badge/Stack-React%20%7C%20Node%20%7C%20Socket.IO%20%7C%20MongoDB-45B7D1?style=flat-square)

## ✨ Features

- **2D Movement Canvas** — WASD/Arrow key avatar movement on a shared 2D map
- **Real-time Sync** — All positions broadcast instantly via Socket.IO
- **Proximity Detection** — Euclidean distance-based auto-connect/disconnect
- **Chat System** — Slide-in panel with tabs for multiple connections
- **Group Chat** — Create group rooms with nearby users
- **Image Upload** — Share images inline in chat (base64, max 4MB)
- **User Status** — Available / Busy / Away with color indicators on avatars
- **Typing Indicator** — Animated "is typing..." display
- **Sound Notifications** — Audio cues for connect, disconnect, and messages
- **Room Zones** — Named areas on the map with live user counts

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite, Canvas API |
| Backend | Node.js + Express + Socket.IO |
| Database | MongoDB (Mongoose) |
| Styling | Tailwind CSS + Custom CSS |

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB running locally (or a cloud URI)

### Install & Run

```bash
# Clone
git clone https://github.com/Shaazalfaiz11/Virtual-Cosmos.git
cd Virtual-Cosmos

# Server
cd server
npm install
echo "MONGODB_URI=mongodb://127.0.0.1:27017/virtual-cosmos" > .env
echo "PORT=3001" >> .env
echo "CLIENT_URL=http://localhost:5173" >> .env
node index.js

# Client (new terminal)
cd client
npm install
npm run dev
```

Open **http://localhost:5173** in two browser tabs to test proximity chat.

## 📁 Project Structure

```
Virtual-Cosmos/
├── client/                 # React + Vite frontend
│   ├── src/
│   │   ├── components/     # Canvas, ChatPanel, HUD, JoinScreen
│   │   ├── context/        # GameContext (global state)
│   │   ├── hooks/          # useSocket, useMovement
│   │   └── utils/          # Sound notifications
│   └── vite.config.js
├── server/                 # Node.js backend
│   ├── index.js            # Socket.IO server + group chat
│   ├── proximityEngine.js  # Euclidean distance checker
│   ├── roomManager.js      # Room join/leave logic
│   ├── userStore.js        # In-memory user store
│   ├── db.js               # MongoDB connection
│   └── models/Session.js   # Session logging schema
└── README.md
```

## 🎮 How It Works

1. User joins with a display name → gets a colored avatar
2. Move around the 2D world using keyboard
3. When two avatars are within 150px → chat panel opens automatically
4. Walk away → chat disconnects
5. Create group chats when 2+ users are nearby
6. Share images and see typing indicators in real-time

## 📄 License

MIT
