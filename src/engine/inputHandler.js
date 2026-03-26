import { createInput } from './gameEngine.js';

function createInputHandler(playerId, onInput) {
  let isTouching = false;
  let escapeTapCount = 0;
  let escapeTapStartTime = 0;

  const ESCAPE_WINDOW_MS = 500;

  function getCurrentInput() {
    return createInput(isTouching, isTouching ? escapeTapCount : 0);
  }

  function handlePointerDown() {
    const now = Date.now();

    if (escapeTapStartTime === 0 || now - escapeTapStartTime > ESCAPE_WINDOW_MS) {
      escapeTapCount = 1;
      escapeTapStartTime = now;
    } else {
      escapeTapCount += 1;
    }

    if (!isTouching) {
      isTouching = true;
      onInput(getCurrentInput());
    } else if (escapeTapCount > 0) {
      onInput(getCurrentInput());
    }
  }

  function handlePointerUp() {
    if (isTouching) {
      isTouching = false;
      escapeTapCount = 0;
      escapeTapStartTime = 0;
      onInput(getCurrentInput());
    }
  }

  function handlePointerLeave() {
    if (isTouching) {
      isTouching = false;
      escapeTapCount = 0;
      escapeTapStartTime = 0;
      onInput(getCurrentInput());
    }
  }

  function reset() {
    isTouching = false;
    escapeTapCount = 0;
    escapeTapStartTime = 0;
  }

  return {
    handlePointerDown,
    handlePointerUp,
    handlePointerLeave,
    reset,
    getCurrentInput,
    isTouching: () => isTouching,
    escapeTapCount: () => escapeTapCount,
  };
}

export { createInputHandler };