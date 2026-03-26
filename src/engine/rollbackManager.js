import { serializeState, deserializeState, createInput, inputsEqual } from './gameEngine.js';

const STATE_BUFFER_SIZE = 15;

function createRollbackManager(gameEngine) {
  const stateBuffer = new Map();

  let currentFrame = 0;
  let rollbackCount = 0;
  let lastRollbackFrame = null;
  let maxRollbackFrames = 0;

  function saveState(frame, state) {
    const serialized = serializeState(state, frame);
    stateBuffer.set(frame, serialized);

    if (stateBuffer.size > STATE_BUFFER_SIZE) {
      const oldestFrame = Math.min(...stateBuffer.keys());
      if (oldestFrame < frame - STATE_BUFFER_SIZE) {
        stateBuffer.delete(oldestFrame);
      }
    }
  }

  function loadState(frame) {
    const serialized = stateBuffer.get(frame);
    if (!serialized) {
      console.warn(`No saved state for frame ${frame}, using oldest available`);
      const oldestFrame = Math.min(...stateBuffer.keys());
      return loadState(oldestFrame);
    }

    const { state, frame: loadedFrame } = deserializeState(serialized);
    currentFrame = loadedFrame;
    return state;
  }

  function getSavedState(frame) {
    const serialized = stateBuffer.get(frame);
    if (!serialized) return null;
    return deserializeState(serialized).state;
  }

  function predictInput(peerId, frame, networkLayer) {
    if (!networkLayer) {
      return createInput(false, 0);
    }

    return networkLayer.getInput(peerId, frame);
  }

  function checkAndRollback(remotePlayerId, remoteFrame, remoteInput, gameEngine, networkLayer) {
    const localPlayerId = remotePlayerId === 'p1' ? 'p2' : 'p1';

    const predictedLocalInput = predictInput(localPlayerId, remoteFrame, networkLayer);
    const predictedRemoteInput = predictInput(remotePlayerId, remoteFrame, networkLayer);

    if (!inputsEqual(predictedRemoteInput, remoteInput)) {
      rollbackCount++;
      lastRollbackFrame = remoteFrame;

      const currentFrameDelta = currentFrame - remoteFrame;
      if (currentFrameDelta > maxRollbackFrames) {
        maxRollbackFrames = currentFrameDelta;
      }

      const savedState = getSavedState(remoteFrame - 1);
      if (!savedState) {
        console.error('Cannot rollback - no saved state');
        return false;
      }

      gameEngine.restoreState(savedState);

      const startFrame = remoteFrame;
      const endFrame = currentFrame;

      for (let f = startFrame; f < endFrame; f++) {
        const p1Input = predictInput('p1', f, networkLayer);
        const p2Input = predictInput('p2', f, networkLayer);
        gameEngine.update(p1Input, p2Input);
        currentFrame = f;
      }

      return true;
    }

    return false;
  }

  function reset() {
    stateBuffer.clear();
    currentFrame = 0;
    rollbackCount = 0;
    lastRollbackFrame = null;
    maxRollbackFrames = 0;
  }

  function getStats() {
    return {
      currentFrame,
      rollbackCount,
      lastRollbackFrame,
      maxRollbackFrames,
      stateBufferSize: stateBuffer.size,
      oldestFrame: stateBuffer.size > 0 ? Math.min(...stateBuffer.keys()) : null,
      newestFrame: stateBuffer.size > 0 ? Math.max(...stateBuffer.keys()) : null,
    };
  }

  function advanceFrame() {
    currentFrame++;
  }

  function setFrame(frame) {
    currentFrame = frame;
  }

  return {
    saveState,
    loadState,
    predictInput,
    checkAndRollback,
    reset,
    getStats,
    advanceFrame,
    setFrame,
    getCurrentFrame: () => currentFrame,
  };
}

export { createRollbackManager, STATE_BUFFER_SIZE };