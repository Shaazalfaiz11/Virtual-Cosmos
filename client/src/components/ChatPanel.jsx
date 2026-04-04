import { useState, useRef, useEffect, useCallback } from 'react';
import { useGame } from '../context/GameContext';

export default function ChatPanel({ sendMessage, sendTyping, createGroup, leaveGroup }) {
  const { state, dispatch } = useGame();
  const [text, setText] = useState('');
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [imagePreview, setImagePreview] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const { nearbyUsers, activeRoom, messages, self, typingUsers, groups } = state;
  const hasNearby = nearbyUsers.length > 0;
  const hasGroups = Object.keys(groups).length > 0;
  const isVisible = hasNearby || hasGroups;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeRoom]);

  const stopPropagation = (e) => e.stopPropagation();

  // Typing indicator
  const handleInputChange = useCallback((e) => {
    const val = e.target.value;
    setText(val);
    if (activeRoom && val.length > 0) {
      sendTyping(activeRoom, true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        sendTyping(activeRoom, false);
      }, 2000);
    } else if (activeRoom) {
      sendTyping(activeRoom, false);
    }
  }, [activeRoom, sendTyping]);

  // Send text message
  const handleSend = (e) => {
    e.preventDefault();
    if (!activeRoom) return;

    // If there's an image preview, send image
    if (imagePreview) {
      sendMessage(activeRoom, '', 'image', imagePreview);
      setImagePreview(null);
      return;
    }

    if (!text.trim()) return;
    sendMessage(activeRoom, text, 'text');
    setText('');
    if (activeRoom) sendTyping(activeRoom, false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    inputRef.current?.focus();
  };

  // Image upload handler
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      alert('Image must be under 4MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target.result); // base64 data URL
    };
    reader.readAsDataURL(file);

    // Reset file input
    e.target.value = '';
  };

  const cancelImage = () => {
    setImagePreview(null);
  };

  // Group chat creation
  const handleCreateGroup = () => {
    if (!groupName.trim() || selectedMembers.length === 0) return;
    createGroup(groupName.trim(), selectedMembers);
    setShowGroupModal(false);
    setGroupName('');
    setSelectedMembers([]);
  };

  const toggleMember = (id) => {
    setSelectedMembers(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const switchTab = (roomId) => {
    dispatch({ type: 'SET_ACTIVE_ROOM', payload: roomId });
  };

  if (!isVisible) return null;

  const roomMessages = activeRoom ? (messages[activeRoom] || []) : [];
  const activeChatUser = nearbyUsers.find(u => u.roomId === activeRoom);
  const activeGroup = groups[activeRoom];
  const typingInfo = activeRoom ? typingUsers[activeRoom] : null;

  // Figure out header text
  let headerLabel;
  if (activeGroup) {
    headerLabel = `${activeGroup.name} (${activeGroup.members.length})`;
  } else if (activeChatUser) {
    headerLabel = `with ${activeChatUser.name}`;
  } else {
    headerLabel = `(${nearbyUsers.length} nearby)`;
  }

  return (
    <div className="chat-panel glass chat-enter">
      {/* Header */}
      <div className="chat-header">
        <h3>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: activeGroup ? '#BB8FCE' : '#4ECDC4',
            display: 'inline-block',
          }} />
          {activeGroup ? '👥' : '💬'} Chat
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
            {' '}{headerLabel}
          </span>
        </h3>
        <div style={{ display: 'flex', gap: 6 }}>
          {/* Create group button — shows when 2+ nearby users */}
          {nearbyUsers.length >= 2 && (
            <button
              className="group-create-btn"
              onClick={() => setShowGroupModal(true)}
              title="Create group chat"
            >
              👥+
            </button>
          )}
          {/* Leave group button */}
          {activeGroup && (
            <button
              className="group-leave-btn"
              onClick={() => leaveGroup(activeRoom)}
              title="Leave group"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Tabs — DMs + Groups */}
      {(nearbyUsers.length > 1 || hasGroups) && (
        <div className="chat-tabs">
          {nearbyUsers.map((u) => (
            <button
              key={u.roomId}
              className={`chat-tab ${activeRoom === u.roomId ? 'active' : ''}`}
              onClick={() => switchTab(u.roomId)}
            >
              {u.name}
            </button>
          ))}
          {Object.values(groups).map((g) => (
            <button
              key={g.id}
              className={`chat-tab group-tab ${activeRoom === g.id ? 'active' : ''}`}
              onClick={() => switchTab(g.id)}
            >
              👥 {g.name}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="chat-messages">
        {roomMessages.length === 0 && (
          <div style={{
            textAlign: 'center', color: 'var(--text-secondary)',
            fontSize: '0.8rem', marginTop: 40,
          }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>{activeGroup ? '👥' : '👋'}</div>
            <p>{activeGroup ? 'Group chat created!' : "You're connected! Start chatting."}</p>
            <p style={{ fontSize: '0.72rem', marginTop: 4 }}>
              {activeGroup
                ? `Members: ${activeGroup.members.map(m => m.name).join(', ')}`
                : `This is the beginning of your chat history with ${activeChatUser?.name || 'this user'}.`
              }
            </p>
          </div>
        )}
        {roomMessages.map((msg, i) => {
          const isSelf = msg.from === self?.id;
          return (
            <div key={i} className={`chat-msg ${isSelf ? 'self' : 'other'}`}>
              {!isSelf && <div className="msg-name">{msg.fromName}</div>}
              {/* Image message */}
              {msg.type === 'image' && msg.imageData && (
                <img
                  src={msg.imageData}
                  alt="Shared image"
                  className="chat-image"
                  onClick={() => window.open(msg.imageData, '_blank')}
                />
              )}
              {/* Text message (skip if image-only) */}
              {(msg.type !== 'image') && <div>{msg.text}</div>}
              <div className="msg-time">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          );
        })}

        {typingInfo && (
          <div className="typing-indicator">
            <span className="typing-dots">
              <span className="dot-1">•</span>
              <span className="dot-2">•</span>
              <span className="dot-3">•</span>
            </span>
            {typingInfo.fromName} is typing
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Image preview */}
      {imagePreview && (
        <div className="image-preview-bar">
          <img src={imagePreview} alt="Preview" className="image-preview-thumb" />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Ready to send</span>
          <button className="image-cancel-btn" onClick={cancelImage}>✕</button>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="chat-input-area">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleImageSelect}
        />
        {/* Image upload button */}
        <button
          type="button"
          className="image-upload-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Upload image"
        >
          📷
        </button>
        <input
          ref={inputRef}
          type="text"
          className="chat-input"
          placeholder={imagePreview ? 'Press Send to share image...' : 'Type a message...'}
          value={text}
          onChange={handleInputChange}
          onKeyDown={stopPropagation}
          onKeyUp={stopPropagation}
          maxLength={500}
          autoComplete="off"
          disabled={!!imagePreview}
        />
        <button type="submit" className="chat-send-btn">
          {imagePreview ? '📤' : 'Send'}
        </button>
      </form>

      {/* Group creation modal */}
      {showGroupModal && (
        <div className="group-modal-overlay" onClick={() => setShowGroupModal(false)}>
          <div className="group-modal glass" onClick={e => e.stopPropagation()}>
            <h4>Create Group Chat</h4>
            <input
              type="text"
              className="group-name-input"
              placeholder="Group name..."
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              onKeyDown={stopPropagation}
              onKeyUp={stopPropagation}
              maxLength={30}
              autoFocus
            />
            <div className="group-member-list">
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                Select members ({selectedMembers.length} selected)
              </p>
              {nearbyUsers.map(u => (
                <label key={u.id} className="group-member-item">
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(u.id)}
                    onChange={() => toggleMember(u.id)}
                  />
                  <span>{u.name}</span>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button
                className="group-cancel-btn"
                onClick={() => setShowGroupModal(false)}
              >
                Cancel
              </button>
              <button
                className="group-confirm-btn"
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || selectedMembers.length === 0}
              >
                Create 👥
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
