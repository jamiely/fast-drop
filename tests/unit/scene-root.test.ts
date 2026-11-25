// @vitest-environment jsdom
import { Box3, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { BALL_RADIUS } from '../../src/entities/Ball';
import { JAR_HEIGHT, JAR_RADIUS } from '../../src/entities/Jar';
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

  it('frames the whole playfield on a tall window and switches layout on resize', () => {
    const host = document.createElement('div');
    let width = 1080;
    let height = 1920;
    Object.defineProperty(host, 'clientWidth', { get: () => width });
    Object.defineProperty(host, 'clientHeight', { get: () => height });

    const root = new SceneRoot(host, 5);
    const tall = root.getFraming();
    expect(tall.layout).toBe('portrait');
    expect(host.dataset.layout).toBe('portrait');
    expect(tall.maxNdc).toBeLessThan(1);
    expect(tall.maxNdc).toBeGreaterThan(0.85); // fills the screen, not a speck

    width = 1920;
    height = 1080;
    root.resize();
    expect(root.layout).toBe('landscape');
    expect(host.dataset.layout).toBe('landscape');
  });

  it('keeps the display and drop tube in frame through the round-end animation, resizes and restart', () => {
    const host = document.createElement('div');
    let width = 750;
    let height = 1000;
    Object.defineProperty(host, 'clientWidth', { get: () => width });
    Object.defineProperty(host, 'clientHeight', { get: () => height });
    const root = new SceneRoot(host, 5);
    const groups = root.scene.children.filter(
      (child) => child.type === 'Group'
    );
    const maxNdc = (): number => {
      root.camera.updateMatrixWorld();
      let max = 0;
      for (const group of groups) {
        const box = new Box3().setFromObject(group);
        if (box.isEmpty()) {
          continue;
        }
        for (const x of [box.min.x, box.max.x]) {
          for (const y of [box.min.y, box.max.y]) {
            for (const z of [box.min.z, box.max.z]) {
              const ndc = new Vector3(x, y, z).project(root.camera);
              max = Math.max(max, Math.abs(ndc.x), Math.abs(ndc.y));
            }
          }
        }
      }
      return max;
    };
    const setRound = (ended: boolean): void =>
      root.setStatusDisplayState(10, 30, 5, 50, ended, 0, 0);

    setRound(true);
    for (let frame = 0; frame < 150; frame += 1) {
      root.update(1 / 60);
      expect(maxNdc()).toBeLessThan(1);
    }

    // Resize to a near-square portrait window after the round ended, then restart.
    width = 990;
    root.resize();
    expect(maxNdc()).toBeLessThan(1);
    setRound(false);
    root.update(1 / 60);
    expect(maxNdc()).toBeLessThan(1);
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
      centerOffsetNormalized: number;
    }> = [];

    for (let index = 0; index < 240; index += 1) {
      const settlements = root.update(1 / 60);
      allSettlements.push(...settlements);
    }

    expect(allSettlements).toHaveLength(1);
    expect(allSettlements[0]).toMatchObject({
      ballId: 99,
      jarIndex: 0,
      isBonusJar: true
    });
    expect(allSettlements[0]?.centerOffsetNormalized).toBeGreaterThanOrEqual(0);
    expect(allSettlements[0]?.centerOffsetNormalized).toBeLessThanOrEqual(1);

    const settledBalls = (
      root as unknown as {
        activeBalls: Array<{ isSettled: boolean }>;
      }
    ).activeBalls;
    expect(settledBalls).toHaveLength(1);
    expect(settledBalls[0]?.isSettled).toBe(true);
  });

  it('prevents balls from overlapping each other', () => {
    const host = document.createElement('div');
    Object.defineProperty(host, 'clientWidth', { value: 800 });
    Object.defineProperty(host, 'clientHeight', { value: 600 });

    const root = new SceneRoot(host, 0);
    root.spawnDropBall(0, 1.6, 30);
    root.spawnDropBall(0, 1.6, 31);

    const balls = (
      root as unknown as {
        activeBalls: Array<{
          mesh: { position: { x: number; y: number; z: number } };
        }>;
      }
    ).activeBalls;

    const firstBall = balls[0];
    const secondBall = balls[1];

    if (!firstBall || !secondBall) {
      throw new Error('Expected two spawned balls');
    }

    firstBall.mesh.position.x = 0;
    firstBall.mesh.position.y = 1.2;
    firstBall.mesh.position.z = 1.6;
    secondBall.mesh.position.x = 0;
    secondBall.mesh.position.y = 1.2;
    secondBall.mesh.position.z = 1.6;

    for (let index = 0; index < 10; index += 1) {
      root.update(1 / 60);
    }

    const dx = secondBall.mesh.position.x - firstBall.mesh.position.x;
    const dy = secondBall.mesh.position.y - firstBall.mesh.position.y;
    const dz = secondBall.mesh.position.z - firstBall.mesh.position.z;

    expect(Math.hypot(dx, dy, dz)).toBeGreaterThanOrEqual(BALL_RADIUS * 2);
  });

  it('handles settled-ball collision branches (settled+settled and settled+moving)', () => {
    const host = document.createElement('div');
    Object.defineProperty(host, 'clientWidth', { value: 800 });
    Object.defineProperty(host, 'clientHeight', { value: 600 });

    const root = new SceneRoot(host, 0);
    root.spawnDropBall(0, 1.6, 40);
    root.spawnDropBall(0, 1.6, 41);

    const balls = (
      root as unknown as {
        activeBalls: Array<{
          mesh: { position: { x: number; y: number; z: number } };
          velocityX: number;
          velocityY: number;
          velocityZ: number;
          isSettled: boolean;
        }>;
      }
    ).activeBalls;

    const firstBall = balls[0];
    const secondBall = balls[1];
    if (!firstBall || !secondBall) {
      throw new Error('Expected two spawned balls');
    }

    firstBall.isSettled = true;
    secondBall.isSettled = true;
    firstBall.mesh.position.x = 0;
    firstBall.mesh.position.y = 1.0;
    firstBall.mesh.position.z = 1.6;
    secondBall.mesh.position.x = BALL_RADIUS * 1.3;
    secondBall.mesh.position.y = 1.0;
    secondBall.mesh.position.z = 1.6;

    root.update(1 / 60);

    secondBall.isSettled = false;
    secondBall.velocityX = -0.6;
    secondBall.velocityY = 0;
    secondBall.velocityZ = 0;
    secondBall.mesh.position.x = BALL_RADIUS * 1.2;

    root.update(1 / 60);

    expect(secondBall.velocityX).toBeGreaterThan(0);
  });

  it('handles moving-vs-settled collision branch when right ball is settled', () => {
    const host = document.createElement('div');
    Object.defineProperty(host, 'clientWidth', { value: 800 });
    Object.defineProperty(host, 'clientHeight', { value: 600 });

    const root = new SceneRoot(host, 0);
    root.spawnDropBall(0, 1.6, 42);
    root.spawnDropBall(0, 1.6, 43);

    const balls = (
      root as unknown as {
        activeBalls: Array<{
          mesh: { position: { x: number; y: number; z: number } };
          velocityX: number;
          velocityY: number;
          velocityZ: number;
          isSettled: boolean;
        }>;
      }
    ).activeBalls;

    const leftBall = balls[0];
    const rightBall = balls[1];
    if (!leftBall || !rightBall) {
      throw new Error('Expected two spawned balls');
    }

    leftBall.isSettled = false;
    leftBall.velocityX = 0.6;
    leftBall.velocityY = 0;
    leftBall.velocityZ = 0;
    leftBall.mesh.position.x = 0;
    leftBall.mesh.position.y = 1.0;
    leftBall.mesh.position.z = 1.6;

    rightBall.isSettled = true;
    rightBall.mesh.position.x = BALL_RADIUS * 1.2;
    rightBall.mesh.position.y = 1.0;
    rightBall.mesh.position.z = 1.6;

    root.update(1 / 60);

    expect(leftBall.velocityX).toBeLessThan(0);
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

  it('pushes non-entered balls outward when they clip through a jar side wall', () => {
    const host = document.createElement('div');
    Object.defineProperty(host, 'clientWidth', { value: 800 });
    Object.defineProperty(host, 'clientHeight', { value: 600 });

    const root = new SceneRoot(host, 1);
    root.spawnDropBall(0, 0, 11);

    const ball = (
      root as unknown as {
        activeBalls: Array<{
          mesh: { position: { x: number; y: number; z: number } };
          velocityX: number;
          velocityY: number;
          velocityZ: number;
          enteredJarIndex: number | null;
        }>;
      }
    ).activeBalls[0];

    if (!ball) {
      throw new Error('Expected spawned ball');
    }

    ball.enteredJarIndex = null;
    ball.mesh.position.x = JAR_RADIUS * 0.45;
    ball.mesh.position.y = JAR_HEIGHT * 0.55;
    ball.mesh.position.z = 0;
    ball.velocityX = -1.1;
    ball.velocityY = 0;
    ball.velocityZ = 0;

    root.update(1 / 60);

    const jar = root.jars[0];
    if (!jar) {
      throw new Error('Expected jar');
    }

    const distanceFromJarCenter = Math.hypot(
      ball.mesh.position.x - jar.position.x,
      ball.mesh.position.z - jar.position.z
    );

    expect(distanceFromJarCenter).toBeGreaterThanOrEqual(
      JAR_RADIUS + BALL_RADIUS - 0.001
    );
    expect(ball.velocityX).toBeGreaterThanOrEqual(0);
  });

  it('cleans up entered balls when jar lookup is invalid and applies top containment bounce', () => {
    const host = document.createElement('div');
    Object.defineProperty(host, 'clientWidth', { value: 800 });
    Object.defineProperty(host, 'clientHeight', { value: 600 });

    const root = new SceneRoot(host, 1);

    root.spawnDropBall(0, 0, 20);
    const containedBall = (
      root as unknown as {
        activeBalls: Array<{
          enteredJarIndex: number | null;
          hasScoredEntry: boolean;
          mesh: { position: { y: number } };
          velocityY: number;
        }>;
      }
    ).activeBalls[0];

    containedBall.enteredJarIndex = 0;
    containedBall.hasScoredEntry = true;
    containedBall.mesh.position.y = 1.2;
    containedBall.velocityY = 2.4;

    root.update(1 / 60);
    expect(containedBall.velocityY).toBeLessThan(0);

    root.spawnDropBall(0, 0, 21);
    const invalidBall = (
      root as unknown as {
        activeBalls: Array<{
          enteredJarIndex: number | null;
          hasScoredEntry: boolean;
        }>;
      }
    ).activeBalls.at(-1);

    if (!invalidBall) {
      throw new Error('Expected spawned ball');
    }

    invalidBall.enteredJarIndex = 999;
    invalidBall.hasScoredEntry = true;

    root.update(1 / 60);

    const remainingBalls = (root as unknown as { activeBalls: unknown[] })
      .activeBalls;
    expect(remainingBalls.length).toBe(1);
  });
});
