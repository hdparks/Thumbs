import { useRef, useEffect, useCallback } from 'react';
import { createGameEngine, createInput, createInitialState } from '../engine/gameEngine';
import { createNetworkLayer } from '../engine/networkLayer';
import { createRollbackManager } from '../engine/rollbackManager';
import { createInputHandler } from '../engine/inputHandler';
import { CANVAS_WIDTH, CANVAS_HEIGHT, render, renderDebug } from '../engine/render';

export function GameCanvas({
  localPlayer,
  peerState,
  connected,
  sendData,
  onStateChange,
}) {
  const canvasRef = useRef(null);
  const confirmedEngineRef = useRef(null);
  const predictedEngineRef = useRef(null);
  const networkLayerRef = useRef(null);
  const rollbackManagerRef = useRef(null);
  const inputHandlerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastFrameTimeRef = useRef(0);
  const confirmedFrameRef = useRef(-1);
  const predictedInputsRef = useRef({ p1: null, p2: null });
  const statsRef = useRef({
    localFrame: 0,
    remoteFrame: 0,
    rollbackCount: 0,
    lastRollbackFrame: null,
    inputBufferDepth: 0,
    latency: 0,
    gameState: 'idle',
    confirmedFrame: -1,
    predictedFrame: -1,
  });

  const isP1 = localPlayer === 'p1';

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    confirmedEngineRef.current = createGameEngine();
    predictedEngineRef.current = createGameEngine();

    networkLayerRef.current = createNetworkLayer(
      localPlayer,
      sendData,
      (player, frame, input) => {
        if (input && input.type === 'startGame') {
          const initial = createInitialState();
          confirmedEngineRef.current.restoreState(initial);
          predictedEngineRef.current.restoreState(initial);
          rollbackManagerRef.current.reset();
          rollbackManagerRef.current.setFrame(0);
          confirmedFrameRef.current = -1;
          predictedInputsRef.current = { p1: null, p2: null };
          return;
        }

        if (input && input.type === 'resetGame') {
          const initial = createInitialState();
          confirmedEngineRef.current.restoreState(initial);
          predictedEngineRef.current.restoreState(initial);
          rollbackManagerRef.current.reset();
          rollbackManagerRef.current.setFrame(0);
          confirmedFrameRef.current = -1;
          predictedInputsRef.current = { p1: null, p2: null };
          return;
        }

        if (!rollbackManagerRef.current || !confirmedEngineRef.current) return;

        const remotePlayerId = player;
        const confirmedFrame = confirmedFrameRef.current;
        
        if (frame > confirmedFrame) {
          confirmedEngineRef.current.restoreState(
            rollbackManagerRef.current.getSavedState(frame - 1) || rollbackManagerRef.current.getSavedState(confirmedFrame)
          );
          
          const startFrame = Math.max(confirmedFrame + 1, 0);
          for (let f = startFrame; f <= frame; f++) {
            const p1Input = networkLayerRef.current.getInput('p1', f);
            const p2Input = networkLayerRef.current.getInput('p2', f);
            confirmedEngineRef.current.update(p1Input, p2Input);
          }
          
          confirmedFrameRef.current = frame;
          
          if (predictedEngineRef.current) {
            predictedEngineRef.current.restoreState(confirmedEngineRef.current.getState());
          }
        }
      }
    );

    rollbackManagerRef.current = createRollbackManager(confirmedEngineRef.current);

    inputHandlerRef.current = createInputHandler(localPlayer, (input) => {
      const currentFrame = rollbackManagerRef.current.getCurrentFrame();
      networkLayerRef.current.sendInput(currentFrame, input);
      
      predictedInputsRef.current[localPlayer] = input;
    });

    let lastTime = performance.now();
    const PHYSICS_STEP = 16;

    function gameLoop(timestamp) {
      const delta = timestamp - lastTime;

      if (delta >= PHYSICS_STEP) {
        const currentFrame = rollbackManagerRef.current.getCurrentFrame();

        const localInput = inputHandlerRef.current.getCurrentInput();
        const remotePlayerId = localPlayer === 'p1' ? 'p2' : 'p1';
        
        const confirmedLocalInput = networkLayerRef.current.getInput(localPlayer, currentFrame);
        const confirmedRemoteInput = networkLayerRef.current.getInput(remotePlayerId, currentFrame);

        confirmedEngineRef.current.update(confirmedLocalInput, confirmedRemoteInput);

        const confirmedState = confirmedEngineRef.current.getState();
        rollbackManagerRef.current.saveState(currentFrame, confirmedState);
        
        if (confirmedFrameRef.current < currentFrame) {
          confirmedFrameRef.current = currentFrame;
        }

        const predictedLocalInput = inputHandlerRef.current.getCurrentInput();
        const predictedRemoteInput = networkLayerRef.current.getInput(remotePlayerId, currentFrame);
        
        if (predictedEngineRef.current) {
          predictedEngineRef.current.update(predictedLocalInput, predictedRemoteInput);
        }

        rollbackManagerRef.current.advanceFrame();

        const newFrame = rollbackManagerRef.current.getCurrentFrame();
        networkLayerRef.current.sendInput(newFrame, localInput);
        networkLayerRef.current.pruneOldInputs(20);

        const remoteFrame = networkLayerRef.current.getConfirmedFrame(remotePlayerId);
        statsRef.current.localFrame = newFrame;
        statsRef.current.remoteFrame = remoteFrame;
        statsRef.current.inputBufferDepth = networkLayerRef.current.getInputBufferDepth(remotePlayerId);
        statsRef.current.latency = networkLayerRef.current.getEstimatedLatency();
        statsRef.current.gameState = confirmedState.gameState;
        statsRef.current.confirmedFrame = confirmedFrameRef.current;
        statsRef.current.predictedFrame = newFrame;

        if (onStateChange && connected) {
          onStateChange(confirmedState);
        }

        lastTime = timestamp;
      }

      const state = predictedEngineRef.current 
        ? predictedEngineRef.current.getState() 
        : confirmedEngineRef.current.getState();
      render(ctx, state, localPlayer, connected);
      renderDebug(ctx, statsRef.current);

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    }

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [localPlayer, connected, sendData, onStateChange]);

  useEffect(() => {
    if (!peerState || !networkLayerRef.current) return;

    if (peerState.type === 'input') {
      networkLayerRef.current.receiveInput(peerState);
    }
    
    if (peerState.type === 'startGame') {
      networkLayerRef.current.receiveInput(peerState);
    }
    
    if (peerState.type === 'resetGame') {
      networkLayerRef.current.receiveInput(peerState);
    }
  }, [peerState]);

  const handlePointerDown = useCallback((e) => {
    if (!inputHandlerRef.current || !connected) return;
    e.preventDefault();
    inputHandlerRef.current.handlePointerDown();
  }, [connected]);

  const handlePointerUp = useCallback((e) => {
    if (!inputHandlerRef.current || !connected) return;
    e.preventDefault();
    inputHandlerRef.current.handlePointerUp();
  }, [connected]);

  const handlePointerLeave = useCallback((e) => {
    if (!inputHandlerRef.current || !connected) return;
    e.preventDefault();
    inputHandlerRef.current.handlePointerLeave();
  }, [connected]);

  const handleStartGame = useCallback(() => {
    if (confirmedEngineRef.current) {
      confirmedEngineRef.current.start();
      predictedEngineRef.current?.start();
      rollbackManagerRef.current.reset();
      rollbackManagerRef.current.setFrame(0);
      confirmedFrameRef.current = -1;
      predictedInputsRef.current = { p1: null, p2: null };
      if (networkLayerRef.current) {
        networkLayerRef.current.sendStartGame();
      }
    }
  }, []);

  const handleResetGame = useCallback(() => {
    if (confirmedEngineRef.current) {
      confirmedEngineRef.current.reset();
      predictedEngineRef.current?.reset();
      rollbackManagerRef.current.reset();
      rollbackManagerRef.current.setFrame(0);
      confirmedFrameRef.current = -1;
      predictedInputsRef.current = { p1: null, p2: null };
      if (networkLayerRef.current) {
        networkLayerRef.current.sendResetGame();
      }
    }
  }, []);

  const getGameState = () => {
    return confirmedEngineRef.current?.getState().gameState || 'idle';
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onPointerCancel={handlePointerUp}
        className="rounded-lg shadow-lg cursor-pointer touch-none"
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          touchAction: 'none',
        }}
      />

      {localPlayer === 'p1' && connected && getGameState() === 'idle' && (
        <button
          onClick={handleStartGame}
          className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded-lg text-xl transition-all hover:scale-105 shadow-[0_4px_0_rgb(21,128,61)] active:shadow-none active:translate-y-1"
        >
          START GAME
        </button>
      )}

      {getGameState() === 'p1Win' && (
        <button
          onClick={handleResetGame}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-lg text-xl"
        >
          PLAY AGAIN
        </button>
      )}

      {getGameState() === 'p2Win' && (
        <button
          onClick={handleResetGame}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-lg text-xl"
        >
          PLAY AGAIN
        </button>
      )}
    </div>
  );
}