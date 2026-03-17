import {
  BoxGeometry,
  CanvasTexture,
  Color,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  PlaneGeometry,
  SRGBColorSpace
} from 'three';

const SCREEN_WIDTH = 2.45;
const SCREEN_HEIGHT = 1.18;

const MAX_BALL_ICONS = 50;
const BASE_BALL_RADIUS = 11;
const BALL_GRAVITY = 980;
const RELEASE_INTERVAL_MS = 85;
const LINEAR_DAMPING = 0.9;
const RESTITUTION = 0.12;
const SLEEP_SPEED = 14;
const SLEEP_FRAMES_REQUIRED = 14;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export interface StatusDisplayData {
  timeRemaining: number;
  timeTotal: number;
  ballsRemaining: number;
}

export interface StatusDisplayVisual {
  group: Group;
  setPlacement: (x: number, y: number, z: number) => void;
  setScale: (value: number) => void;
  setBallsSphereScale: (value: number) => void;
  updateData: (data: StatusDisplayData) => void;
}

interface SphereBall {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  sleepFrames: number;
}

interface FallingBall {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export const createStatusDisplay = (): StatusDisplayVisual => {
  const group = new Group();

  const housing = new Mesh(
    new BoxGeometry(SCREEN_WIDTH * 1.14, SCREEN_HEIGHT * 1.24, 0.11),
    new MeshPhysicalMaterial({
      color: '#2b2a72',
      metalness: 0.22,
      roughness: 0.26,
      clearcoat: 1,
      clearcoatRoughness: 0.2,
      emissive: '#332f9d',
      emissiveIntensity: 0.2
    })
  );

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;

  const context = canvas.getContext('2d');
  const texture = context ? new CanvasTexture(canvas) : null;
  if (texture) {
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;
  }

  const screen = new Mesh(
    new PlaneGeometry(SCREEN_WIDTH, SCREEN_HEIGHT),
    new MeshPhysicalMaterial({
      map: texture,
      color: texture ? new Color('#ffffff') : new Color('#9be6ff'),
      roughness: 0.6,
      metalness: 0,
      emissive: texture ? new Color('#ffffff') : new Color('#52b5ff'),
      emissiveIntensity: texture ? 0.32 : 0.25
    })
  );
  screen.position.z = 0.058;

  group.add(housing, screen);

  const getNowMs = () =>
    typeof performance !== 'undefined' ? performance.now() : Date.now();

  const makePackedBalls = (
    count: number,
    containerRadius: number,
    ballRadius: number
  ): SphereBall[] => {
    const candidates: Array<{ x: number; y: number; z: number }> = [];
    const spacing = ballRadius * 1.9;

    for (let y = -containerRadius; y <= containerRadius; y += spacing) {
      for (let z = -containerRadius; z <= containerRadius; z += spacing) {
        for (let x = -containerRadius; x <= containerRadius; x += spacing) {
          if (Math.hypot(x, y, z) <= containerRadius - ballRadius - 4) {
            candidates.push({ x, y, z });
          }
        }
      }
    }

    candidates.sort(
      (left, right) =>
        right.y - left.y ||
        Math.hypot(left.x, left.z) - Math.hypot(right.x, right.z) ||
        left.z - right.z
    );

    return candidates.slice(0, count).map((candidate) => ({
      x: candidate.x + (Math.random() - 0.5) * 0.8,
      y: candidate.y + (Math.random() - 0.5) * 0.8,
      z: candidate.z + (Math.random() - 0.5) * 0.8,
      vx: (Math.random() - 0.5) * 2,
      vy: Math.random() * 2,
      vz: (Math.random() - 0.5) * 2,
      sleepFrames: 0
    }));
  };

  let sphereBalls: SphereBall[] = [];
  let fallingBalls: FallingBall[] = [];
  let pendingReleaseCount = 0;
  let lastBallsRemaining = MAX_BALL_ICONS;
  let lastReleaseAtMs = 0;
  let lastFrameAtMs: number | null = null;
  let ballsSphereScale = 2;
  let lastAppliedSphereScale = ballsSphereScale;

  const getBallRadius = () => BASE_BALL_RADIUS * ballsSphereScale;

  const drawBall = (
    x: number,
    y: number,
    radiusScale: number,
    alpha = 1,
    depthTint = 0
  ) => {
    if (!context) {
      return;
    }

    const radius = getBallRadius() * radiusScale;
    const gradient = context.createRadialGradient(
      x - radius * 0.42,
      y - radius * 0.5,
      radius * 0.18,
      x,
      y,
      radius
    );
    gradient.addColorStop(0, '#ffd8e1');
    gradient.addColorStop(1, '#d62b4d');

    context.globalAlpha = alpha;
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();

    if (depthTint > 0.01) {
      context.fillStyle = `rgba(23, 33, 62, ${clamp01(depthTint * 0.35)})`;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }

    context.globalAlpha = 1;
  };

