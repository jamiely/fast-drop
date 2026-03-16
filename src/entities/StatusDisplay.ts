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

  let lastSignature = '';

  const draw = (data: StatusDisplayData) => {
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
    context.fillText('TIME', canvas.width * 0.31, 86);
    context.font = 'bold 40px Arial';
    context.fillText('REMAINING', canvas.width * 0.31, 126);

    context.font = 'bold 58px Arial';
    context.fillText('BALLS', canvas.width * 0.75, 86);
    context.font = 'bold 40px Arial';
    context.fillText('REMAINING', canvas.width * 0.75, 126);

    const timerX = canvas.width * 0.29;
    const timerY = canvas.height * 0.3 + 120;
    const timerRadius = 146;

    context.lineWidth = 34;
    context.lineCap = 'round';

    context.strokeStyle = '#f0525f';
    context.beginPath();
    context.arc(timerX, timerY, timerRadius, 0, Math.PI * 2);
    context.stroke();

    const startAngle = -Math.PI * 0.5;
    const greenArc = Math.PI * 2 * progress;
    context.strokeStyle = '#2edd76';
    context.beginPath();
    context.arc(timerX, timerY, timerRadius, startAngle, startAngle + greenArc);
    context.stroke();

    context.fillStyle = '#e0fbff';
    context.beginPath();
    context.arc(timerX, timerY, timerRadius - 27, 0, Math.PI * 2);
    context.fill();

    const needleAngle = startAngle + Math.PI * 2 * elapsed;
    const needleLength = timerRadius - 18;
    context.strokeStyle = '#ff3b56';
    context.lineWidth = 12;
    context.beginPath();
    context.moveTo(timerX, timerY);
    context.lineTo(
      timerX + Math.cos(needleAngle) * needleLength,
      timerY + Math.sin(needleAngle) * needleLength
    );
    context.stroke();

    context.fillStyle = '#b11e36';
    context.beginPath();
    context.arc(timerX, timerY, 14, 0, Math.PI * 2);
    context.fill();

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

    context.fillStyle = '#e54161';
    context.strokeStyle = '#ffffff';
    context.lineWidth = 6;
    context.font = 'bold 132px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    const ballsLabel = String(Math.max(0, Math.floor(data.ballsRemaining)));
    context.strokeText(ballsLabel, ballsX, ballsY - 6);
    context.fillText(ballsLabel, ballsX, ballsY - 6);

    const miniBalls = [
      { x: ballsX - 58, y: ballsY + 104 },
      { x: ballsX - 24, y: ballsY + 118 },
      { x: ballsX + 8, y: ballsY + 103 },
      { x: ballsX + 38, y: ballsY + 122 }
    ];
    for (const ball of miniBalls) {
      const miniGradient = context.createRadialGradient(
        ball.x - 6,
        ball.y - 8,
        2,
        ball.x,
        ball.y,
        16
      );
      miniGradient.addColorStop(0, '#ff9cb0');
      miniGradient.addColorStop(1, '#d62b4d');
      context.fillStyle = miniGradient;
      context.beginPath();
      context.arc(ball.x, ball.y, 16, 0, Math.PI * 2);
      context.fill();
    }

    texture.needsUpdate = true;
  };

  draw({
    timeRemaining: 30,
    timeTotal: 30,
    ballsRemaining: 50
  });

  return {
    group,
    setPlacement: (x: number, y: number, z: number) => {
      group.position.set(x, y, z);
    },
    setScale: (value: number) => {
      group.scale.setScalar(Math.max(0.2, value));
    },
    updateData: (data: StatusDisplayData) => {
      const signature = [
        data.timeRemaining.toFixed(2),
        data.timeTotal.toFixed(2),
        Math.floor(data.ballsRemaining)
      ].join('|');

      if (signature === lastSignature) {
        return;
      }

      lastSignature = signature;
      draw(data);
    }
  };
};
