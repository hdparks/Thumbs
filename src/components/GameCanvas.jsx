import { useRef, useEffect, useCallback } from 'react';
import { createGameEngine, createInput } from '../engine/gameEngine';
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
  const engineRef = useRef(null);
  const networkLayerRef = useRef(null);
  const rollbackManagerRef = useRef(null);
  const inputHandlerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastFrameTimeRef = useRef(0);
  const statsRef = useRef({
    localFrame: 0,
    remoteFrame: 0,
    rollbackCount: 0,
    lastRollbackFrame: null,
    inputBufferDepth: 0,
    latency: 0,
    gameState: 'idle',
  });

  const isP1 = localPlayer === 'p1';

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    engineRef.current = createGameEngine();

    networkLayerRef.current = createNetworkLayer(
      localPlayer,
      sendData,
      (player, frame, input) => {
        if (input && input.type === 'startGame') {
          engineRef.current.start();
          rollbackManagerRef.current.reset();
          rollbackManagerRef.current.setFrame(0);
          return;
        }

        if (input && input.type === 'resetGame') {
          engineRef.current.reset();
          rollbackManagerRef.current.reset();
          rollbackManagerRef.current.setFrame(0);
          return;
        }

        if (!rollbackManagerRef.current || !engineRef.current) return;

        const rolledBack = rollbackManagerRef.current.checkAndRollback(
          player,
          frame,
          input,
          engineRef.current,
          networkLayerRef.current
        );

        if (rolledBack) {
          statsRef.current.rollbackCount++;
          statsRef.current.lastRollbackFrame = frame;
        }
      }
    );

    rollbackManagerRef.current = createRollbackManager(engineRef.current);

    inputHandlerRef.current = createInputHandler(localPlayer, (input) => {
      const currentFrame = rollbackManagerRef.current.getCurrentFrame();
      networkLayerRef.current.sendInput(currentFrame, input);
      
      if (localPlayer === 'p1') {
        engineRef.current.applyP1Input(input);
      } else {
        engineRef.current.applyP2Input(input);
      }
    });

    let lastTime = performance.now();
    const PHYSICS_STEP = 16;

    function gameLoop(timestamp) {
      const delta = timestamp - lastTime;

      if (delta >= PHYSICS_STEP) {
        const currentFrame = rollbackManagerRef.current.getCurrentFrame();

        const localInput = inputHandlerRef.current.getCurrentInput();
        const remotePlayerId = localPlayer === 'p1' ? 'p2' : 'p1';
        const remoteInput = networkLayerRef.current.getInput(remotePlayerId, currentFrame);

        engineRef.current.update(localInput, remoteInput);

        const state = engineRef.current.getState();
        rollbackManagerRef.current.saveState(currentFrame, state);
        rollbackManagerRef.current.advanceFrame();

        const newFrame = rollbackManagerRef.current.getCurrentFrame();
        networkLayerRef.current.sendInput(newFrame, localInput);
        networkLayerRef.current.pruneOldInputs(20);

        const remoteFrame = networkLayerRef.current.getConfirmedFrame(remotePlayerId);
        statsRef.current.localFrame = newFrame;
        statsRef.current.remoteFrame = remoteFrame;
        statsRef.current.inputBufferDepth = networkLayerRef.current.getInputBufferDepth(remotePlayerId);
        statsRef.current.latency = networkLayerRef.current.getEstimatedLatency();
        statsRef.current.gameState = state.gameState;

        if (onStateChange && connected) {
          onStateChange(state);
        }

        lastTime = timestamp;
      }

      const state = engineRef.current.getState();
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
    if (engineRef.current) {
      engineRef.current.start();
      rollbackManagerRef.current.reset();
      rollbackManagerRef.current.setFrame(0);
      if (networkLayerRef.current) {
        networkLayerRef.current.sendStartGame();
      }
    }
  }, []);

  const handleResetGame = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.reset();
      rollbackManagerRef.current.reset();
      rollbackManagerRef.current.setFrame(0);
      if (networkLayerRef.current) {
        networkLayerRef.current.sendResetGame();
      }
    }
  }, []);

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

      {localPlayer === 'p1' && connected && engineRef.current?.getState().gameState === 'idle' && (
        <button
          onClick={handleStartGame}
          className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded-lg text-xl transition-all hover:scale-105 shadow-[0_4px_0_rgb(21,128,61)] active:shadow-none active:translate-y-1"
        >
          START GAME
        </button>
      )}

      {engineRef.current?.getState().gameState === 'p1Win' && (
        <button
          onClick={handleResetGame}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-lg text-xl"
        >
          PLAY AGAIN
        </button>
      )}

      {engineRef.current?.getState().gameState === 'p2Win' && (
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