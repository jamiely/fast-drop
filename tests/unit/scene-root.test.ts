// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { SceneRoot } from '../../src/scene/SceneRoot';

describe('SceneRoot', () => {
  it('builds scene graph and supports resize/render without WebGL', () => {
    const host = document.createElement('div');

    Object.defineProperty(host, 'clientWidth', { value: 800 });
    Object.defineProperty(host, 'clientHeight', { value: 600 });

    const root = new SceneRoot(host, 4);

    expect(root.jars).toHaveLength(4);
    expect(root.jarGroup.children).toHaveLength(4);

    root.resize();
    expect(root.camera.aspect).toBeCloseTo(800 / 600);

    expect(() => root.render()).not.toThrow();
  });

  it('emits a single clean-entry settlement event for a ball', () => {
    const host = document.createElement('div');
    Object.defineProperty(host, 'clientWidth', { value: 800 });
    Object.defineProperty(host, 'clientHeight', { value: 600 });

    const root = new SceneRoot(host, 1);
    root.spawnDropBall(0, 0, 99);

    const allSettlements: Array<{
      ballId: number | null;
      jarIndex: number;
      isBonusJar: boolean;
    }> = [];

    for (let index = 0; index < 240; index += 1) {
      const settlements = root.update(1 / 60);
      allSettlements.push(...settlements);
    }

    expect(allSettlements).toHaveLength(1);
    expect(allSettlements[0]).toEqual({
      ballId: 99,
      jarIndex: 0,
      isBonusJar: true
    });

    const settledBalls = (root as unknown as {
      activeBalls: Array<{ isSettled: boolean }>;
    }).activeBalls;
    expect(settledBalls).toHaveLength(1);
    expect(settledBalls[0]?.isSettled).toBe(true);
  });

  it('does not emit clean-entry events for rim grazes outside clean radius', () => {
    const host = document.createElement('div');
    Object.defineProperty(host, 'clientWidth', { value: 800 });
    Object.defineProperty(host, 'clientHeight', { value: 600 });

    const root = new SceneRoot(host, 1);
    root.spawnDropBall(0.34, 0, 10);

    const settlements: Array<{ jarIndex: number }> = [];
    for (let index = 0; index < 180; index += 1) {
      settlements.push(...root.update(1 / 60));
    }

    expect(settlements).toHaveLength(0);
  });

  it('cleans up entered balls when jar lookup is invalid and applies top containment bounce', () => {
    const host = document.createElement('div');
    Object.defineProperty(host, 'clientWidth', { value: 800 });
    Object.defineProperty(host, 'clientHeight', { value: 600 });

    const root = new SceneRoot(host, 1);

    root.spawnDropBall(0, 0, 20);
    const containedBall = (root as unknown as {
      activeBalls: Array<{
        enteredJarIndex: number | null;
        hasScoredEntry: boolean;
        mesh: { position: { y: number } };
        velocityY: number;
      }>;
    }).activeBalls[0];

    containedBall.enteredJarIndex = 0;
    containedBall.hasScoredEntry = true;
    containedBall.mesh.position.y = 1.2;
    containedBall.velocityY = 2.4;

    root.update(1 / 60);
    expect(containedBall.velocityY).toBeLessThan(0);

    root.spawnDropBall(0, 0, 21);
    const invalidBall = (root as unknown as {
      activeBalls: Array<{
        enteredJarIndex: number | null;
        hasScoredEntry: boolean;
      }>;
    }).activeBalls.at(-1);

    if (!invalidBall) {
      throw new Error('Expected spawned ball');
    }

    invalidBall.enteredJarIndex = 999;
    invalidBall.hasScoredEntry = true;

    root.update(1 / 60);

    const remainingBalls = (root as unknown as { activeBalls: unknown[] }).activeBalls;
    expect(remainingBalls.length).toBe(1);
  });
});
