import {
  CanvasTexture,
  Color,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  Shape,
  ShapeGeometry,
  SRGBColorSpace
} from 'three';

const SCREEN_WIDTH = 2.45;
const SCREEN_HEIGHT = 1.18;
const HOUSING_WIDTH = SCREEN_WIDTH * 1.14;
const HOUSING_HEIGHT = SCREEN_HEIGHT * 1.24;
const HOUSING_DEPTH = 0.14;
const CORNER_RADIUS = 0.16;

const createRoundedRectShape = (
  width: number,
  height: number,
  radius: number
): Shape => {
  const halfWidth = width * 0.5;
  const halfHeight = height * 0.5;
  const safeRadius = Math.min(radius, halfWidth * 0.9, halfHeight * 0.9);
  const shape = new Shape();

  shape.moveTo(-halfWidth + safeRadius, -halfHeight);
  shape.lineTo(halfWidth - safeRadius, -halfHeight);
  shape.quadraticCurveTo(
    halfWidth,
    -halfHeight,
    halfWidth,
    -halfHeight + safeRadius
  );
  shape.lineTo(halfWidth, halfHeight - safeRadius);
  shape.quadraticCurveTo(
    halfWidth,
    halfHeight,
    halfWidth - safeRadius,
    halfHeight
  );
  shape.lineTo(-halfWidth + safeRadius, halfHeight);
  shape.quadraticCurveTo(
    -halfWidth,
    halfHeight,
    -halfWidth,
    halfHeight - safeRadius
  );
  shape.lineTo(-halfWidth, -halfHeight + safeRadius);
  shape.quadraticCurveTo(
    -halfWidth,
    -halfHeight,
    -halfWidth + safeRadius,
    -halfHeight
  );

  return shape;
};

const MAX_BALL_ICONS = 50;
const BASE_BALL_RADIUS = 11;
const BALL_GRAVITY = 980;
const RELEASE_INTERVAL_MS = 85;
const LINEAR_DAMPING = 0.9;
const RESTITUTION = 0.12;
const SLEEP_SPEED = 14;
const SLEEP_FRAMES_REQUIRED = 14;
const ENDED_TIMER_HIDE_DELAY_MS = 1000;
const ENDED_COUNT_RELEASE_INTERVAL_MS = 90;
const ENDED_DROP_GRAVITY = 920;
const ENDED_BALL_RADIUS_SCALE = 0.9;
const ENDED_JAR_SLEEP_SPEED = 28;
const ENDED_JAR_SLEEP_FRAMES = 14;
const ENDED_SCORE_REVEAL_DELAY_MS = 2000;
const ENDED_SCORE_INCREMENT = 10;
const ENDED_SCORE_STEP_MS = 380;
const ENDED_SCORE_SLIDE_MS = 320;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const easeOutQuad = (value: number) => {
  const t = clamp01(value);
  return 1 - (1 - t) * (1 - t);
};

