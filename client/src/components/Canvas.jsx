import { useEffect, useRef, useMemo } from 'react';
import { useGame } from '../context/GameContext';

const WORLD_W = 2000;
const WORLD_H = 2000;
const PROXIMITY_RADIUS = 150;

const STATUS_COLORS = {
  available: '#4ECDC4',
  busy: '#FF6B6B',
  away: '#F7DC6F',
};

const ROOMS = [
  { name: 'Room 1', x: 300, y: 300, w: 350, h: 250 },
  { name: 'Room 2', x: 1200, y: 200, w: 400, h: 280 },
  { name: 'Room 3', x: 700, y: 800, w: 380, h: 260 },
  { name: 'Room 4', x: 200, y: 1300, w: 320, h: 240 },
  { name: 'Room 5', x: 1300, y: 1100, w: 380, h: 280 },
];

export default function Canvas() {
  const canvasRef = useRef(null);
  const { state } = useGame();
  const selfId = state.self?.id;
  const interpRef = useRef({});

  const nearbyIds = useMemo(
    () => new Set(state.nearbyUsers.map(u => u.id)),
    [state.nearbyUsers]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animFrame;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    function drawFrame() {
      const w = canvas.width;
      const h = canvas.height;
      const self = state.self;
      if (!self) { animFrame = requestAnimationFrame(drawFrame); return; }

      const camX = self.x - w / 2;
      const camY = self.y - h / 2;

      ctx.clearRect(0, 0, w, h);

      // Background
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, w, h);

      // Floor
      const floorX = -camX;
      const floorY = -camY;
      const grad = ctx.createLinearGradient(floorX, floorY, floorX + WORLD_W, floorY + WORLD_H);
      grad.addColorStop(0, '#1e1e35');
      grad.addColorStop(0.5, '#22223a');
      grad.addColorStop(1, '#1e1e35');
      ctx.fillStyle = grad;
      ctx.fillRect(floorX, floorY, WORLD_W, WORLD_H);

      // Grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      const gridSize = 60;
      for (let gx = 0; gx <= WORLD_W; gx += gridSize) {
        ctx.beginPath();
        ctx.moveTo(floorX + gx, floorY);
        ctx.lineTo(floorX + gx, floorY + WORLD_H);
        ctx.stroke();
      }
      for (let gy = 0; gy <= WORLD_H; gy += gridSize) {
        ctx.beginPath();
        ctx.moveTo(floorX, floorY + gy);
        ctx.lineTo(floorX + WORLD_W, floorY + gy);
        ctx.stroke();
      }

      // Draw rooms with user counts
      const roomCounts = state.roomCounts || {};
      ROOMS.forEach(room => {
        drawRoom(ctx, room.x, room.y, room.w, room.h, room.name, camX, camY, roomCounts[room.name] || 0);
      });

      // Decorative objects
      drawDesk(ctx, 420, 380, camX, camY);
      drawDesk(ctx, 1350, 300, camX, camY);
      drawDesk(ctx, 820, 880, camX, camY);
      drawPlant(ctx, 280, 280, camX, camY);
      drawPlant(ctx, 1580, 180, camX, camY);
      drawPlant(ctx, 1060, 780, camX, camY);
      drawPlant(ctx, 180, 1280, camX, camY);

      // Connection lines
      for (const nearby of state.nearbyUsers) {
        const other = state.players[nearby.id];
        if (!other) continue;
        const sx = self.x - camX;
        const sy = self.y - camY;
        const ox = other.x - camX;
        const oy = other.y - camY;

        ctx.save();
        ctx.strokeStyle = 'rgba(78, 205, 196, 0.4)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ox, oy);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      // Draw other players
      for (const [id, player] of Object.entries(state.players)) {
        if (id === selfId) continue;

        if (!interpRef.current[id]) {
          interpRef.current[id] = { x: player.x, y: player.y };
        }
        const interp = interpRef.current[id];
        interp.x += (player.x - interp.x) * 0.2;
        interp.y += (player.y - interp.y) * 0.2;

        const px = interp.x - camX;
        const py = interp.y - camY;
        const isNear = nearbyIds.has(id);

        drawAvatar(ctx, px, py, player.color, player.name, isNear, false, player.status);
      }

      // Draw self (always on top)
      const sx = self.x - camX;
      const sy = self.y - camY;
      drawAvatar(ctx, sx, sy, self.color, self.name + ' (you)', false, true, self.status);

      // Proximity radius
      ctx.beginPath();
      ctx.arc(sx, sy, PROXIMITY_RADIUS, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(78, 205, 196, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Cleanup
      for (const id of Object.keys(interpRef.current)) {
        if (!state.players[id]) delete interpRef.current[id];
      }

      animFrame = requestAnimationFrame(drawFrame);
    }

    animFrame = requestAnimationFrame(drawFrame);

    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener('resize', resize);
    };
  }, [state.self, state.players, state.nearbyUsers, state.roomCounts, selfId, nearbyIds]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
      }}
    />
  );
}

