import { GameProvider, useGame } from './context/GameContext';
import { useSocket } from './hooks/useSocket';
import { useMovement } from './hooks/useMovement';
import Canvas from './components/Canvas';
import JoinScreen from './components/JoinScreen';
import ChatPanel from './components/ChatPanel';
import HUD from './components/HUD';
import './index.css';

function GameWorld() {
  const { state } = useGame();
  const { join, sendPosition, sendMessage, setStatus, sendTyping, createGroup, leaveGroup } = useSocket();
  useMovement(sendPosition);

  if (state.phase === 'join') {
    return <JoinScreen onJoin={join} />;
  }

  return (
    <>
      <Canvas />
      <HUD setStatus={setStatus} />
      <ChatPanel
        sendMessage={sendMessage}
        sendTyping={sendTyping}
        createGroup={createGroup}
        leaveGroup={leaveGroup}
      />
    </>
  );
}

export default function App() {
  return (
    <GameProvider>
      <GameWorld />
    </GameProvider>
  );
}
