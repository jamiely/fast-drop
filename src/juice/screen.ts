import {
  CanvasTexture,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace
} from 'three';
import type { Heat } from './state';
import { flipScale, lowBalls, timerShake, urgentTime } from './screenLogic';

/** Fever-owned, one-draw screen. Fixed storage; no particles or objects allocated in the frame loop. */
export class FeverScreen {
  private readonly canvas = document.createElement('canvas');
  private readonly g: CanvasRenderingContext2D;
  private readonly texture: CanvasTexture;
  public readonly mesh: Mesh<PlaneGeometry, MeshBasicMaterial>;
  private phase = 0;
  private feedbackAge = Infinity;
  private lastPoints = 0;
  private missed = false;
  private combo = 0;
  private multiplier = 1;
  private heat: Heat = 'calm';

  feedback(points: number): void {
    this.lastPoints = points;
    this.missed = points === 0;
    this.feedbackAge = 0;
  }

  setState(combo: number, multiplier: number, heat: Heat): void {
    this.combo = combo;
    this.multiplier = multiplier;
    this.heat = heat;
  }
  private second = -1;
  private balls = -1;
  private flipAge = 1;
  private dropAge = 1;

  constructor() {
    this.canvas.width = 1024;
    this.canvas.height = 512;
    this.g = this.canvas.getContext('2d')!;
    this.texture = new CanvasTexture(this.canvas);
    this.texture.colorSpace = SRGBColorSpace;
    this.mesh = new Mesh(
      new PlaneGeometry(2.43, 1.16),
      new MeshBasicMaterial({ map: this.texture, toneMapped: false })
    );
    // Between classic's screen (0.071) and its glass (0.08), never coplanar.
    this.mesh.position.z = 0.075;
  }

  update(dt: number, seconds: number, balls: number): void {
    this.phase += dt;
    this.feedbackAge += dt;
    const second = Number.isFinite(seconds)
      ? Math.max(0, Math.ceil(seconds))
      : 60;
    if (second !== this.second) {
      this.second = second;
      this.flipAge = 0;
    }
    if (balls !== this.balls) {
      this.balls = balls;
      this.dropAge = 0;
    }
    this.flipAge += dt;
    this.dropAge += dt;
    const g = this.g;
    const beat = Math.sin(this.phase * Math.PI * 4);
    g.fillStyle = '#100d2c';
    g.fillRect(0, 0, 1024, 512);
    // Slow diagonal dance-floor lanes, quieter behind the instrument faces.
    g.fillStyle = beat > 0 ? '#231340' : '#1d163c';
    const offset = (this.phase * 30) % 160;
    for (let x = -600; x < 1200; x += 160) {
      g.beginPath();
      g.moveTo(x + offset, 0);
      g.lineTo(x + offset + 60, 0);
      g.lineTo(x + offset + 572, 512);
      g.lineTo(x + offset + 512, 512);
      g.fill();
    }
    for (let i = 0; i < 24; i++) {
      const x = (i * 197 + this.phase * (8 + (i % 4))) % 1024;
      const y = (i * 113) % 512;
      g.fillStyle = i % 2 ? '#665488' : '#60819c';
      g.fillRect(x, y, 2 + Math.max(0, beat), 2 + Math.max(0, beat));
    }
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#0c102b';
    g.beginPath();
    g.roundRect(70, 133, 405, 330, 35);
    g.fill();
    g.beginPath();
    g.roundRect(550, 133, 405, 330, 35);
    g.fill();
    g.font = '800 25px system-ui, sans-serif';
    g.fillStyle = '#a9bce5';
    g.fillText(urgentTime(seconds) ? 'FINAL SECONDS' : 'TIME LEFT', 272, 172);
    g.fillText(lowBalls(balls) ? 'LAST BALLS!' : 'BALL HOPPER', 752, 172);
    g.save();
    g.translate(272 + timerShake(seconds, this.phase), 323);
    g.scale(1 / Math.sqrt(flipScale(this.flipAge)), flipScale(this.flipAge));
    g.font = '900 168px system-ui, sans-serif';
    g.fillStyle = urgentTime(seconds) ? '#ff5076' : '#ffffff';
    g.fillText(String(second).padStart(2, '0'), 0, 0);
    g.restore();
    // A bounded, jostling hopper: one bead per remaining ball, up to its 20-ball capacity.
    const visible = Math.min(20, Math.max(0, balls));
    for (let i = 0; i < visible; i++) {
      const row = Math.floor(i / 7);
      const x = 610 + (i % 7) * 47 + Math.sin(this.phase * 4 + i) * 3;
      const y =
        416 -
        row * 33 +
        Math.sin(this.phase * 5 + i * 2) *
          (2 + Math.max(0, 1 - this.dropAge * 3) * 9);
      g.fillStyle = i % 2 ? '#ffafdd' : '#8eeafb';
      g.beginPath();
      g.arc(x, y, 16, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(x - 4, y - 5, 4, 0, Math.PI * 2);
      g.fill();
    }
    g.save();
    g.translate(
      752 + (lowBalls(balls) ? Math.sin(this.phase * 23) * 3 : 0),
      280
    );
    g.scale(1, flipScale(this.dropAge));
    g.font = '900 104px system-ui, sans-serif';
    g.fillStyle = lowBalls(balls) && beat > 0 ? '#ff5076' : '#ffffff';
    g.fillText(String(Math.max(0, balls)), 0, 0);
    g.restore();
    g.font = '700 21px system-ui, sans-serif';
    g.fillStyle = '#a9bce5';
    g.fillText('SECONDS', 272, 422);
    // A dedicated feedback ribbon never covers the two persistent instruments.
    g.save();
    g.translate(220, 65);
    g.scale(flipScale(this.feedbackAge), flipScale(this.feedbackAge));
    g.font = '900 80px system-ui, sans-serif';
    g.fillStyle = this.missed ? '#ff7ca3' : '#8eeafb';
    g.fillText(
      this.feedbackAge === Infinity
        ? 'DROP!'
        : this.missed
          ? 'MISS'
          : `+${this.lastPoints}`,
      0,
      0
    );
    g.restore();
    g.fillStyle = '#ffffff';
    g.font = '900 36px system-ui, sans-serif';
    g.fillText(`${this.combo} COMBO`, 530, 55);
    g.fillStyle = '#f4d674';
    g.fillText(`${this.heat.toUpperCase()}  ×${this.multiplier}`, 815, 55);
    g.font = '700 19px system-ui, sans-serif';
    g.fillStyle = '#a9bce5';
    g.fillText(
      this.feedbackAge === Infinity
        ? 'READY WHEN YOU ARE'
        : this.missed
          ? 'NEXT ONE IS YOURS'
          : 'LAST HIT',
      220,
      111
    );
    this.texture.needsUpdate = true;
  }

  get snapshot() {
    return {
      seconds: this.second,
      balls: this.balls,
      combo: this.combo,
      multiplier: this.multiplier,
      heat: this.heat,
      points: this.lastPoints,
      missed: this.missed
    };
  }

  reset(): void {
    this.phase = 0;
    this.feedbackAge = Infinity;
    this.lastPoints = 0;
    this.missed = false;
    this.combo = 0;
    this.multiplier = 1;
    this.heat = 'calm';
    this.second = -1;
    this.balls = -1;
  }
  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.texture.dispose();
  }
}
