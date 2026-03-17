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
  updateData: (data: StatusDisplayData) => void;
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

  const MAX_BALL_ICONS = 50;

  interface DroppingBallAnimation {
    x: number;
    fromY: number;
    toY: number;
    startedAtMs: number;
    durationMs: number;
  }

  let lastSignature = '';
  let lastBallsRemaining = MAX_BALL_ICONS;
  const droppingBallAnimations: DroppingBallAnimation[] = [];

  const getNowMs = () =>
    typeof performance !== 'undefined' ? performance.now() : Date.now();

  const createBallSlots = (
    centerX: number,
    centerY: number,
    radius: number
  ): Array<{ x: number; y: number }> => {
    const slots: Array<{ x: number; y: number }> = [];
    const spacing = 24;

    let row = 0;
    for (let y = -radius; y <= radius; y += spacing) {
      const offset = row % 2 === 0 ? 0 : spacing * 0.5;
      for (let x = -radius; x <= radius; x += spacing) {
        const slotX = x + offset;
        if (Math.hypot(slotX, y) <= radius - 12) {
          slots.push({
            x: centerX + slotX,
            y: centerY + y
          });
        }
      }
      row += 1;
    }

    slots.sort((left, right) => left.y - right.y || left.x - right.x);
    return slots.slice(0, MAX_BALL_ICONS);
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
    context.lineWidth = 18;
    context.strokeStyle = '#1a4291';
    context.beginPath();
    context.arc(ballsX, ballsY, ballsRadius, 0, Math.PI * 2);
    context.stroke();

    const ballsBg = context.createRadialGradient(
      ballsX,
      ballsY - 20,
      14,
      ballsX,
      ballsY,
      ballsRadius
    );
    ballsBg.addColorStop(0, '#d8fbff');
    ballsBg.addColorStop(1, '#9be3ff');
    context.fillStyle = ballsBg;
    context.beginPath();
    context.arc(ballsX, ballsY, ballsRadius - 10, 0, Math.PI * 2);
    context.fill();

    const ballsCount = Math.max(
      0,
      Math.min(MAX_BALL_ICONS, Math.floor(data.ballsRemaining))
    );
    const ballSlots = createBallSlots(ballsX, ballsY, ballsRadius - 20);

    if (ballsCount < lastBallsRemaining) {
      const removedCount = Math.min(lastBallsRemaining - ballsCount, 6);
      for (let index = 0; index < removedCount; index += 1) {
        const slotIndex = Math.min(ballSlots.length - 1, ballsCount + index);
        const slot = ballSlots[slotIndex];
        droppingBallAnimations.push({
          x: slot.x,
          fromY: slot.y,
          toY: ballsY + ballsRadius + 64,
          startedAtMs: nowMs + index * 40,
          durationMs: 320
        });
      }
    } else if (ballsCount > lastBallsRemaining) {
      droppingBallAnimations.length = 0;
    }
    lastBallsRemaining = ballsCount;

    for (let index = 0; index < ballsCount; index += 1) {
      const slot = ballSlots[index];
      const miniGradient = context.createRadialGradient(
        slot.x - 3,
        slot.y - 5,
        2,
        slot.x,
        slot.y,
        10
      );
      miniGradient.addColorStop(0, '#ffc1cd');
      miniGradient.addColorStop(1, '#d62b4d');
      context.fillStyle = miniGradient;
      context.beginPath();
      context.arc(slot.x, slot.y, 8, 0, Math.PI * 2);
      context.fill();
    }

    for (let index = droppingBallAnimations.length - 1; index >= 0; index -= 1) {
      const animation = droppingBallAnimations[index];
      const progress = clamp01(
        (nowMs - animation.startedAtMs) / animation.durationMs
      );
      if (progress >= 1) {
        droppingBallAnimations.splice(index, 1);
        continue;
      }

      const eased = progress * progress;
      const y = animation.fromY + (animation.toY - animation.fromY) * eased;
      context.globalAlpha = 1 - progress * 0.75;
      const miniGradient = context.createRadialGradient(
        animation.x - 3,
        y - 5,
        2,
        animation.x,
        y,
        10
      );
      miniGradient.addColorStop(0, '#ffc1cd');
      miniGradient.addColorStop(1, '#d62b4d');
      context.fillStyle = miniGradient;
      context.beginPath();
      context.arc(animation.x, y, 8, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 1;
    }

    context.fillStyle = '#16326a';
    context.strokeStyle = '#e0fbff';
    context.lineWidth = 4;
    context.font = 'bold 72px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    const ballsLabel = String(ballsCount).padStart(2, '0');
    context.strokeText(ballsLabel, ballsX, ballsY - 4);
    context.fillText(ballsLabel, ballsX, ballsY - 4);

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
    updateData: (data: StatusDisplayData) => {
      const nowMs = getNowMs();
      const signature = [
        data.timeRemaining.toFixed(2),
        data.timeTotal.toFixed(2),
        Math.floor(data.ballsRemaining)
      ].join('|');

      const hasActiveDropAnimation = droppingBallAnimations.some(
        (animation) => nowMs - animation.startedAtMs < animation.durationMs
      );

      if (signature === lastSignature && !hasActiveDropAnimation) {
        return;
      }

      lastSignature = signature;
      draw(data, nowMs);
    }
  };
};
