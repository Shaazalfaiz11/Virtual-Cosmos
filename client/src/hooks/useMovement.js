import { useEffect, useRef, useCallback } from 'react';
import { useGame } from '../context/GameContext';

const SPEED = 4;
const EMIT_INTERVAL = 50; // ~20fps position updates

export function useMovement(sendPosition) {
  const { state, dispatch } = useGame();
  const keysRef = useRef(new Set());
  const lastEmitRef = useRef(0);
  const posRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef(null);

  // Track current position
  useEffect(() => {
    if (state.self) {
      posRef.current = { x: state.self.x, y: state.self.y };
    }
  }, [state.self?.x, state.self?.y]);

  // Movement loop
  const gameLoop = useCallback(() => {
    const keys = keysRef.current;
    if (keys.size === 0) {
      rafRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    let { x, y } = posRef.current;
    let moved = false;

    if (keys.has('ArrowUp') || keys.has('KeyW')) { y -= SPEED; moved = true; }
    if (keys.has('ArrowDown') || keys.has('KeyS')) { y += SPEED; moved = true; }
    if (keys.has('ArrowLeft') || keys.has('KeyA')) { x -= SPEED; moved = true; }
    if (keys.has('ArrowRight') || keys.has('KeyD')) { x += SPEED; moved = true; }

    if (moved) {
      // Clamp to world bounds (2000x2000)
      x = Math.max(30, Math.min(1970, x));
      y = Math.max(30, Math.min(1970, y));

      posRef.current = { x, y };
      dispatch({ type: 'UPDATE_SELF_POSITION', payload: { x, y } });

      // Throttled emit to server
      const now = Date.now();
      if (now - lastEmitRef.current >= EMIT_INTERVAL) {
        sendPosition(x, y);
        lastEmitRef.current = now;
      }
    }

    rafRef.current = requestAnimationFrame(gameLoop);
  }, [dispatch, sendPosition]);

  // Key listeners
  useEffect(() => {
    if (state.phase !== 'playing') return;

    const onKeyDown = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
        e.preventDefault();
        keysRef.current.add(e.code);
      }
    };

    const onKeyUp = (e) => {
      keysRef.current.delete(e.code);
      // Emit final position on key release
      if (keysRef.current.size === 0) {
        sendPosition(posRef.current.x, posRef.current.y);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    rafRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [state.phase, gameLoop, sendPosition]);

  return posRef;
}
