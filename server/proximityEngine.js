const PROXIMITY_RADIUS = 150;

/**
 * Checks proximity of a moved user against all other users.
 * Returns { connected: [id, ...], disconnected: [id, ...] }
 */
function checkProximity(movedUser, allUsers) {
  const events = { connected: [], disconnected: [] };

  for (const [id, other] of allUsers) {
    if (id === movedUser.id) continue;

    const dx = movedUser.x - other.x;
    const dy = movedUser.y - other.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const wasNear = movedUser.nearby.has(id);
    const isNear = dist < PROXIMITY_RADIUS;

    if (isNear && !wasNear) {
      events.connected.push(id);
    } else if (!isNear && wasNear) {
      events.disconnected.push(id);
    }
  }

  return events;
}

module.exports = { checkProximity, PROXIMITY_RADIUS };
