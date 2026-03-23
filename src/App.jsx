import { useState, useEffect, useCallback } from 'react';
import { usePeer } from './hooks/usePeer';
import { Connection } from './components/Connection';
import { Game } from './components/Game';

export default function App() {
  const [urlParams, setUrlParams] = useState({});
  const [peerState, setPeerState] = useState(null);
  const [localPlayer, setLocalPlayer] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    console.log('[App] URL room param:', room);
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
    onData 
  } = usePeer(urlParams.room);

  useEffect(() => {
    if (isHost !== undefined && connected) {
      setLocalPlayer(isHost ? 'p1' : 'p2');
    }
  }, [isHost, connected]);

  useEffect(() => {
    if (connected) {
      onData((data) => {
        if (data.type === 'stateUpdate') {
          setPeerState(data.state);
        }
      });
    }
  }, [connected, onData]);

  const handleStateChange = useCallback((newState) => {
    if (connected) {
      sendData({
        type: 'stateUpdate',
        state: newState,
      });
    }
  }, [connected, sendData]);

  const handleStartGame = useCallback(() => {
    setGameStarted(true);
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

  if (!gameStarted && !peerState) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Connection
          peerId={peerId}
          connected={connected}
          isHost={localPlayer === 'p1'}
          onStartGame={handleStartGame}
        />
      </div>
    );
  }

  const effectiveState = peerState || {
    gameState: 'idle',
    p1: { health: 15, isTouching: false, isPinned: false, escapeTaps: 0, wins: 0 },
    p2: { health: 15, isTouching: false, isPinned: false, escapeTaps: 0, wins: 0 },
    winner: null,
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Game
        localPlayer={localPlayer}
        peerState={peerState}
        onStateChange={handleStateChange}
        isHost={localPlayer === 'p1'}
      />
    </div>
  );
}