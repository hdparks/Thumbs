import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createGameEngine,
  createInput,
  inputsEqual,
  startGame,
  resetGame,
  applyInput,
  serializeState,
  deserializeState,
  updatePhysics,
  ESCAPE_TAPS_NEEDED,
} from '../engine/gameEngine.js';

describe('gameEngine', () => {
  describe('createInput', () => {
    it('should create input object with isTouching and escapeTaps', () => {
      const input = createInput(true, 3);
      expect(input.isTouching).toBe(true);
      expect(input.escapeTaps).toBe(3);
    });

    it('should default escapeTaps to 0', () => {
      const input = createInput(false);
      expect(input.escapeTaps).toBe(0);
    });
  });

  describe('inputsEqual', () => {
    it('should return true for identical inputs', () => {
      const a = createInput(true, 2);
      const b = createInput(true, 2);
      expect(inputsEqual(a, b)).toBe(true);
    });

    it('should return false for different isTouching', () => {
      const a = createInput(true, 2);
      const b = createInput(false, 2);
      expect(inputsEqual(a, b)).toBe(false);
    });

    it('should return false for different escapeTaps', () => {
      const a = createInput(true, 2);
      const b = createInput(true, 3);
      expect(inputsEqual(a, b)).toBe(false);
    });

    it('should return true for both null', () => {
      expect(inputsEqual(null, null)).toBe(true);
    });

    it('should return false for one null', () => {
      expect(inputsEqual(null, createInput(false))).toBe(false);
      expect(inputsEqual(createInput(false), null)).toBe(false);
    });
  });

  describe('createGameEngine', () => {
    let engine;

    beforeEach(() => {
      engine = createGameEngine();
    });

    it('should return initial idle state', () => {
      const state = engine.getState();
      expect(state.gameState).toBe('idle');
      expect(state.p1.health).toBe(15);
      expect(state.p2.health).toBe(15);
    });

    it('should start game when start() is called', () => {
      engine.start();
      const state = engine.getState();
      expect(state.gameState).toBe('playing');
    });

    it('should reset game when reset() is called', () => {
      engine.start();
      engine.getState().p1.health = 10;
      engine.reset();
      const state = engine.getState();
      expect(state.gameState).toBe('playing');
      expect(state.p1.health).toBe(15);
    });

    it('should apply p1 input', () => {
      engine.start();
      engine.applyP1Input(createInput(true));
      const state = engine.getState();
      expect(state.p1.isTouching).toBe(true);
    });

    it('should apply p2 input', () => {
      engine.start();
      engine.applyP2Input(createInput(true));
      const state = engine.getState();
      expect(state.p2.isTouching).toBe(true);
    });

    it('should restore state', () => {
      engine.start();
      const state = engine.getState();
      state.p1.health = 5;
      engine.restoreState(state);
      
      expect(engine.getState().p1.health).toBe(5);
    });
  });

  describe('determinism', () => {
    it('should produce identical results with same inputs', () => {
      const engine1 = createGameEngine();
      const engine2 = createGameEngine();
      
      engine1.start();
      engine2.start();
      
      for (let i = 0; i < 100; i++) {
        engine1.update(createInput(true), createInput(false));
        engine2.update(createInput(true), createInput(false));
        
        const state1 = engine1.getState();
        const state2 = engine2.getState();
        
        expect(state1.p1.health).toBe(state2.p1.health);
        expect(state1.p2.health).toBe(state2.p2.health);
        expect(state1.p1.isPinned).toBe(state2.p1.isPinned);
        expect(state1.p2.isPinned).toBe(state2.p2.isPinned);
      }
    });

    it('should produce same results across multiple update calls', () => {
      const engine = createGameEngine();
      engine.start();
      
      const inputs = [
        { p1: createInput(true), p2: createInput(false) },
        { p1: createInput(true), p2: createInput(false) },
        { p1: createInput(false), p2: createInput(true) },
      ];
      
      inputs.forEach(({ p1, p2 }) => {
        engine.update(p1, p2);
      });
      
      const state = engine.getState();
      
      const engine2 = createGameEngine();
      engine2.start();
      
      inputs.forEach(({ p1, p2 }) => {
        engine2.update(p1, p2);
      });
      
      const state2 = engine2.getState();
      
      expect(state.p1.health).toBe(state2.p1.health);
      expect(state.p2.health).toBe(state2.p2.health);
    });
  });

  describe('serializeState / deserializeState', () => {
    it('should serialize and deserialize state correctly', () => {
      const engine = createGameEngine();
      engine.start();
      engine.update(createInput(true), createInput(false));
      
      const state = engine.getState();
      const serialized = serializeState(state, 42);
      
      const { state: deserialized, frame } = deserializeState(serialized);
      
      expect(frame).toBe(42);
      expect(deserialized.gameState).toBe(state.gameState);
      expect(deserialized.p1.health).toBe(state.p1.health);
      expect(deserialized.p2.health).toBe(state.p2.health);
    });
  });

  describe('updatePhysics', () => {
    it('should not update when gameState is not playing', () => {
      const state = {
        gameState: 'idle',
        p1: { health: 15, isTouching: false, isPinned: false, escapeTaps: 0, wins: 0 },
        p2: { health: 15, isTouching: false, isPinned: false, escapeTaps: 0, wins: 0 },
        winner: null,
      };
      const result = updatePhysics(state, createInput(true), createInput(false));
      expect(result.gameState).toBe('idle');
    });

    it('should increase health when touching and not pinned', () => {
      const state = {
        gameState: 'playing',
        p1: { health: 15, isTouching: false, isPinned: false, escapeTaps: 0, wins: 0 },
        p2: { health: 15, isTouching: false, isPinned: false, escapeTaps: 0, wins: 0 },
        winner: null,
      };
      const result = updatePhysics(state, createInput(true), createInput(false));
      expect(result.p1.health).toBeGreaterThan(15);
    });

    it('should pin opponent when touching and opponent not touching', () => {
      const state = {
        gameState: 'playing',
        p1: { health: 15, isTouching: false, isPinned: false, escapeTaps: 0, wins: 0 },
        p2: { health: 15, isTouching: false, isPinned: false, escapeTaps: 0, wins: 0 },
        winner: null,
      };
      const result = updatePhysics(state, createInput(true), createInput(false));
      expect(result.p2.isPinned).toBe(true);
    });

    it('should drain pinned player health', () => {
      const state = {
        gameState: 'playing',
        p1: { health: 15, isTouching: true, isPinned: false, escapeTaps: 0, wins: 0 },
        p2: { health: 15, isTouching: false, isPinned: true, escapeTaps: 0, wins: 0 },
        winner: null,
      };
      const result = updatePhysics(state, createInput(true), createInput(false));
      expect(result.p1.health).toBeGreaterThan(15);
      expect(result.p2.health).toBeLessThan(15);
    });

    it('should detect winner when health reaches 0', () => {
      const state = {
        gameState: 'playing',
        p1: { health: 10, isTouching: true, isPinned: false, escapeTaps: 0, wins: 0 },
        p2: { health: 0.01, isTouching: false, isPinned: true, escapeTaps: 0, wins: 0 },
        winner: null,
      };
      const result = updatePhysics(state, createInput(true), createInput(false));
      expect(result.gameState).toBe('p1Win');
      expect(result.winner).toBe('p1');
    });
  });
});