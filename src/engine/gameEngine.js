const TICK_RATE = 16;
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

function createInitialState() {
  return JSON.parse(JSON.stringify(initialState));
}

function updatePhysics(state, p1Input, p2Input) {
  if (state.gameState !== 'playing') return state;

  const newState = JSON.parse(JSON.stringify(state));

  const p1Touching = p1Input?.isTouching ?? false;
  const p2Touching = p2Input?.isTouching ?? false;
  const p1Pinned = newState.p1.isPinned;
  const p2Pinned = newState.p2.isPinned;

  const tickHealthChange = TICK_RATE / 1000;

  if (p1Touching && !p1Pinned) {
    newState.p1.health = Math.min(MAX_HEALTH, newState.p1.health + tickHealthChange);
  }

  if (p2Touching && !p2Pinned) {
    newState.p2.health = Math.min(MAX_HEALTH, newState.p2.health + tickHealthChange);
  }

  if (p1Touching && !p2Touching && !p1Pinned && !p2Pinned) {
    newState.p2.isPinned = true;
    newState.p2.isTouching = false;
    newState.p2.escapeTaps = 0;
  }

  if (p2Touching && !p1Touching && !p1Pinned && !p2Pinned) {
    newState.p1.isPinned = true;
    newState.p1.isTouching = false;
    newState.p1.escapeTaps = 0;
  }

  if (p1Touching && p2Touching && !p1Pinned && !p2Pinned) {
    const laterP1 = p2Pinned && !p1Pinned;
    const laterP2 = p1Pinned && !p2Pinned;

    if (laterP1 && !state.p1.isPinned) {
      newState.p1.isPinned = false;
      newState.p2.isPinned = true;
      newState.p2.isTouching = false;
      newState.p2.escapeTaps = 0;
    } else if (laterP2 && !state.p2.isPinned) {
      newState.p2.isPinned = false;
      newState.p1.isPinned = true;
      newState.p1.isTouching = false;
      newState.p1.escapeTaps = 0;
    }
  }

  if (p2Pinned && p1Touching) {
    newState.p1.health = Math.min(MAX_HEALTH, newState.p1.health + tickHealthChange);
    newState.p2.health = Math.max(0, newState.p2.health - tickHealthChange);
  }

  if (p1Pinned && p2Touching) {
    newState.p2.health = Math.min(MAX_HEALTH, newState.p2.health + tickHealthChange);
    newState.p1.health = Math.max(0, newState.p1.health - tickHealthChange);
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

  return newState;
}

function applyEscapeTap(state, playerId, tapCount) {
  if (state[playerId].isPinned) {
    const newState = JSON.parse(JSON.stringify(state));

    if (tapCount >= ESCAPE_TAPS_NEEDED) {
      newState[playerId].isPinned = false;
      newState[playerId].escapeTaps = 0;

      const opponentId = playerId === 'p1' ? 'p2' : 'p1';
      newState[opponentId].isTouching = false;
    } else {
      newState[playerId].escapeTaps = tapCount;
    }

    return newState;
  }
  return state;
}

function startGame(state) {
  const newState = JSON.parse(JSON.stringify(state));
  newState.gameState = 'playing';
  newState.p1.health = STARTING_HEALTH;
  newState.p2.health = STARTING_HEALTH;
  newState.p1.isTouching = false;
  newState.p2.isTouching = false;
  newState.p1.isPinned = false;
  newState.p2.isPinned = false;
  newState.p1.escapeTaps = 0;
  newState.p2.escapeTaps = 0;
  newState.winner = null;
  return newState;
}

function resetGame(state) {
  const newState = JSON.parse(JSON.stringify(state));
  newState.gameState = 'playing';
  newState.p1.health = STARTING_HEALTH;
  newState.p2.health = STARTING_HEALTH;
  newState.p1.isTouching = false;
  newState.p2.isTouching = false;
  newState.p1.isPinned = false;
  newState.p2.isPinned = false;
  newState.p1.escapeTaps = 0;
  newState.p2.escapeTaps = 0;
  newState.winner = null;
  newState.gameState = 'playing';
  return newState;
}

function applyInput(state, playerId, input) {
  const newState = JSON.parse(JSON.stringify(state));

  if (input.isTouching !== undefined) {
    newState[playerId].isTouching = input.isTouching;

    if (!input.isTouching && newState[playerId].isPinned) {
      newState[playerId].escapeTaps = 0;
    }
  }

  return newState;
}

function serializeState(state, frame) {
  return JSON.stringify({
    frame,
    gameState: state.gameState,
    p1: { ...state.p1 },
    p2: { ...state.p2 },
    winner: state.winner,
  });
}

function deserializeState(json) {
  const data = JSON.parse(json);
  return {
    state: {
      gameState: data.gameState,
      p1: { ...data.p1 },
      p2: { ...data.p2 },
      winner: data.winner,
    },
    frame: data.frame,
  };
}

function createInput(isTouching, escapeTaps = 0) {
  return { isTouching, escapeTaps };
}

function inputsEqual(a, b) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.isTouching === b.isTouching && a.escapeTaps === b.escapeTaps;
}

function createGameEngine() {
  let state = createInitialState();
  let currentInput = {
    p1: createInput(false, 0),
    p2: createInput(false, 0),
  };

  function getState() {
    return JSON.parse(JSON.stringify(state));
  }

  function restoreState(newState) {
    state = JSON.parse(JSON.stringify(newState));
  }

  function update(p1Input, p2Input) {
    currentInput.p1 = p1Input || createInput(false, 0);
    currentInput.p2 = p2Input || createInput(false, 0);

    state = updatePhysics(state, currentInput.p1, currentInput.p2);
    return state;
  }

  function applyP1Input(input) {
    currentInput.p1 = input;
    state = applyInput(state, 'p1', input);
  }

  function applyP2Input(input) {
    currentInput.p2 = input;
    state = applyInput(state, 'p2', input);
  }

  function start() {
    state = startGame(state);
  }

  function reset() {
    state = resetGame(state);
  }

  return {
    getState,
    restoreState,
    update,
    applyP1Input,
    applyP2Input,
    start,
    reset,
  };
}

export {
  TICK_RATE,
  STARTING_HEALTH,
  MAX_HEALTH,
  ESCAPE_TAPS_NEEDED,
  initialState,
  createInitialState,
  updatePhysics,
  applyEscapeTap,
  startGame,
  resetGame,
  applyInput,
  serializeState,
  deserializeState,
  createInput,
  inputsEqual,
  createGameEngine,
};