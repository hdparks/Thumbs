import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePeer } from './hooks/usePeer';
import { Connection } from './components/Connection';
import { GameCanvas } from './components/GameCanvas';

export default function App() {
  const [urlParams, setUrlParams] = useState({});
  const [localPlayer, setLocalPlayer] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    setUrlParams({
      room: room,
    });
  }, []);

  const { 
    peerId, 
    remotePeerId, 
    connected, 
    isHost, 
    sendData, 
    lastMessage 
  } = usePeer(urlParams.room);

  useEffect(() => {
    if (isHost !== undefined && connected) {
      setLocalPlayer(isHost ? 'p1' : 'p2');
    }
  }, [isHost, connected]);

  const handleStartGame = useCallback(() => {
    setGameStarted(true);
  }, []);

  const handleStateChange = useCallback((newState) => {
  }, []);

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Connection
          peerId={peerId || urlParams.room}
          connected={connected}
          isHost={urlParams.room === null || urlParams.room === '' || urlParams.room === peerId}
          onStartGame={handleStartGame}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <GameCanvas
        localPlayer={localPlayer}
        peerState={lastMessage}
        connected={connected}
        sendData={sendData}
        onStateChange={handleStateChange}
      />
    </div>
  );
}