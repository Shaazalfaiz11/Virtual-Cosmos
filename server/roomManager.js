/**
 * Room Manager — handles Socket.IO room join/leave for proximity chat.
 * Room IDs are deterministic: room_<smallerId>_<largerId>
 */

function getRoomId(idA, idB) {
  return idA < idB ? `room_${idA}_${idB}` : `room_${idB}_${idA}`;
}

function joinRoom(io, socketIdA, socketIdB) {
  const roomId = getRoomId(socketIdA, socketIdB);
  const socketA = io.sockets.sockets.get(socketIdA);
  const socketB = io.sockets.sockets.get(socketIdB);

  if (socketA) socketA.join(roomId);
  if (socketB) socketB.join(roomId);

  console.log(`💬 Room created: ${roomId}`);
  return roomId;
}

function leaveRoom(io, socketIdA, socketIdB) {
  const roomId = getRoomId(socketIdA, socketIdB);
  const socketA = io.sockets.sockets.get(socketIdA);
  const socketB = io.sockets.sockets.get(socketIdB);

  if (socketA) socketA.leave(roomId);
  if (socketB) socketB.leave(roomId);

  console.log(`🚪 Room closed: ${roomId}`);
  return roomId;
}

module.exports = { getRoomId, joinRoom, leaveRoom };