  const releaseOneBall = (innerRadius: number, ballRadius: number) => {
    if (pendingReleaseCount <= 0 || sphereBalls.length <= 0) {
      return;
    }

    let selectedIndex = 0;
    let bestScore = -Number.MAX_VALUE;

    for (let index = 0; index < sphereBalls.length; index += 1) {
      const ball = sphereBalls[index];
      const score = ball.y - (Math.abs(ball.x) + Math.abs(ball.z)) * 0.9;
      if (score > bestScore) {
        bestScore = score;
        selectedIndex = index;
      }
    }

    const [selected] = sphereBalls.splice(selectedIndex, 1);
    fallingBalls.push({
      x: selected.x * 0.35 + selected.z * 0.1,
      y: innerRadius - ballRadius - 2,
      vx: selected.x * -0.35,
      vy: 125
    });

    pendingReleaseCount -= 1;
  };

  const simulateSphere = (dt: number, innerRadius: number, ballRadius: number) => {
    const maxDistance = innerRadius - ballRadius;

    for (const ball of sphereBalls) {
      const speed = Math.hypot(ball.vx, ball.vy, ball.vz);
      const canSleep = pendingReleaseCount === 0 && fallingBalls.length === 0;
      const isSleeping = canSleep && ball.sleepFrames >= SLEEP_FRAMES_REQUIRED;

      if (!isSleeping) {
        ball.vy += BALL_GRAVITY * dt;
        ball.vx *= LINEAR_DAMPING;
        ball.vy *= LINEAR_DAMPING;
        ball.vz *= LINEAR_DAMPING;
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;
        ball.z += ball.vz * dt;
      }

      const distance = Math.hypot(ball.x, ball.y, ball.z);
      if (distance > maxDistance) {
        const nx = ball.x / Math.max(0.0001, distance);
        const ny = ball.y / Math.max(0.0001, distance);
        const nz = ball.z / Math.max(0.0001, distance);
        ball.x = nx * maxDistance;
        ball.y = ny * maxDistance;
        ball.z = nz * maxDistance;

        const velocityAlongNormal = ball.vx * nx + ball.vy * ny + ball.vz * nz;
        if (velocityAlongNormal > 0) {
          ball.vx -= velocityAlongNormal * nx * (1 + RESTITUTION);
          ball.vy -= velocityAlongNormal * ny * (1 + RESTITUTION);
          ball.vz -= velocityAlongNormal * nz * (1 + RESTITUTION);
        }
      }

      if (speed < SLEEP_SPEED && pendingReleaseCount === 0) {
        ball.sleepFrames += 1;
      } else {
        ball.sleepFrames = 0;
      }

      if (ball.sleepFrames >= SLEEP_FRAMES_REQUIRED) {
        ball.vx = 0;
        ball.vy = 0;
        ball.vz = 0;
      }
    }

    for (let i = 0; i < sphereBalls.length; i += 1) {
      for (let j = i + 1; j < sphereBalls.length; j += 1) {
        const left = sphereBalls[i];
        const right = sphereBalls[j];

        const dx = right.x - left.x;
        const dy = right.y - left.y;
        const dz = right.z - left.z;
        const distance = Math.hypot(dx, dy, dz);
        const minimumDistance = ballRadius * 2;

        if (distance >= minimumDistance || distance <= 0.0001) {
          continue;
        }

        const nx = dx / distance;
        const ny = dy / distance;
        const nz = dz / distance;
        const overlap = minimumDistance - distance;

        left.x -= nx * overlap * 0.5;
        left.y -= ny * overlap * 0.5;
        left.z -= nz * overlap * 0.5;
        right.x += nx * overlap * 0.5;
        right.y += ny * overlap * 0.5;
        right.z += nz * overlap * 0.5;

        const relativeVelocity =
          (right.vx - left.vx) * nx +
          (right.vy - left.vy) * ny +
          (right.vz - left.vz) * nz;

        if (relativeVelocity < 0) {
          const impulse = -relativeVelocity * 0.2;
          left.vx -= nx * impulse;
          left.vy -= ny * impulse;
          left.vz -= nz * impulse;
          right.vx += nx * impulse;
          right.vy += ny * impulse;
          right.vz += nz * impulse;
        }

        left.sleepFrames = 0;
        right.sleepFrames = 0;
      }
    }
  };

