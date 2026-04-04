import { useState } from 'react';

export default function JoinScreen({ onJoin }) {
  const [name, setName] = useState('');
  const [joining, setJoining] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim().length < 2) return;
    setJoining(true);
    onJoin(name.trim());
  };

  return (
    <div className="join-screen">
      {/* Floating particles background */}
      <div style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}>
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: `${2 + Math.random() * 4}px`,
              height: `${2 + Math.random() * 4}px`,
              borderRadius: '50%',
              background: `rgba(78, 205, 196, ${0.1 + Math.random() * 0.2})`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.3; }
          50% { transform: translateY(-20px) scale(1.2); opacity: 0.6; }
        }
      `}</style>

      <form onSubmit={handleSubmit}>
        <div className="join-card glass">
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #4ECDC4, #45B7D1)',
            margin: '0 auto 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            boxShadow: '0 8px 32px rgba(78, 205, 196, 0.3)',
          }}>
            🌌
          </div>
          <h1>Virtual Cosmos</h1>
          <p>Enter your name to join the virtual space and connect with others nearby</p>
          <input
            type="text"
            className="join-input"
            placeholder="Your display name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            autoFocus
          />
          <button
            type="submit"
            className="join-btn"
            disabled={name.trim().length < 2 || joining}
          >
            {joining ? '✨ Entering Cosmos...' : '🚀 Enter Cosmos'}
          </button>
          <p style={{ marginTop: 16, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Use WASD or Arrow keys to move around
          </p>
        </div>
      </form>
    </div>
  );
}
