// In-memory user store
// Map<socketId, { id, name, x, y, color, nearby: Set<socketId> }>
const userStore = new Map();

module.exports = { userStore };
