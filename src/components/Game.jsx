import { useState, useEffect, useRef, useCallback } from 'react';
import { HealthBar } from './HealthBar';
import { Thumb } from './Thumb';

const TICK_RATE = 100;
const TICK_HEALTH_CHANGE = TICK_RATE / 1000;
const STARTING_HEALTH = 15;
const MAX_HEALTH = 20;
const ESCAPE_TAPS_NEEDED = 5;

const initialState = {
  gameState: 'idle',
  p1: {
    health: STARTING_HEALTH,
    isTouching: false,
    isPinned: false,
    escapeTaps: 0,
    wins: 0,
  },
  p2: {
    health: STARTING_HEALTH,
    isTouching: false,
    isPinned: false,
    escapeTaps: 0,
    wins: 0,
  },
  winner: null,
};

export function Game({ 
  localPlayer, 
  peerState, 
  onStateChange, 
  isHost 
}) {
  const [gameState, setGameState] = useState(initialState);
  const [myEscapeTaps, setMyEscapeTaps] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const tickIntervalRef = useRef(null);
  const autoPlayIntervalRef = useRef(null);
  const escapeTapsRef = useRef(0);
  const autoPlayTouchingRef = useRef(false);
  const gameStateRef = useRef(gameState);

  const syncState = useCallback((newState) => {
    setGameState(newState);
    gameStateRef.current = newState;
    onStateChange(newState);
  }, [onStateChange]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const attemptEscape = useCallback((tapCount) => {
    const currentState = gameState;
    const myKey = localPlayer;
    const opponentKey = localPlayer === 'p1' ? 'p2' : 'p1';
    
    if (currentState[myKey].isPinned) {
      escapeTapsRef.current = tapCount;
      setMyEscapeTaps(tapCount);
      
      if (tapCount >= ESCAPE_TAPS_NEEDED) {
        const newState = {
          ...currentState,
          [myKey]: {
            ...currentState[myKey],
            isPinned: false,
            escapeTaps: 0,
          },
          [opponentKey]: {
            ...currentState[opponentKey],
            isTouching: false,
          },
        };
        escapeTapsRef.current = 0;
        setMyEscapeTaps(0);
        syncState(newState);
      }
    }
  }, [gameState, localPlayer, syncState]);

  const gameTick = useCallback(() => {
    const currentState = gameState;
    
    if (currentState.gameState !== 'playing') return;

    const p1Touching = currentState.p1.isTouching;
    const p2Touching = currentState.p2.isTouching;
    const p1Pinned = currentState.p1.isPinned;
    const p2Pinned = currentState.p2.isPinned;

    const newState = { ...currentState };

    if (p1Touching && !p1Pinned) {
      newState.p1 = {
        ...newState.p1,
        health: Math.min(MAX_HEALTH, newState.p1.health + TICK_HEALTH_CHANGE),
      };
    }

    if (p2Touching && !p2Pinned) {
      newState.p2 = {
        ...newState.p2,
        health: Math.min(MAX_HEALTH, newState.p2.health + TICK_HEALTH_CHANGE),
      };
    }

    if (p1Touching && !p2Touching && !p1Pinned && !p2Pinned) {
      newState.p2 = { ...newState.p2, isPinned: true, isTouching: false };
      newState.p2.escapeTaps = 0;
      escapeTapsRef.current = 0;
      setMyEscapeTaps(0);
    }

    if (p2Touching && !p1Touching && !p1Pinned && !p2Pinned) {
      newState.p1 = { ...newState.p1, isPinned: true, isTouching: false };
      newState.p1.escapeTaps = 0;
      escapeTapsRef.current = 0;
      setMyEscapeTaps(0);
    }

    if (p1Touching && p2Touching && !p1Pinned && !p2Pinned) {
      const laterP1 = p2Pinned && !p1Pinned;
      const laterP2 = p1Pinned && !p2Pinned;
      
      if (laterP1 && !currentState.p1.isPinned) {
        newState.p1 = { ...newState.p1, isPinned: false };
        newState.p2 = { ...newState.p2, isPinned: true, isTouching: false };
        newState.p2.escapeTaps = 0;
        escapeTapsRef.current = 0;
        setMyEscapeTaps(0);
      } else if (laterP2 && !currentState.p2.isPinned) {
        newState.p2 = { ...newState.p2, isPinned: false };
        newState.p1 = { ...newState.p1, isPinned: true, isTouching: false };
        newState.p1.escapeTaps = 0;
        escapeTapsRef.current = 0;
        setMyEscapeTaps(0);
      }
    }

    if (p2Pinned && p1Touching) {
      newState.p1 = {
        ...newState.p1,
        health: Math.min(MAX_HEALTH, newState.p1.health + TICK_HEALTH_CHANGE),
      };
      newState.p2 = {
        ...newState.p2,
        health: Math.max(0, newState.p2.health - TICK_HEALTH_CHANGE),
      };
    }

    if (p1Pinned && p2Touching) {
      newState.p2 = {
        ...newState.p2,
        health: Math.min(MAX_HEALTH, newState.p2.health + TICK_HEALTH_CHANGE),
      };
      newState.p1 = {
        ...newState.p1,
        health: Math.max(0, newState.p1.health - TICK_HEALTH_CHANGE),
      };
    }

    if (newState.p1.health <= 0) {
      newState.gameState = 'p2Win';
      newState.winner = 'p2';
      newState.p2.wins += 1;
    } else if (newState.p2.health <= 0) {
      newState.gameState = 'p1Win';
      newState.winner = 'p1';
      newState.p1.wins += 1;
    }

    syncState(newState);
  }, [gameState, syncState]);

  useEffect(() => {
    if (peerState && localPlayer) {
      setGameState(peerState);
    }
  }, [peerState, localPlayer]);

  useEffect(() => {
    const currentGameState = gameStateRef.current;
    if (!autoPlay || currentGameState.gameState !== 'playing') {
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current);
        autoPlayIntervalRef.current = null;
      }
      return;
    }

    autoPlayIntervalRef.current = setInterval(() => {
      const gs = gameStateRef.current;
      autoPlayTouchingRef.current = !autoPlayTouchingRef.current;
      const key = localPlayer;
      const newState = {
        ...gs,
        [key]: {
          ...gs[key],
          isTouching: autoPlayTouchingRef.current,
        },
      };
      if (!autoPlayTouchingRef.current && gs[key].isPinned) {
        escapeTapsRef.current = 0;
        setMyEscapeTaps(0);
      }
      syncState(newState);
    }, 1000);

    return () => {
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current);
      }
    };
  }, [autoPlay, localPlayer, syncState]);

  useEffect(() => {
    if (gameState.gameState === 'playing') {
      tickIntervalRef.current = setInterval(gameTick, TICK_RATE);
    } else {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
      }
    }

    return () => {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
      }
    };
  }, [gameState.gameState, gameTick]);

  const handleStartGame = useCallback(() => {
    if (isHost) {
      const newState = {
        ...initialState,
        gameState: 'playing',
      };
      syncState(newState);
    }
  }, [isHost, syncState]);

  const handleReset = useCallback(() => {
    if (isHost) {
      const newState = {
        ...initialState,
        gameState: 'playing',
        p1: { ...initialState.p1, wins: gameState.p1.wins },
        p2: { ...initialState.p2, wins: gameState.p2.wins },
      };
      syncState(newState);
    }
  }, [isHost, gameState, syncState]);

  const handleTouchStart = useCallback(() => {
    if (gameState.gameState !== 'playing') return;
    
    const key = localPlayer;
    const newState = {
      ...gameState,
      [key]: {
        ...gameState[key],
        isTouching: true,
      },
    };
    syncState(newState);
  }, [gameState, localPlayer, syncState]);

  const handleTouchEnd = useCallback(() => {
    if (gameState.gameState !== 'playing') return;
    
    const key = localPlayer;
    const newState = {
      ...gameState,
      [key]: {
        ...gameState[key],
        isTouching: false,
      },
    };
    
    if (gameState[key].isPinned) {
      escapeTapsRef.current = 0;
      setMyEscapeTaps(0);
    }
    
    syncState(newState);
  }, [gameState, localPlayer, syncState]);

  const myPlayerState = gameState[localPlayer];
  const opponentKey = localPlayer === 'p1' ? 'p2' : 'p1';
  const opponentState = gameState[opponentKey];

  if (gameState.gameState === 'idle') {
    return (
      <div className="flex flex-col items-center gap-8 p-4">
        <div className="text-center">
          <h2 className="text-4xl font-black text-white mb-4">Ready!</h2>
          <p className="text-gray-400">Waiting for host to start...</p>
        </div>
        {isHost && (
          <button
            onClick={handleStartGame}
            className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded-lg text-xl transition-all hover:scale-105 shadow-[0_4px_0_rgb(21,128,61)] active:shadow-none active:translate-y-1"
          >
            START GAME
          </button>
        )}
        <button
          onClick={() => setAutoPlay(!autoPlay)}
          className={`px-4 py-2 rounded font-bold text-sm ${
            autoPlay 
              ? 'bg-yellow-500 text-black' 
              : 'bg-gray-600 text-white'
          }`}
        >
          🤖 Auto Play: {autoPlay ? 'ON' : 'OFF'}
        </button>

        <div className="flex gap-8">
          <div className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded-full transition-all ${
              gameState.p1.isTouching 
                ? 'bg-green-400 shadow-[0_0_15px_rgba(74,222,128,0.8)] scale-110' 
                : 'bg-gray-700'
            }`} />
            <span className="text-white text-sm">P1 {gameState.p1.isTouching ? 'Touching' : ''}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded-full transition-all ${
              gameState.p2.isTouching 
                ? 'bg-green-400 shadow-[0_0_15px_rgba(74,222,128,0.8)] scale-110' 
                : 'bg-gray-700'
            }`} />
            <span className="text-white text-sm">P2 {gameState.p2.isTouching ? 'Touching' : ''}</span>
          </div>
        </div>
      </div>
    );
  }

  const isGameOver = gameState.gameState === 'p1Win' || gameState.gameState === 'p2Win';
  const winner = gameState.winner;
  const iWon = winner === localPlayer;

  return (
    <div className="flex flex-col items-center gap-8 p-4">
      <div className="text-center">
        <h2 className="text-4xl font-black text-white mb-2">
          {isGameOver 
            ? iWon 
              ? 'YOU WIN!' 
              : 'YOU LOSE!'
            : 'THUMB WAR!'
          }
        </h2>
        <div className="flex gap-8 justify-center text-white">
          <span className="text-xl">P1 Wins: {gameState.p1.wins}</span>
          <span className="text-xl">P2 Wins: {gameState.p2.wins}</span>
        </div>
      </div>

      <div className="flex gap-8">
        <div className="flex items-center gap-2">
          <div className={`w-4 h-4 rounded-full transition-all ${
            gameState.p1.isTouching 
              ? 'bg-green-400 shadow-[0_0_15px_rgba(74,222,128,0.8)] scale-110' 
              : 'bg-gray-700'
          }`} />
          <span className="text-white text-sm">P1 {gameState.p1.isTouching ? 'Touching' : ''}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-4 h-4 rounded-full transition-all ${
            gameState.p2.isTouching 
              ? 'bg-green-400 shadow-[0_0_15px_rgba(74,222,128,0.8)] scale-110' 
              : 'bg-gray-700'
          }`} />
          <span className="text-white text-sm">P2 {gameState.p2.isTouching ? 'Touching' : ''}</span>
        </div>
      </div>

      <div className="flex gap-12 items-center">
        <div className="flex flex-col items-center gap-4">
          <HealthBar 
            health={gameState.p1.health} 
            maxHealth={MAX_HEALTH} 
            player="p1"
          />
          {localPlayer === 'p1' && (
            <Thumb
              isTouching={myPlayerState.isTouching}
              isPinned={myPlayerState.isPinned}
              escapeTaps={myEscapeTaps}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onEscapeTap={attemptEscape}
              disabled={gameState.gameState !== 'playing'}
            />
          )}
        </div>

        <div className="flex flex-col items-center gap-4">
          <HealthBar 
            health={gameState.p2.health} 
            maxHealth={MAX_HEALTH} 
            player="p2"
          />
          {localPlayer === 'p2' && (
            <Thumb
              isTouching={myPlayerState.isTouching}
              isPinned={myPlayerState.isPinned}
              escapeTaps={myEscapeTaps}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onEscapeTap={attemptEscape}
              disabled={gameState.gameState !== 'playing'}
            />
          )}
        </div>
      </div>

      {localPlayer !== 'p1' && opponentState && (
        <div className="opacity-50">
          <p className="text-white text-center mb-2">Opponent (P1)</p>
          <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all ${
            opponentState.isTouching 
              ? 'bg-green-600 shadow-[0_0_30px_rgba(34,197,94,0.6)]' 
              : opponentState.isPinned
                ? 'bg-red-600 shadow-[0_0_30px_rgba(220,38,38,0.6)]'
                : 'bg-gray-600'
          }`}>
            <span className="text-white text-sm">
              {opponentState.isTouching ? 'TOUCHING' : opponentState.isPinned ? 'PINNED!' : 'Waiting'}
            </span>
          </div>
        </div>
      )}

      {localPlayer !== 'p2' && opponentState && (
        <div className="opacity-50">
          <p className="text-white text-center mb-2">Opponent (P2)</p>
          <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all ${
            gameState.p2.isTouching 
              ? 'bg-green-600 shadow-[0_0_30px_rgba(34,197,94,0.6)]' 
              : gameState.p2.isPinned
                ? 'bg-red-600 shadow-[0_0_30px_rgba(220,38,38,0.6)]'
                : 'bg-gray-600'
          }`}>
            <span className="text-white text-sm">
              {gameState.p2.isTouching ? 'TOUCHING' : gameState.p2.isPinned ? 'PINNED!' : 'Waiting'}
            </span>
          </div>
        </div>
      )}

      {isGameOver && isHost && (
        <button
          onClick={handleReset}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-lg text-xl"
        >
          PLAY AGAIN
        </button>
      )}
      <button
        onClick={() => setAutoPlay(!autoPlay)}
        className={`px-4 py-2 rounded font-bold text-sm ${
          autoPlay 
            ? 'bg-yellow-500 text-black' 
            : 'bg-gray-600 text-white'
        }`}
      >
        🤖 Auto Play: {autoPlay ? 'ON' : 'OFF'}
      </button>
    </div>
  );
}