import {
  CanvasTexture,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace
} from 'three';
import type { Heat } from './state';
import {
  flipScale,
  INSTRUMENT_STRIP_Y,
  scheduleTakeover,
  takeoverVisible,
  type Takeover,
  lowBalls,
  screenMood,
  timerShake,
  urgentTime
} from './screenLogic';

const TAKEOVER_COLORS = ['#ff66b7', '#f4d674', '#8eeafb', '#b690ff'];

/** Fever-owned, one-draw screen. Fixed storage; no particles or objects allocated in the frame loop. */
export class FeverScreen {
  private readonly canvas = document.createElement('canvas');
  private readonly g: CanvasRenderingContext2D;
  private readonly texture: CanvasTexture;
  public readonly mesh: Mesh<PlaneGeometry, MeshBasicMaterial>;
  private phase = 0;
  private takeover: Takeover = 'none';
  private takeoverAge = Infinity;
  private streak = 0;

  celebrate(kind: Takeover, combo: number): void {
    const next = scheduleTakeover(this.takeover, this.takeoverAge, kind);
    if (next !== kind) return;
    this.takeover = next;
    this.takeoverAge = 0;
    this.streak = combo;
  }
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
    this.takeoverAge += dt;
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
    this.paintMascot(seconds);
    if (takeoverVisible(this.takeover, this.takeoverAge))
      this.paintTakeover(seconds, balls);
    this.texture.needsUpdate = true;
  }

  private paintTakeover(seconds: number, balls: number): void {
    const g = this.g;
    const fever = this.takeover === 'fever';
    g.fillStyle = fever ? '#20113f' : '#15263c';
    g.fillRect(0, 0, 1024, 512);
    // A rainbow fan and little dancing stars are all on the display, not another world layer.
    const colors = TAKEOVER_COLORS;
    for (let i = 0; i < 4; i++) {
      g.strokeStyle = colors[i];
      g.lineWidth = 15;
      g.beginPath();
      g.arc(512, 440, 265 + i * 24, Math.PI + 0.12, -0.12);
      g.stroke();
    }
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 18; i++) {
      const x = (i * 157 + this.phase * 23) % 1024;
      const y = 35 + ((i * 83) % 330);
      const size = 3 + Math.sin(this.phase * 9 + i) * 2;
      g.fillRect(x - size, y, size * 2, 3);
      g.fillRect(x, y - size, 3, size * 2);
    }
    if (fever) {
      g.save();
      g.translate(512, 117);
      g.rotate(Math.sin(this.phase * 3) * 0.12);
      g.fillStyle = '#cddced';
      g.beginPath();
      g.arc(0, 0, 68, 0, Math.PI * 2);
      g.fill();
      g.save();
      g.clip();
      for (let row = -3; row <= 3; row++)
        for (let col = -3; col <= 3; col++) {
          g.fillStyle = colors[(row + col + 8) % 4];
          g.fillRect(
            col * 21 - 9 + Math.sin(this.phase * 3) * 8,
            row * 21 - 9,
            16,
            16
          );
        }
      g.restore();
      g.restore();
    }
    g.save();
    g.translate(512, fever ? 270 : 230);
    const pop = flipScale(this.takeoverAge);
    g.scale(1 / Math.sqrt(pop), pop);
    g.fillStyle = '#ffffff';
    g.font = 'italic 900 100px system-ui, sans-serif';
    g.fillText(fever ? 'FEVER!!' : `${this.streak} COMBO!`, 0, 0);
    g.restore();
    g.font = '900 36px system-ui, sans-serif';
    g.fillStyle = '#f4d674';
    g.fillText(
      fever ? `DISCO OVERDRIVE  ×${this.multiplier}` : 'KEEP THE STREAK ALIVE',
      512,
      350
    );
    // Painted last, outside the takeover artwork: the countdown never disappears.
    g.fillStyle = '#0c102b';
    g.fillRect(0, INSTRUMENT_STRIP_Y, 1024, 112);
    g.font = '900 47px system-ui, sans-serif';
    g.fillStyle = urgentTime(seconds) ? '#ff5076' : '#ffffff';
    g.fillText(
      `TIME  ${String(this.second).padStart(2, '0')}`,
      265 + timerShake(seconds, this.phase),
      458
    );
    g.fillStyle = lowBalls(balls) ? '#ff7ca3' : '#8eeafb';
    g.fillText(`BALLS  ${Math.max(0, balls)}`, 755, 458);
  }

  private paintMascot(seconds: number): void {
    const g = this.g;
    const mood = screenMood(seconds, this.feedbackAge, this.missed);
    const bounce = Math.sin(this.phase * 8);
    g.save();
    g.translate(512, 310 + bounce * 7);
    g.rotate(Math.sin(this.phase * 4) * 0.09);
    const pop = flipScale(this.feedbackAge);
    g.scale(1 / Math.sqrt(pop), pop);
    g.fillStyle = '#f4d674';
    g.strokeStyle = '#211738';
    g.lineWidth = 7;
    g.beginPath();
    g.arc(0, 0, 54, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.strokeStyle = '#211738';
    g.lineWidth = 6;
    g.lineCap = 'round';
    for (let side = -1; side <= 1; side += 2) {
      const x = side * 21;
      if (mood === 'cheer') {
        g.beginPath();
        g.moveTo(x - 10, -9);
        g.quadraticCurveTo(x, -25, x + 10, -9);
        g.stroke();
      } else {
        g.fillStyle = '#211738';
        g.beginPath();
        g.ellipse(x, -12, 6, mood === 'gasp' ? 12 : 9, 0, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = '#f67ba8';
      g.beginPath();
      g.ellipse(side * 33, 9, 10, 6, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#211738';
    g.beginPath();
    if (mood === 'gasp') g.ellipse(0, 22, 10, 15, 0, 0, Math.PI * 2);
    else {
      g.moveTo(-18, 12);
      g.quadraticCurveTo(0, mood === 'cheer' ? 55 : 38, 18, 12);
      g.closePath();
    }
    g.fill();
    if (mood === 'sweat') {
      g.fillStyle = '#8eeafb';
      for (let i = 0; i < 2; i++) {
        const y = -38 + ((this.phase * 65 + i * 35) % 65);
        g.beginPath();
        g.moveTo(46 + i * 12, y - 13);
        g.quadraticCurveTo(30 + i * 12, y + 12, 46 + i * 12, y + 12);
        g.quadraticCurveTo(60 + i * 12, y + 12, 46 + i * 12, y - 13);
        g.fill();
      }
    }
    g.restore();
  }

  get snapshot() {
    return {
      takeover: takeoverVisible(this.takeover, this.takeoverAge)
        ? this.takeover
        : 'none',
      instrumentsVisible: true,
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
    this.takeover = 'none';
    this.takeoverAge = Infinity;
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
