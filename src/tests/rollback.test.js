import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRollbackManager, STATE_BUFFER_SIZE } from '../engine/rollbackManager.js';
import { createGameEngine, createInput, serializeState, deserializeState } from '../engine/gameEngine.js';

describe('rollbackManager', () => {
  let engine;
  let rollbackManager;

  beforeEach(() => {
    engine = createGameEngine();
    rollbackManager = createRollbackManager(engine);
  });

  describe('basic operations', () => {
    it('should save and load state', () => {
      engine.start();
      engine.update(createInput(true), createInput(false));

      const stateBefore = engine.getState();
      rollbackManager.saveState(0, stateBefore);

      for (let i = 0; i < 10; i++) {
        engine.update(createInput(false), createInput(true));
      }

      const loadedState = rollbackManager.loadState(0);
      expect(loadedState.gameState).toBe(stateBefore.gameState);
      expect(loadedState.p1.isTouching).toBe(stateBefore.p1.isTouching);
      expect(loadedState.p1.isPinned).toBe(stateBefore.p1.isPinned);
    });

    it('should advance frame count', () => {
      expect(rollbackManager.getCurrentFrame()).toBe(0);
      rollbackManager.advanceFrame();
      expect(rollbackManager.getCurrentFrame()).toBe(1);
      rollbackManager.advanceFrame();
      expect(rollbackManager.getCurrentFrame()).toBe(2);
    });

    it('should set specific frame', () => {
      rollbackManager.setFrame(100);
      expect(rollbackManager.getCurrentFrame()).toBe(100);
    });

    it('should reset state', () => {
      engine.start();
      rollbackManager.saveState(0, engine.getState());
      rollbackManager.advanceFrame();

      rollbackManager.reset();

      expect(rollbackManager.getCurrentFrame()).toBe(0);
      const stats = rollbackManager.getStats();
      expect(stats.rollbackCount).toBe(0);
    });
  });

  describe('state buffer management', () => {
    it('should limit buffer size', () => {
      for (let i = 0; i < 30; i++) {
        engine.start();
        engine.update(createInput(true), createInput(false));
        rollbackManager.saveState(i, engine.getState());
        rollbackManager.advanceFrame();
      }

      const stats = rollbackManager.getStats();
      expect(stats.stateBufferSize).toBeLessThan(30);
    });

    it('should get oldest and newest frames', () => {
      engine.start();
      rollbackManager.saveState(5, engine.getState());
      rollbackManager.saveState(10, engine.getState());
      rollbackManager.saveState(15, engine.getState());

      const stats = rollbackManager.getStats();
      expect(stats.oldestFrame).toBe(5);
      expect(stats.newestFrame).toBe(15);
    });
  });

  describe('prediction', () => {
    it('should predict input for unknown frame', () => {
      const mockNetworkLayer = {
        getInput: vi.fn().mockReturnValue(createInput(true)),
      };

      const predicted = rollbackManager.predictInput('p1', 0, mockNetworkLayer);
      expect(predicted.isTouching).toBe(true);
    });

    it('should return default input when no network layer', () => {
      const predicted = rollbackManager.predictInput('p1', 0, null);
      expect(predicted.isTouching).toBe(false);
      expect(predicted.escapeTaps).toBe(0);
    });
  });

  describe('stats tracking', () => {
    it('should track rollback count', () => {
      expect(rollbackManager.getStats().rollbackCount).toBe(0);
    });

    it('should track max rollback frames', () => {
      const stats = rollbackManager.getStats();
      expect(stats.maxRollbackFrames).toBe(0);
    });

    it('should track last rollback frame', () => {
      const stats = rollbackManager.getStats();
      expect(stats.lastRollbackFrame).toBe(null);
    });
  });

  describe('checkAndRollback', () => {
    it('should return false when prediction matches input', () => {
      engine.start();
      
      for (let i = 0; i < 3; i++) {
        engine.update(createInput(false), createInput(false));
        rollbackManager.saveState(i, engine.getState());
        rollbackManager.advanceFrame();
      }

      const mockNetworkLayer = {
        getInput: vi.fn().mockReturnValue(createInput(false)),
      };

      const remoteInput = createInput(false);
      const result = rollbackManager.checkAndRollback('p2', 2, remoteInput, engine, mockNetworkLayer);

      expect(result).toBe(false);
      expect(rollbackManager.getStats().rollbackCount).toBe(0);
    });

    it('should handle missing saved state gracefully', () => {
      engine.start();
      
      const mockNetworkLayer = {
        getInput: vi.fn().mockReturnValue(createInput(false)),
      };

      const remoteInput = createInput(true);
      const result = rollbackManager.checkAndRollback('p2', 10, remoteInput, engine, mockNetworkLayer);

      expect(result).toBe(false);
    });
  });
});

describe('determinism with rollback', () => {
  it('should produce identical results after rollback', () => {
    const engine1 = createGameEngine();
    const engine2 = createGameEngine();
    const rm1 = createRollbackManager(engine1);
    const rm2 = createRollbackManager(engine2);

    engine1.start();
    engine2.start();

    const inputs = [
      { p1: createInput(true), p2: createInput(false) },
      { p1: createInput(true), p2: createInput(false) },
    ];

    inputs.forEach(({ p1, p2 }, index) => {
      engine1.update(p1, p2);
      engine2.update(p1, p2);
      rm1.saveState(index, engine1.getState());
      rm2.saveState(index, engine2.getState());
      rm1.advanceFrame();
      rm2.advanceFrame();
    });

    const state1 = engine1.getState();
    const state2 = engine2.getState();

    expect(state1.p1.health).toBe(state2.p1.health);
    expect(state1.p2.health).toBe(state2.p2.health);
  });
});