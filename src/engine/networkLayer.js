import { createInput } from './gameEngine.js';

const INPUT_BUFFER_SIZE = 15;

function createNetworkLayer(playerId, sendDataFn, onRemoteInputCallback) {
  const inputBuffer = {
    p1: new Map(),
    p2: new Map(),
  };

  const confirmedFrame = {
    p1: -1,
    p2: -1,
  };

  let latencySamples = [];
  const MAX_LATENCY_SAMPLES = 30;

  function sendInput(frame, input) {
    if (!sendDataFn) return;

    const message = {
      type: 'input',
      player: playerId,
      frame: frame,
      timestamp: Date.now(),
      input: input,
    };

    sendDataFn(message);
  }

  function sendStartGame() {
    if (!sendDataFn) return;
    const message = {
      type: 'startGame',
      player: playerId,
      timestamp: Date.now(),
    };
    sendDataFn(message);
  }

  function sendResetGame() {
    if (!sendDataFn) return;
    const message = {
      type: 'resetGame',
      player: playerId,
      timestamp: Date.now(),
    };
    sendDataFn(message);
  }

  function receiveInput(message) {
    if (message.type === 'input') {
      const { player, frame, timestamp, input } = message;

      const latency = Date.now() - timestamp;
      latencySamples.push(latency);
      if (latencySamples.length > MAX_LATENCY_SAMPLES) {
        latencySamples.shift();
      }

      const existing = inputBuffer[player].get(frame);
      if (!existing || existing.timestamp < timestamp) {
        inputBuffer[player].set(frame, {
          ...input,
          timestamp,
        });
      }

      if (frame > confirmedFrame[player]) {
        confirmedFrame[player] = frame;
      }

      if (onRemoteInputCallback) {
        onRemoteInputCallback(player, frame, input);
      }
    }

    if (message.type === 'startGame') {
      if (onRemoteInputCallback) {
        onRemoteInputCallback('system', -1, { type: 'startGame' });
      }
    }

    if (message.type === 'resetGame') {
      if (onRemoteInputCallback) {
        onRemoteInputCallback('system', -1, { type: 'resetGame' });
      }
    }
  }

  function getInput(playerId, frame) {
    const input = inputBuffer[playerId].get(frame);
    if (input) {
      return input;
    }

    const nextKnown = findNextKnownInput(playerId, frame);
    if (nextKnown) {
      return nextKnown;
    }

    return createInput(false, 0);
  }

  function findNextKnownInput(playerId, targetFrame) {
    let closestFrame = null;
    let closestInput = null;

    for (const [frame, input] of inputBuffer[playerId]) {
      if (frame >= targetFrame) {
        if (closestFrame === null || frame < closestFrame) {
          closestFrame = frame;
          closestInput = input;
        }
      }
    }

    return closestInput;
  }

  function getInputBufferDepth(playerId) {
    if (inputBuffer[playerId].size === 0) return 0;

    const frames = Array.from(inputBuffer[playerId].keys());
    const minFrame = Math.min(...frames);
    const maxFrame = Math.max(...frames);

    return maxFrame - minFrame + 1;
  }

  function pruneOldInputs(keepFrameCount = 20) {
    const currentConfirmedP1 = confirmedFrame.p1;
    const currentConfirmedP2 = confirmedFrame.p2;
    const cutoffP1 = currentConfirmedP1 - keepFrameCount;
    const cutoffP2 = currentConfirmedP2 - keepFrameCount;

    for (const frame of inputBuffer.p1.keys()) {
      if (frame < cutoffP1) {
        inputBuffer.p1.delete(frame);
      }
    }

    for (const frame of inputBuffer.p2.keys()) {
      if (frame < cutoffP2) {
        inputBuffer.p2.delete(frame);
      }
    }
  }

  function getConfirmedFrame(playerId) {
    return confirmedFrame[playerId];
  }

  function getEstimatedLatency() {
    if (latencySamples.length === 0) return 0;
    const sorted = [...latencySamples].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }

  function reset() {
    inputBuffer.p1.clear();
    inputBuffer.p2.clear();
    confirmedFrame.p1 = -1;
    confirmedFrame.p2 = -1;
    latencySamples = [];
  }

  function getInputBufferForDebug() {
    return {
      p1: Array.from(inputBuffer.p1.entries()).slice(-10),
      p2: Array.from(inputBuffer.p2.entries()).slice(-10),
    };
  }

  return {
    sendInput,
    sendStartGame,
    sendResetGame,
    receiveInput,
    getInput,
    getInputBufferDepth,
    getConfirmedFrame,
    getEstimatedLatency,
    reset,
    pruneOldInputs,
    getInputBufferForDebug,
  };
}

export { createNetworkLayer, INPUT_BUFFER_SIZE };