// --- Drawing helpers ---

function drawAvatar(ctx, x, y, color, name, isNear, isSelf, status) {
  const radius = 20;

  // Glow for nearby
  if (isNear) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius + 12, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(78, 205, 196, 0.15)';
    ctx.fill();
    ctx.restore();
  }

  // Shadow
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y + radius + 4, radius * 0.7, 4, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fill();
  ctx.restore();

  // Body
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  const bodyGrad = ctx.createRadialGradient(x - 5, y - 5, 2, x, y, radius);
  bodyGrad.addColorStop(0, lightenColor(color, 30));
  bodyGrad.addColorStop(1, color);
  ctx.fillStyle = bodyGrad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Eyes
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(x - 6, y - 3, 4, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + 6, y - 3, 4, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pupils
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.arc(x - 5, y - 2, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 7, y - 2, 2, 0, Math.PI * 2);
  ctx.fill();

  // Smile
  ctx.beginPath();
  ctx.arc(x, y + 3, 6, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Status dot
  const statusColor = STATUS_COLORS[status] || STATUS_COLORS.available;
  ctx.beginPath();
  ctx.arc(x + 14, y + 14, 5, 0, Math.PI * 2);
  ctx.fillStyle = statusColor;
  ctx.fill();
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Name tag
  ctx.font = '600 11px Inter, sans-serif';
  ctx.textAlign = 'center';
  const textWidth = ctx.measureText(name).width;

  const tagH = 18;
  const tagW = textWidth + 12;
  const tagX = x - tagW / 2;
  const tagY = y - radius - 24;
  ctx.fillStyle = 'rgba(15, 15, 26, 0.8)';
  roundRect(ctx, tagX, tagY, tagW, tagH, 6);
  ctx.fill();

  ctx.fillStyle = '#e8e8f0';
  ctx.fillText(name, x, tagY + 13);
}

function drawRoom(ctx, rx, ry, rw, rh, label, camX, camY, userCount) {
  const x = rx - camX;
  const y = ry - camY;

  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, rw, rh, 12);
  ctx.fill();
  ctx.stroke();

  // Room label
  ctx.font = '500 11px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.fillText('📍 ' + label, x + 12, y + 20);

  // User count badge
  if (userCount > 0) {
    const badgeX = x + rw - 35;
    const badgeY = y + 8;
    ctx.fillStyle = 'rgba(78, 205, 196, 0.2)';
    roundRect(ctx, badgeX, badgeY, 28, 16, 8);
    ctx.fill();
    ctx.font = '600 10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#4ECDC4';
    ctx.fillText(`👤${userCount}`, badgeX + 14, badgeY + 12);
  }

  ctx.restore();
}

function drawDesk(ctx, dx, dy, camX, camY) {
  const x = dx - camX;
  const y = dy - camY;

  ctx.save();
  ctx.fillStyle = 'rgba(139, 119, 101, 0.15)';
  ctx.strokeStyle = 'rgba(139, 119, 101, 0.1)';
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, 70, 40, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = 'rgba(69, 183, 209, 0.12)';
  roundRect(ctx, x + 22, y + 5, 26, 18, 3);
  ctx.fill();
  ctx.restore();
}

function drawPlant(ctx, px, py, camX, camY) {
  const x = px - camX;
  const y = py - camY;

  ctx.save();
  ctx.fillStyle = 'rgba(180, 120, 80, 0.2)';
  ctx.beginPath();
  ctx.moveTo(x - 8, y);
  ctx.lineTo(x + 8, y);
  ctx.lineTo(x + 6, y + 12);
  ctx.lineTo(x - 6, y + 12);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(76, 175, 80, 0.25)';
  ctx.beginPath();
  ctx.arc(x, y - 6, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(76, 175, 80, 0.18)';
  ctx.beginPath();
  ctx.arc(x - 5, y - 10, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 5, y - 10, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function lightenColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + percent);
  const g = Math.min(255, ((num >> 8) & 0x00ff) + percent);
  const b = Math.min(255, (num & 0x0000ff) + percent);
  return `rgb(${r}, ${g}, ${b})`;
}
