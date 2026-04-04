import { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';

const STATUS_OPTIONS = [
  { value: 'available', label: '🟢 Available', color: '#4ECDC4' },
  { value: 'busy', label: '🔴 Busy', color: '#FF6B6B' },
  { value: 'away', label: '🟡 Away', color: '#F7DC6F' },
];

export default function HUD({ setStatus }) {
  const { state, dispatch } = useGame();
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const playerCount = Object.keys(state.players).length;
  const currentStatus = state.self?.status || 'available';
  const statusInfo = STATUS_OPTIONS.find(s => s.value === currentStatus);

  const handleStatusChange = (status) => {
    setStatus(status);
    dispatch({ type: 'UPDATE_SELF_STATUS', payload: status });
    setShowStatusMenu(false);
  };

  useEffect(() => {
    if (!showStatusMenu) return;
    const close = () => setShowStatusMenu(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [showStatusMenu]);

  return (
    <>
      <div className="hud">
        <div className="hud-badge glass">
          <span className="dot" />
          <span>{playerCount} online</span>
        </div>
        {state.self && (
          <div
            className="hud-badge glass"
            style={{ cursor: 'pointer', position: 'relative' }}
            onClick={(e) => { e.stopPropagation(); setShowStatusMenu(!showStatusMenu); }}
          >
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: statusInfo?.color || '#4ECDC4',
              display: 'inline-block', flexShrink: 0,
            }} />
            🎮 {state.self.name}
            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginLeft: 4 }}>▼</span>

            {showStatusMenu && (
              <div className="status-dropdown glass" onClick={e => e.stopPropagation()}>
                {STATUS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    className={`status-option ${currentStatus === opt.value ? 'active' : ''}`}
                    onClick={() => handleStatusChange(opt.value)}
                  >
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: opt.color, display: 'inline-block',
                    }} />
                    {opt.label.split(' ')[1]}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {state.nearbyUsers.length > 0 && (
          <div className="hud-badge glass" style={{ color: '#4ECDC4' }}>
            🔗 {state.nearbyUsers.length} connected
          </div>
        )}
      </div>

      <div className="controls-hint glass">
        <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or <kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> to move
      </div>

      {state.toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </>
  );
}

function Toast({ toast }) {
  const { dispatch } = useGame();

  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch({ type: 'REMOVE_TOAST', payload: toast.id });
    }, 3000);
    return () => clearTimeout(timer);
  }, [toast.id, dispatch]);

  return (
    <div className="connection-toast glass" style={{
      color: toast.type === 'connect' ? '#4ECDC4' : '#FF6B6B',
    }}>
      {toast.type === 'connect' ? '🔗' : '🔌'} {toast.text}
    </div>
  );
}