  const simulateFalling = (dt: number, outerRadius: number) => {
    for (let index = fallingBalls.length - 1; index >= 0; index -= 1) {
      const ball = fallingBalls[index];
      ball.vy += BALL_GRAVITY * dt;
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      if (ball.y > outerRadius + 92) {
        fallingBalls.splice(index, 1);
      }
    }
  };

  const draw = (data: StatusDisplayData, nowMs = getNowMs()) => {
    if (!context || !texture) {
      return;
    }

    const safeTotal = Math.max(0.001, data.timeTotal);
    const progress = clamp01(data.timeRemaining / safeTotal);
    const elapsed = 1 - progress;

    context.clearRect(0, 0, canvas.width, canvas.height);

    const bg = context.createLinearGradient(0, 0, 0, canvas.height);
    bg.addColorStop(0, '#8fd9ff');
    bg.addColorStop(1, '#6bc8ff');
    context.fillStyle = bg;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = '#16326a';
    context.font = 'bold 58px Arial';
    context.textAlign = 'center';
    context.fillText('TIME', canvas.width * 0.31, 104);
    context.font = 'bold 40px Arial';
    context.fillText('REMAINING', canvas.width * 0.31, 146);

    context.font = 'bold 58px Arial';
    context.fillText('BALLS', canvas.width * 0.75, 104);
    context.font = 'bold 40px Arial';
    context.fillText('REMAINING', canvas.width * 0.75, 146);

    const timerX = canvas.width * 0.29;
    const timerY = canvas.height * 0.3 + 142;
    const timerRadius = 146;

    context.lineWidth = 34;
    context.lineCap = 'round';

    const startAngle = -Math.PI * 0.5;
    const elapsedArc = Math.PI * 2 * elapsed;
    context.strokeStyle = '#2edd76';
    context.beginPath();
    context.arc(timerX, timerY, timerRadius, 0, Math.PI * 2);
    context.stroke();

    if (elapsedArc > 0.001) {
      context.strokeStyle = '#f0525f';
      context.beginPath();
      context.arc(
        timerX,
        timerY,
        timerRadius,
        startAngle,
        startAngle + elapsedArc
      );
      context.stroke();
    }

    context.fillStyle = '#e0fbff';
    context.beginPath();
    context.arc(timerX, timerY, timerRadius - 27, 0, Math.PI * 2);
    context.fill();

    const needleAngle = startAngle + Math.PI * 2 * elapsed;
    const needleLength = timerRadius - 18;

    const needleTipX = timerX + Math.cos(needleAngle) * needleLength;
    const needleTipY = timerY + Math.sin(needleAngle) * needleLength;

    context.strokeStyle = '#4a4a4a';
    context.lineWidth = 16;
    context.beginPath();
    context.moveTo(timerX, timerY);
    context.lineTo(needleTipX, needleTipY);
    context.stroke();

    context.strokeStyle = '#d3d3d3';
    context.lineWidth = 10;
    context.beginPath();
    context.moveTo(timerX, timerY);
    context.lineTo(needleTipX, needleTipY);
    context.stroke();

    context.fillStyle = '#d3d3d3';
    context.strokeStyle = '#4a4a4a';
    context.lineWidth = 4;
    context.beginPath();
    context.arc(timerX, timerY, 14, 0, Math.PI * 2);
    context.fill();
    context.stroke();

    const ballsX = canvas.width * 0.75;
    const ballsY = timerY;
    const ballsRadius = 146;
    const sphereInnerRadius = ballsRadius - 22;
    const holeHalfWidth = 24;

    const ballsCount = Math.max(
      0,
      Math.min(MAX_BALL_ICONS, Math.floor(data.ballsRemaining))
    );
    const ballRadius = getBallRadius();

    if (lastFrameAtMs === null) {
      lastFrameAtMs = nowMs;
      sphereBalls = makePackedBalls(ballsCount, sphereInnerRadius, ballRadius);
      lastBallsRemaining = ballsCount;
      lastAppliedSphereScale = ballsSphereScale;
    }

    if (Math.abs(lastAppliedSphereScale - ballsSphereScale) > 0.0001) {
      sphereBalls = makePackedBalls(ballsCount, sphereInnerRadius, ballRadius);
      fallingBalls = [];
      pendingReleaseCount = 0;
      lastAppliedSphereScale = ballsSphereScale;
    } else if (ballsCount > sphereBalls.length) {
      sphereBalls = makePackedBalls(ballsCount, sphereInnerRadius, ballRadius);
      fallingBalls = [];
      pendingReleaseCount = 0;
    } else if (ballsCount < lastBallsRemaining) {
      pendingReleaseCount += lastBallsRemaining - ballsCount;
    }
    lastBallsRemaining = ballsCount;

    const dt = Math.min(0.05, Math.max(0.001, (nowMs - lastFrameAtMs) / 1000));
    lastFrameAtMs = nowMs;

    if (pendingReleaseCount > 0 && nowMs - lastReleaseAtMs >= RELEASE_INTERVAL_MS) {
      releaseOneBall(sphereInnerRadius, ballRadius);
      lastReleaseAtMs = nowMs;
    }

    simulateSphere(dt * 0.5, sphereInnerRadius, ballRadius);
    simulateSphere(dt * 0.5, sphereInnerRadius, ballRadius);
    simulateFalling(dt, ballsRadius);

    context.lineWidth = 18;
    context.strokeStyle = '#1a4291';
    context.beginPath();
    context.arc(ballsX, ballsY, ballsRadius, 0, Math.PI * 2);
    context.stroke();

    const ballsBg = context.createRadialGradient(
      ballsX - 30,
      ballsY - 38,
      18,
      ballsX,
      ballsY,
      ballsRadius
    );
    ballsBg.addColorStop(0, '#e4fbff');
    ballsBg.addColorStop(0.7, '#b5ecff');
    ballsBg.addColorStop(1, '#95dfff');
    context.fillStyle = ballsBg;
    context.beginPath();
    context.arc(ballsX, ballsY, ballsRadius - 10, 0, Math.PI * 2);
    context.fill();

    context.save();
    context.beginPath();
    context.arc(ballsX, ballsY, sphereInnerRadius, 0, Math.PI * 2);
    context.clip();

    const sortedSphereBalls = [...sphereBalls].sort(
      (left, right) => left.z - right.z || left.y - right.y
    );
    for (const ball of sortedSphereBalls) {
      const depth = clamp01((ball.z + sphereInnerRadius) / (sphereInnerRadius * 2));
      const perspective = 0.84 + depth * 0.32;
      const drawX = ballsX + ball.x * perspective;
      const drawY = ballsY + ball.y * perspective;
      const radiusScale = 0.76 + depth * 0.38;
      const depthTint = 1 - depth;
      drawBall(drawX, drawY, radiusScale, 1, depthTint);
    }

    const sphereShade = context.createRadialGradient(
      ballsX + 16,
      ballsY + 14,
      20,
      ballsX,
      ballsY,
      sphereInnerRadius
    );
    sphereShade.addColorStop(0, 'rgba(255,255,255,0)');
    sphereShade.addColorStop(1, 'rgba(18,53,104,0.2)');
    context.fillStyle = sphereShade;
    context.beginPath();
    context.arc(ballsX, ballsY, sphereInnerRadius, 0, Math.PI * 2);
    context.fill();

    context.restore();

    context.fillStyle = '#0f2650';
    context.beginPath();
    context.ellipse(
      ballsX,
      ballsY + sphereInnerRadius - 1,
      holeHalfWidth,
      11,
      0,
      0,
      Math.PI * 2
    );
    context.fill();

    for (const ball of fallingBalls) {
      const alpha = clamp01(1 - (ball.y - sphereInnerRadius) / 240);
      drawBall(ballsX + ball.x, ballsY + ball.y, 0.95, alpha);
    }

    context.strokeStyle = '#7fd2f6';
    context.lineWidth = 3;
    context.beginPath();
    context.arc(ballsX, ballsY, sphereInnerRadius, Math.PI * 0.08, Math.PI * 0.92);
    context.stroke();

    context.fillStyle = '#e54161';
    context.strokeStyle = '#ffffff';
    context.lineWidth = 5;
    context.font = 'bold 80px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    const ballsLabel = String(ballsCount).padStart(2, '0');
    const ballsLabelY = ballsY - ballsRadius + 34;
    context.strokeText(ballsLabel, ballsX, ballsLabelY);
    context.fillText(ballsLabel, ballsX, ballsLabelY);

    texture.needsUpdate = true;
  };

  draw(
    {
      timeRemaining: 30,
      timeTotal: 30,
      ballsRemaining: 50
    },
    getNowMs()
  );

  return {
    group,
    setPlacement: (x: number, y: number, z: number) => {
      group.position.set(x, y, z);
    },
    setScale: (value: number) => {
      group.scale.setScalar(Math.max(0.2, value));
    },
    setBallsSphereScale: (value: number) => {
      ballsSphereScale = Math.max(0.5, Math.min(3.5, value));
    },
    updateData: (data: StatusDisplayData) => {
      draw(data, getNowMs());
    }
  };
};