export interface StatusDisplayData {
  timeRemaining: number;
  timeTotal: number;
  ballsRemaining: number;
  ballsTotal: number;
  roundEnded: boolean;
  score: number;
  ballsEntered: number;
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

interface EndedDropBall {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface EndedJarBall {
  x: number;
  y: number;
  vx: number;
  vy: number;
  sleepFrames: number;
}

export const createStatusDisplay = (): StatusDisplayVisual => {
  const group = new Group();

  const housingShape = createRoundedRectShape(
    HOUSING_WIDTH,
    HOUSING_HEIGHT,
    CORNER_RADIUS
  );
  const housingGeometry = new ExtrudeGeometry(housingShape, {
    depth: HOUSING_DEPTH,
    bevelEnabled: false,
    curveSegments: 16
  });
  housingGeometry.translate(0, 0, -HOUSING_DEPTH * 0.5);

  const housing = new Mesh(
    housingGeometry,
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

  const screenShape = createRoundedRectShape(SCREEN_WIDTH, SCREEN_HEIGHT, 0.11);
  const screenGeometry = new ShapeGeometry(screenShape, 20);
  screenGeometry.computeBoundingBox();
  const screenBounds = screenGeometry.boundingBox;
  const screenPosition = screenGeometry.getAttribute('position');
  const screenUv = screenGeometry.getAttribute('uv');
  if (screenBounds) {
    const width = Math.max(0.0001, screenBounds.max.x - screenBounds.min.x);
    const height = Math.max(0.0001, screenBounds.max.y - screenBounds.min.y);
    for (let index = 0; index < screenPosition.count; index += 1) {
      const u = (screenPosition.getX(index) - screenBounds.min.x) / width;
      const v = (screenPosition.getY(index) - screenBounds.min.y) / height;
      screenUv.setXY(index, u, v);
    }
    screenUv.needsUpdate = true;
  }
  const screen = new Mesh(
    screenGeometry,
    new MeshBasicMaterial({
      map: texture,
      color: texture ? new Color('#ffffff') : new Color('#9be6ff')
    })
  );

  const bezelShape = createRoundedRectShape(
    HOUSING_WIDTH * 0.96,
    HOUSING_HEIGHT * 0.94,
    CORNER_RADIUS * 0.95
  );
  const bezelCutout = createRoundedRectShape(
    SCREEN_WIDTH * 1.04,
    SCREEN_HEIGHT * 1.06,
    0.125
  );
  bezelShape.holes.push(bezelCutout);

  const bezelGeometry = new ExtrudeGeometry(bezelShape, {
    depth: 0.02,
    bevelEnabled: false,
    curveSegments: 14
  });
  bezelGeometry.translate(0, 0, -0.01);

  const bezel = new Mesh(
    bezelGeometry,
    new MeshPhysicalMaterial({
      color: '#1d1b58',
      metalness: 0.44,
      roughness: 0.22,
      clearcoat: 1,
      clearcoatRoughness: 0.15,
      emissive: '#272277',
      emissiveIntensity: 0.12
    })
  );

  const innerFrameShape = createRoundedRectShape(
    SCREEN_WIDTH * 1.09,
    SCREEN_HEIGHT * 1.11,
    0.14
  );
  const innerFrameCutout = createRoundedRectShape(
    SCREEN_WIDTH * 1.005,
    SCREEN_HEIGHT * 1.01,
    0.112
  );
  innerFrameShape.holes.push(innerFrameCutout);

  const innerFrameGeometry = new ExtrudeGeometry(innerFrameShape, {
    depth: 0.025,
    bevelEnabled: false,
    curveSegments: 14
  });
  innerFrameGeometry.translate(0, 0, -0.0125);

  const innerFrame = new Mesh(
    innerFrameGeometry,
    new MeshPhysicalMaterial({
      color: '#3a4ba0',
      metalness: 0.34,
      roughness: 0.24,
      clearcoat: 1,
      clearcoatRoughness: 0.18,
      emissive: '#3852b2',
      emissiveIntensity: 0.12
    })
  );

  const screenGlass = new Mesh(
    screenGeometry.clone(),
    new MeshPhysicalMaterial({
      color: '#d9f2ff',
      transparent: true,
      opacity: 0.12,
      metalness: 0,
      roughness: 0.05,
      clearcoat: 1,
      clearcoatRoughness: 0,
      transmission: 0.18
    })
  );

  const housingFrontZ = HOUSING_DEPTH * 0.5;
  screen.position.z = housingFrontZ + 0.001;
  bezel.position.z = housingFrontZ + 0.004;
  innerFrame.position.z = housingFrontZ + 0.008;
  screenGlass.position.z = housingFrontZ + 0.01;

  group.add(housing, screen, bezel, innerFrame, screenGlass);

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
  let roundEndedAtMs: number | null = null;
  let endedDisplayedCount = 0;
  let endedFallingBalls: EndedDropBall[] = [];
  let endedJarBalls: EndedJarBall[] = [];
  let endedLastReleaseAtMs = 0;
  let endedLastFrameAtMs: number | null = null;

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

  const simulateSphere = (
    dt: number,
    innerRadius: number,
    ballRadius: number
  ) => {
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

    if (data.roundEnded) {
      if (roundEndedAtMs === null) {
        roundEndedAtMs = nowMs;
      }
    } else {
      roundEndedAtMs = null;
      endedDisplayedCount = 0;
      endedFallingBalls = [];
      endedJarBalls = [];
      endedLastReleaseAtMs = 0;
      endedLastFrameAtMs = null;
    }

    const showEndedLayout =
      data.roundEnded &&
      roundEndedAtMs !== null &&
      nowMs - roundEndedAtMs >= ENDED_TIMER_HIDE_DELAY_MS;

    context.clearRect(0, 0, canvas.width, canvas.height);

    const bg = context.createLinearGradient(0, 0, 0, canvas.height);
    if (showEndedLayout) {
      bg.addColorStop(0, '#9ce0ff');
      bg.addColorStop(0.58, '#7ed0fb');
      bg.addColorStop(1, '#6cb5ea');
    } else {
      bg.addColorStop(0, '#8fd9ff');
      bg.addColorStop(1, '#6bc8ff');
    }
    context.fillStyle = bg;
    context.fillRect(0, 0, canvas.width, canvas.height);

    if (showEndedLayout) {
      const bloom = context.createRadialGradient(
        canvas.width * 0.26,
        canvas.height * 0.24,
        40,
        canvas.width * 0.26,
        canvas.height * 0.24,
        canvas.width * 0.72
      );
      bloom.addColorStop(0, 'rgba(255,255,255,0.22)');
      bloom.addColorStop(1, 'rgba(255,255,255,0)');
      context.fillStyle = bloom;
      context.fillRect(0, 0, canvas.width, canvas.height);

      const floor = context.createLinearGradient(
        0,
        canvas.height * 0.62,
        0,
        canvas.height
      );
      floor.addColorStop(0, 'rgba(63,110,167,0)');
      floor.addColorStop(1, 'rgba(50,86,142,0.32)');
      context.fillStyle = floor;
      context.fillRect(
        0,
        canvas.height * 0.62,
        canvas.width,
        canvas.height * 0.38
      );
    }

    const timerX = canvas.width * 0.29;
    const timerY = canvas.height * 0.3 + 170;
    const timerRadius = 146;

    if (!showEndedLayout) {
      const timerLabelX = timerX;
      const ballsLabelX = canvas.width * 0.75;
      const labelTopY = 84;
      const labelBottomY = 126;

      context.fillStyle = '#16326a';
      context.font = 'bold 58px Arial';
      context.textAlign = 'center';
      context.fillText('TIME', timerLabelX, labelTopY);
      context.font = 'bold 40px Arial';
      context.fillText('REMAINING', timerLabelX, labelBottomY);

      context.font = 'bold 58px Arial';
      context.fillText('BALLS', ballsLabelX, labelTopY);
      context.font = 'bold 40px Arial';
      context.fillText('REMAINING', ballsLabelX, labelBottomY);

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

      const incrementCount = 12;
      const markerRadius = timerRadius;
      for (let index = 0; index < incrementCount; index += 1) {
        const angle = startAngle + (index / incrementCount) * Math.PI * 2;
        const markerX = timerX + Math.cos(angle) * markerRadius;
        const markerY = timerY + Math.sin(angle) * markerRadius;
        const isMajor = index % 3 === 0;

        context.fillStyle = isMajor
          ? 'rgba(255, 255, 255, 0.78)'
          : 'rgba(255, 255, 255, 0.5)';
        context.beginPath();
        context.arc(markerX, markerY, isMajor ? 4.8 : 3.1, 0, Math.PI * 2);
        context.fill();
      }

      const needleAngle = startAngle + Math.PI * 2 * elapsed;
      const needleLength = timerRadius - 18;

      const needleTipX = timerX + Math.cos(needleAngle) * needleLength;
      const needleTipY = timerY + Math.sin(needleAngle) * needleLength;
      const needlePerpX = -Math.sin(needleAngle);
      const needlePerpY = Math.cos(needleAngle);
      const needleBaseHalfWidth = 7;
      const needleTailLength = 10;
      const needleTailX = timerX - Math.cos(needleAngle) * needleTailLength;
      const needleTailY = timerY - Math.sin(needleAngle) * needleTailLength;

      context.fillStyle = '#9be9ff';
      context.strokeStyle = '#1e5fb8';
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(
        timerX + needlePerpX * needleBaseHalfWidth,
        timerY + needlePerpY * needleBaseHalfWidth
      );
      context.lineTo(needleTipX, needleTipY);
      context.lineTo(
        timerX - needlePerpX * needleBaseHalfWidth,
        timerY - needlePerpY * needleBaseHalfWidth
      );
      context.lineTo(needleTailX, needleTailY);
      context.closePath();
      context.fill();
      context.stroke();
    }

    const ballsX = canvas.width * 0.75;
    const ballsY = timerY;
    const ballsRadius = 146;
    const sphereInnerRadius = ballsRadius - 22;
    const holeHalfWidth = 24;

    const ballsCount = Math.max(
      0,
      Math.min(MAX_BALL_ICONS, Math.floor(data.ballsRemaining))
    );
    const ballsTotal = Math.max(0, Math.floor(data.ballsTotal));
    const showAllDroppedMessage = ballsCount <= 0 && ballsTotal > 0;
    const ballRadius = getBallRadius();

    if (showEndedLayout) {
      const enteredCount = Math.max(
        0,
        Math.min(ballsTotal, Math.floor(data.ballsEntered))
      );
      const jarX = canvas.width * 0.24;

      const pedestalTopY = canvas.height - 106;
      const pedestalWidth = 256;
      const pedestalHeight = 26;
      const pedestalBottomY = pedestalTopY + pedestalHeight;

      const pedestalShadow = context.createRadialGradient(
        jarX,
        pedestalBottomY + 30,
        pedestalWidth * 0.2,
        jarX,
        pedestalBottomY + 30,
        pedestalWidth * 0.72
      );
      pedestalShadow.addColorStop(0, 'rgba(12, 33, 68, 0.38)');
      pedestalShadow.addColorStop(1, 'rgba(12, 33, 68, 0)');
      context.fillStyle = pedestalShadow;
      context.beginPath();
      context.ellipse(
        jarX,
        pedestalBottomY + 30,
        pedestalWidth * 0.72,
        34,
        0,
        0,
        Math.PI * 2
      );
      context.fill();

      const pedestalTop = context.createLinearGradient(
        jarX,
        pedestalTopY - 14,
        jarX,
        pedestalTopY + 16
      );
      pedestalTop.addColorStop(0, '#8fb2ff');
      pedestalTop.addColorStop(1, '#5f82cd');
      context.fillStyle = pedestalTop;
      context.beginPath();
      context.ellipse(
        jarX,
        pedestalTopY,
        pedestalWidth * 0.5,
        16,
        0,
        0,
        Math.PI * 2
      );
      context.fill();

      const pedestalBody = context.createLinearGradient(
        jarX - pedestalWidth * 0.5,
        pedestalTopY,
        jarX + pedestalWidth * 0.5,
        pedestalTopY
      );
      pedestalBody.addColorStop(0, '#36579f');
      pedestalBody.addColorStop(0.5, '#4f74c3');
      pedestalBody.addColorStop(1, '#2f4d8d');
      context.fillStyle = pedestalBody;
      context.fillRect(
        jarX - pedestalWidth * 0.5,
        pedestalTopY,
        pedestalWidth,
        pedestalHeight
      );

      const supportWidth = 82;
      const supportTopY = pedestalBottomY - 3;
      const supportHeight = 82;
      const supportBottomY = supportTopY + supportHeight;

      const supportBody = context.createLinearGradient(
        jarX - supportWidth * 0.5,
        supportTopY,
        jarX + supportWidth * 0.5,
        supportTopY
      );
      supportBody.addColorStop(0, '#28467f');
      supportBody.addColorStop(0.45, '#4369b6');
      supportBody.addColorStop(1, '#1f386f');
      context.fillStyle = supportBody;
      context.fillRect(
        jarX - supportWidth * 0.5,
        supportTopY,
        supportWidth,
        supportHeight
      );

      context.fillStyle = '#27417d';
      context.beginPath();
      context.ellipse(
        jarX,
        supportBottomY,
        supportWidth * 0.5,
        12,
        0,
        0,
        Math.PI * 2
      );
      context.fill();

      const pedestalLip = context.createLinearGradient(
        jarX,
        pedestalBottomY - 20,
        jarX,
        pedestalBottomY + 18
      );
      pedestalLip.addColorStop(0, '#4f73be');
      pedestalLip.addColorStop(1, '#284780');
      context.fillStyle = pedestalLip;
      context.beginPath();
      context.ellipse(
        jarX,
        pedestalBottomY,
        pedestalWidth * 0.5,
        18,
        0,
        0,
        Math.PI * 2
      );
      context.fill();

      const jarScale = 1.5;
      const jarWidth = 196 * jarScale;
      const jarHeight = 254 * jarScale;
      const jarBottom = pedestalTopY - 4 * jarScale;
      const jarTop = jarBottom - jarHeight;
      const jarMouthY = jarTop + 16 * jarScale;
      const jarInnerInset = 12 * jarScale;
      const jarInnerWidth = jarWidth - jarInnerInset * 2;

      if (endedLastFrameAtMs === null) {
        endedLastFrameAtMs = nowMs;
      }
      const endedDt = Math.min(
        0.05,
        Math.max(0.001, (nowMs - endedLastFrameAtMs) / 1000)
      );
      endedLastFrameAtMs = nowMs;

      while (
        endedJarBalls.length + endedFallingBalls.length < enteredCount &&
        nowMs - endedLastReleaseAtMs >= ENDED_COUNT_RELEASE_INTERVAL_MS
      ) {
        endedFallingBalls.push({
          x: jarX + (Math.random() - 0.5) * (jarInnerWidth * 0.42),
          y: 18,
          vx: (Math.random() - 0.5) * 26,
          vy: 18
        });
        endedLastReleaseAtMs = nowMs;
      }

      const jarBallRadius = getBallRadius() * ENDED_BALL_RADIUS_SCALE;
      const jarLeft = jarX - jarInnerWidth * 0.5 + jarBallRadius + 2;
      const jarRight = jarX + jarInnerWidth * 0.5 - jarBallRadius - 2;
      const jarFloor = jarBottom - jarBallRadius - 2;
      const jarCeiling = jarMouthY + jarBallRadius + 2;

      for (let index = endedFallingBalls.length - 1; index >= 0; index -= 1) {
        const ball = endedFallingBalls[index];
        ball.vy += ENDED_DROP_GRAVITY * endedDt;
        ball.vx *= 0.995;
        ball.x += ball.vx * endedDt;
        ball.y += ball.vy * endedDt;

        if (
          ball.y >= jarMouthY - jarBallRadius &&
          ball.x >= jarLeft &&
          ball.x <= jarRight
        ) {
          endedFallingBalls.splice(index, 1);
          endedJarBalls.push({
            x: ball.x,
            y: Math.max(jarCeiling, ball.y),
            vx: ball.vx,
            vy: ball.vy,
            sleepFrames: 0
          });
          continue;
        }

        if (ball.y > canvas.height + 40) {
          endedFallingBalls.splice(index, 1);
        }
      }

      const canSleepInJar = endedFallingBalls.length === 0;

      for (const ball of endedJarBalls) {
        const isSleeping =
          canSleepInJar && ball.sleepFrames >= ENDED_JAR_SLEEP_FRAMES;

        if (!isSleeping) {
          ball.vy += ENDED_DROP_GRAVITY * endedDt;
          ball.vx *= 0.95;
          ball.vy *= 0.965;
          ball.x += ball.vx * endedDt;
          ball.y += ball.vy * endedDt;
        }

        if (ball.x < jarLeft) {
          ball.x = jarLeft;
          if (ball.vx < 0) {
            const priorVx = ball.vx;
            ball.vx *= -0.22;
            if (Math.abs(priorVx) > 20) {
              ball.sleepFrames = 0;
            }
          }
        } else if (ball.x > jarRight) {
          ball.x = jarRight;
          if (ball.vx > 0) {
            const priorVx = ball.vx;
            ball.vx *= -0.22;
            if (Math.abs(priorVx) > 20) {
              ball.sleepFrames = 0;
            }
          }
        }

        if (ball.y > jarFloor) {
          ball.y = jarFloor;
          if (ball.vy > 0) {
            ball.vy *= -0.14;
          }
          if (Math.abs(ball.vy) < 16) {
            ball.vy = 0;
          }
          ball.vx *= 0.8;
        } else if (ball.y < jarCeiling) {
          ball.y = jarCeiling;
          if (ball.vy < 0) {
            ball.vy *= -0.1;
          }
          ball.sleepFrames = 0;
        }

        const nearFloor = Math.abs(ball.y - jarFloor) < 0.6;
        const speedNow = Math.hypot(ball.vx, ball.vy);
        if (canSleepInJar && nearFloor && speedNow < ENDED_JAR_SLEEP_SPEED) {
          ball.sleepFrames += 1;
        } else {
          ball.sleepFrames = 0;
        }

        if (ball.sleepFrames >= ENDED_JAR_SLEEP_FRAMES) {
          ball.vx = 0;
          ball.vy = 0;
          ball.y = jarFloor;
        }
      }

      for (let i = 0; i < endedJarBalls.length; i += 1) {
        for (let j = i + 1; j < endedJarBalls.length; j += 1) {
          const left = endedJarBalls[i];
          const right = endedJarBalls[j];
          if (
            left.sleepFrames >= ENDED_JAR_SLEEP_FRAMES &&
            right.sleepFrames >= ENDED_JAR_SLEEP_FRAMES
          ) {
            continue;
          }

          const dx = right.x - left.x;
          const dy = right.y - left.y;
          const distance = Math.hypot(dx, dy);
          const minimumDistance = jarBallRadius * 2;

          if (distance >= minimumDistance || distance <= 0.0001) {
            continue;
          }

          const nx = dx / distance;
          const ny = dy / distance;
          const overlap = minimumDistance - distance;
          const leftSleeping = left.sleepFrames >= ENDED_JAR_SLEEP_FRAMES;
          const rightSleeping = right.sleepFrames >= ENDED_JAR_SLEEP_FRAMES;

          if (leftSleeping && !rightSleeping) {
            right.x += nx * overlap;
            right.y += ny * overlap;
          } else if (!leftSleeping && rightSleeping) {
            left.x -= nx * overlap;
            left.y -= ny * overlap;
          } else {
            left.x -= nx * overlap * 0.5;
            left.y -= ny * overlap * 0.5;
            right.x += nx * overlap * 0.5;
            right.y += ny * overlap * 0.5;
          }

          const relativeVelocity =
            (right.vx - left.vx) * nx + (right.vy - left.vy) * ny;

          if (relativeVelocity < -4) {
            const impulse = -relativeVelocity * 0.06;
            if (!leftSleeping) {
              left.vx -= nx * impulse;
              left.vy -= ny * impulse;
              left.vx *= 0.92;
              left.vy *= 0.92;
              left.sleepFrames = 0;
            }
            if (!rightSleeping) {
              right.vx += nx * impulse;
              right.vy += ny * impulse;
              right.vx *= 0.92;
              right.vy *= 0.92;
              right.sleepFrames = 0;
            }
          }

          left.x = Math.max(jarLeft, Math.min(jarRight, left.x));
          right.x = Math.max(jarLeft, Math.min(jarRight, right.x));
          left.y = Math.max(jarCeiling, Math.min(jarFloor, left.y));
          right.y = Math.max(jarCeiling, Math.min(jarFloor, right.y));
        }
      }

      endedDisplayedCount = Math.min(endedJarBalls.length, enteredCount);

      const jarNeckY = jarTop + 18 * jarScale;

      context.fillStyle = 'rgba(11, 33, 66, 0.28)';
      context.beginPath();
      context.ellipse(
        jarX + 6 * jarScale,
        jarBottom + 16 * jarScale,
        jarWidth * 0.52,
        24 * jarScale,
        0,
        0,
        Math.PI * 2
      );
      context.fill();

      const jarBody = context.createLinearGradient(
        jarX - jarWidth * 0.5,
        jarTop,
        jarX + jarWidth * 0.5,
        jarTop
      );
      jarBody.addColorStop(0, 'rgba(233, 250, 255, 0.28)');
      jarBody.addColorStop(0.24, 'rgba(196, 236, 255, 0.18)');
      jarBody.addColorStop(0.72, 'rgba(155, 214, 248, 0.14)');
      jarBody.addColorStop(1, 'rgba(110, 183, 228, 0.24)');
      context.fillStyle = jarBody;
      context.fillRect(
        jarX - jarWidth * 0.5,
        jarNeckY,
        jarWidth,
        jarHeight - 18 * jarScale
      );

      context.strokeStyle = 'rgba(93, 156, 212, 0.65)';
      context.lineWidth = 3 * jarScale;
      context.beginPath();
      context.moveTo(jarX - jarWidth * 0.5, jarNeckY);
      context.lineTo(jarX - jarWidth * 0.5, jarBottom);
      context.moveTo(jarX + jarWidth * 0.5, jarNeckY);
      context.lineTo(jarX + jarWidth * 0.5, jarBottom);
      context.stroke();

      context.fillStyle = 'rgba(255, 255, 255, 0.24)';
      context.fillRect(
        jarX - jarWidth * 0.33,
        jarTop + 28 * jarScale,
        16 * jarScale,
        jarHeight - 48 * jarScale
      );

      context.fillStyle = 'rgba(18, 55, 109, 0.18)';
      context.fillRect(
        jarX + jarWidth * 0.3,
        jarTop + 22 * jarScale,
        10 * jarScale,
        jarHeight - 32 * jarScale
      );

      context.fillStyle = 'rgba(230, 247, 255, 0.42)';
      context.beginPath();
      context.ellipse(
        jarX,
        jarNeckY,
        jarWidth * 0.5,
        20 * jarScale,
        0,
        0,
        Math.PI * 2
      );
      context.fill();

      context.strokeStyle = '#111111';
      context.lineWidth = 10 * jarScale;
      context.beginPath();
      context.ellipse(
        jarX,
        jarNeckY,
        jarWidth * 0.52,
        22 * jarScale,
        0,
        0,
        Math.PI * 2
      );
      context.stroke();

      context.strokeStyle = 'rgba(208, 235, 255, 0.7)';
      context.lineWidth = 2 * jarScale;
      context.beginPath();
      context.ellipse(
        jarX,
        jarNeckY,
        jarWidth * 0.46,
        17 * jarScale,
        0,
        Math.PI,
        Math.PI * 2
      );
      context.stroke();

      context.fillStyle = 'rgba(240, 252, 255, 0.22)';
      context.strokeStyle = 'rgba(95, 156, 212, 0.42)';
      context.lineWidth = 3 * jarScale;
      context.beginPath();
      context.ellipse(
        jarX,
        jarBottom,
        jarWidth * 0.5,
        22 * jarScale,
        0,
        0,
        Math.PI * 2
      );
      context.fill();
      context.stroke();

      context.save();
      context.beginPath();
      context.rect(
        jarX - jarInnerWidth * 0.5,
        jarMouthY - 4 * jarScale,
        jarInnerWidth,
        jarBottom - jarMouthY + 8 * jarScale
      );
      context.clip();

      for (const ball of endedJarBalls) {
        drawBall(ball.x, ball.y, ENDED_BALL_RADIUS_SCALE, 1, 0);
      }

      for (const ball of endedFallingBalls) {
        drawBall(ball.x, ball.y, ENDED_BALL_RADIUS_SCALE, 1, 0);
      }

      context.restore();

      const jarBadgeCenterY = jarTop + jarHeight * 0.52;
      const jarBadgeRadius = 46 * jarScale;
      context.fillStyle = '#eff7ff';
      context.strokeStyle = '#27488f';
      context.lineWidth = 6 * jarScale;
      context.beginPath();
      context.arc(jarX, jarBadgeCenterY, jarBadgeRadius, 0, Math.PI * 2);
      context.fill();
      context.stroke();

      context.fillStyle = '#e54161';
      context.font = `bold ${Math.round(72 * jarScale)}px Arial`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(
        String(endedDisplayedCount),
        jarX,
        jarBadgeCenterY - 3 * jarScale
      );
      context.fillStyle = '#2a4a90';
      context.font = `bold ${Math.round(30 * jarScale)}px Arial`;
      context.fillText('BALLS', jarX, jarBadgeCenterY + 38 * jarScale);

      const dividerX = canvas.width * 0.5;
      const divider = context.createLinearGradient(
        0,
        116,
        0,
        canvas.height - 72
      );
      divider.addColorStop(0, 'rgba(59, 102, 176, 0.35)');
      divider.addColorStop(0.5, 'rgba(45, 85, 154, 0.7)');
      divider.addColorStop(1, 'rgba(46, 81, 140, 0.3)');
      context.strokeStyle = divider;
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(dividerX, 116);
      context.lineTo(dividerX, canvas.height - 72);
      context.stroke();

      context.strokeStyle = 'rgba(212, 233, 255, 0.48)';
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(dividerX + 4, 118);
      context.lineTo(dividerX + 4, canvas.height - 74);
      context.stroke();

      const resultCenterY = ballsY - 20;
      const resultRadius = 141;
      const resultSlideDistance = resultRadius * 2.2;
      const resultTopStartY = -resultRadius - 8;
      const enteredCountForScore = Math.max(0, Math.floor(data.ballsEntered));
      const roundedScore = enteredCountForScore * ENDED_SCORE_INCREMENT;
      const totalScoreSteps = enteredCountForScore;
      const scoreRevealStartAtMs =
        (roundEndedAtMs ?? nowMs) +
        ENDED_TIMER_HIDE_DELAY_MS +
        ENDED_SCORE_REVEAL_DELAY_MS;
      const scoreRevealElapsedMs = nowMs - scoreRevealStartAtMs;

      const drawResultCircle = (
        centerY: number,
        content: 'great' | number,
        alpha = 1
      ): void => {
        context.save();
        context.globalAlpha = clamp01(alpha);

        context.fillStyle = 'rgba(17, 50, 103, 0.22)';
        context.beginPath();
        context.ellipse(
          ballsX + 8,
          centerY + resultRadius * 0.76,
          resultRadius * 0.72,
          24,
          0,
          0,
          Math.PI * 2
        );
        context.fill();

        const badgeGradient = context.createLinearGradient(
          ballsX,
          centerY - resultRadius,
          ballsX,
          centerY + resultRadius
        );
        badgeGradient.addColorStop(0, '#ffffff');
        badgeGradient.addColorStop(0.52, '#f5f8ff');
        badgeGradient.addColorStop(1, '#e3ebfb');
        context.fillStyle = badgeGradient;
        context.strokeStyle = '#dc4a68';
        context.lineWidth = 6;
        context.beginPath();
        context.arc(ballsX, centerY, resultRadius, 0, Math.PI * 2);
        context.fill();
        context.stroke();

        context.strokeStyle = 'rgba(255,255,255,0.7)';
        context.lineWidth = 3;
        context.beginPath();
        context.arc(
          ballsX,
          centerY,
          resultRadius - 12,
          Math.PI * 1.02,
          Math.PI * 1.92
        );
        context.stroke();

        context.textAlign = 'center';
        context.textBaseline = 'middle';

        if (content === 'great') {
          context.fillStyle = '#173778';
          context.font = 'bold 68px Arial';
          context.fillText('GREAT', ballsX, centerY - 14);
          context.fillStyle = '#e54161';
          context.font = 'bold 74px Arial';
          context.fillText('JOB!', ballsX, centerY + 50);
        } else {
          context.fillStyle = '#e54161';
          context.font = 'bold 96px Arial';
          context.fillText(String(content), ballsX, centerY - 10);

          context.strokeStyle = '#173778';
          context.lineWidth = 8;
          context.fillStyle = '#ffffff';
          context.font = 'bold 38px Arial';
          context.strokeText('POINTS!', ballsX, centerY + 52);
          context.fillText('POINTS!', ballsX, centerY + 52);
        }

        context.restore();
      };

      if (scoreRevealElapsedMs < 0) {
        drawResultCircle(resultCenterY, 'great');

        context.fillStyle = '#153572';
        context.font = 'bold 44px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText('CALCULATING', ballsX, ballsY + 126);
      } else if (totalScoreSteps <= 0) {
        drawResultCircle(resultCenterY, 0);
      } else {
        const totalAnimationMs = Math.max(
          ENDED_SCORE_SLIDE_MS,
          totalScoreSteps * ENDED_SCORE_STEP_MS
        );
        const linearProgress = clamp01(scoreRevealElapsedMs / totalAnimationMs);
        const easedProgress = easeOutQuad(linearProgress);
        const stepFloat = easedProgress * totalScoreSteps;
        const completedSteps = Math.floor(stepFloat);

        if (linearProgress >= 1 || completedSteps >= totalScoreSteps) {
          drawResultCircle(resultCenterY, roundedScore);
        } else {
          const toStep = Math.min(totalScoreSteps, completedSteps + 1);
          const toValue = toStep * ENDED_SCORE_INCREMENT;
          const slideProgress = easeOutQuad(stepFloat - completedSteps);

          if (toStep === totalScoreSteps && linearProgress >= 0.94) {
            drawResultCircle(resultCenterY, roundedScore);
            texture.needsUpdate = true;
            return;
          }
          const fromValue = completedSteps * ENDED_SCORE_INCREMENT;
          const fromContent: 'great' | number =
            completedSteps <= 0 ? 'great' : fromValue;
          const fromY = resultCenterY + slideProgress * resultSlideDistance;
          const toY =
            resultTopStartY + (resultCenterY - resultTopStartY) * slideProgress;

          drawResultCircle(fromY, fromContent, 1 - slideProgress * 0.25);
          drawResultCircle(toY, toValue, 0.8 + slideProgress * 0.2);
        }
      }

      texture.needsUpdate = true;
      return;
    }

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

    if (
      pendingReleaseCount > 0 &&
      nowMs - lastReleaseAtMs >= RELEASE_INTERVAL_MS
    ) {
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

    if (showAllDroppedMessage) {
      context.fillStyle = 'rgba(240, 251, 255, 0.92)';
      context.beginPath();
      context.arc(ballsX, ballsY, sphereInnerRadius, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = '#16326a';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.font = 'bold 38px Arial';
      context.fillText('YOU', ballsX, ballsY - 70);
      context.font = 'bold 36px Arial';
      context.fillText('DROPPED ALL', ballsX, ballsY - 26);

      context.fillStyle = '#e54161';
      context.strokeStyle = '#ffffff';
      context.lineWidth = 5;
      context.font = 'bold 92px Arial';
      context.strokeText(String(ballsTotal), ballsX, ballsY + 42);
      context.fillText(String(ballsTotal), ballsX, ballsY + 42);

      context.fillStyle = '#16326a';
      context.font = 'bold 50px Arial';
      context.fillText('BALLS!', ballsX, ballsY + 102);
    } else {
      context.save();
      context.beginPath();
      context.arc(ballsX, ballsY, sphereInnerRadius, 0, Math.PI * 2);
      context.clip();

      const sortedSphereBalls = [...sphereBalls].sort(
        (left, right) => left.z - right.z || left.y - right.y
      );
      for (const ball of sortedSphereBalls) {
        const depth = clamp01(
          (ball.z + sphereInnerRadius) / (sphereInnerRadius * 2)
        );
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
      context.arc(
        ballsX,
        ballsY,
        sphereInnerRadius,
        Math.PI * 0.08,
        Math.PI * 0.92
      );
      context.stroke();

      context.fillStyle = '#e54161';
      context.strokeStyle = '#ffffff';
      context.lineWidth = 5;
      context.font = 'bold 80px Arial';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      const ballsLabel = String(ballsCount).padStart(2, '0');
      const ballsLabelY = ballsY - ballsRadius + 52;
      context.strokeText(ballsLabel, ballsX, ballsLabelY);
      context.fillText(ballsLabel, ballsX, ballsLabelY);
    }

    texture.needsUpdate = true;
  };

  draw(
    {
      timeRemaining: 30,
      timeTotal: 30,
      ballsRemaining: 50,
      ballsTotal: 50,
      roundEnded: false,
      score: 0,
      ballsEntered: 0
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
