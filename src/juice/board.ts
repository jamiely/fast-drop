import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  type Camera,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
  type BufferGeometry,
  type Material
} from 'three';
import {
  approachScore,
  boardBounce,
  COUNTDOWN_SECONDS,
  countdownPulse,
  MARQUEE_CHASE,
  odometer,
  scoreDigits,
  spring,
  stepTumble,
  tumbleScale,
  type TumbleBall
} from './boardLogic';
import { HEAT_COLOR, roundedRectPoints } from './show';
import type { Heat } from './state';

// Status display housing, in its local units (StatusDisplay.ts: screen 2.45 × 1.18, housing ×1.14 / ×1.24).
const HOUSING_WIDTH = 2.45 * 1.14;
const HOUSING_HEIGHT = 1.18 * 1.24;
const FRONT_Z = 0.07;
const BULBS = 40;
/** Colours above 1 are what the bloom threshold picks up. */
const GLOW_GAIN = 2.4;
const PLATE_W = 1.36;
const PLATE_H = 0.36;
const PLATE_Y = HOUSING_HEIGHT / 2 - 0.05;
// Classic's timer dial on its 1024 × 512 canvas (StatusDisplay.ts: centre 0.29 w, 0.3 h + 170; radius 146),
// mapped onto the 2.45 × 1.18 screen.
const DIAL_X = (0.29 - 0.5) * 2.45;
const DIAL_Y = (0.5 - (512 * 0.3 + 170) / 512) * 1.18;
const DIAL_SIZE = ((146 * 2) / 1024) * 2.45 * 1.3;
// The hole at the bottom of classic's ball sphere (centre 0.75 w, the dial's height; inner radius 124 px).
const HOLE_X = (0.75 - 0.5) * 2.45;
const HOLE_Y = (0.5 - (512 * 0.3 + 170 + 124) / 512) * 1.18;
const LIP_Y = -HOUSING_HEIGHT / 2 + 0.02;
const TUMBLERS = 12;
const CANVAS_W = 680;
const CANVAS_H = 180;
const DIGIT_COLOR: Record<Heat, string> = {
  calm: '#ffe78a',
  warm: '#ffe78a',
  hot: '#ff9be6',
  fever: '#ffffff'
};

/**
 * Fever's dressing on classic's status display: a chasing bulb marquee round the housing, a rolling score
 * plate on its top edge, and a squash on every jar hit. It follows the display without joining its group, so
 * the portrait fit (which measures that group) is unchanged; three draws in all.
 */
export class FeverBoard {
  public readonly root = new Group();
  private readonly disposables: Array<
    BufferGeometry | Material | InstancedMesh | CanvasTexture
  > = [];
  private readonly bulbs: InstancedMesh;
  private readonly halos: InstancedMesh;
  private readonly spots: Array<[number, number]>;
  private readonly plate: Mesh;
  /** The last 10 s: a red glow ring over the dial with the seconds left in its face. */
  private readonly alarm: Mesh<PlaneGeometry, MeshBasicMaterial>;
  private readonly alarmCanvas = document.createElement('canvas');
  private readonly alarmTexture: CanvasTexture;
  private alarmSecond = -1;
  private readonly tumblers: InstancedMesh;
  private readonly tumbling: TumbleBall[] = [];
  private balls = -1;
  private time = Infinity;
  private readonly canvas = document.createElement('canvas');
  private readonly context: CanvasRenderingContext2D | null;
  private readonly texture: CanvasTexture;
  private readonly scratch = new Object3D();
  private readonly color = new Color();
  private readonly baseScale = new Vector3();
  private phase = 0;
  private hue = 0;
  private rolled = 0;
  private target = 0;
  private flash = 0;
  private popAge = Infinity;
  private bounceAge = Infinity;
  private bounceWeight = 2;
  private bouncing = false;
  private painted = '';
  private animated = true;

  public constructor(private readonly display: Group) {
    // Bulbs the score plate covers on the top edge are left out.
    this.spots = roundedRectPoints(
      HOUSING_WIDTH * 1.025,
      HOUSING_HEIGHT * 1.04,
      0.19,
      BULBS
    ).map(([x, y]) =>
      y > 0 && Math.abs(x) < PLATE_W / 2 + 0.08 ? [x, -99] : [x, y]
    );
    this.bulbs = this.instanced(
      new SphereGeometry(0.042, 10, 8),
      new MeshBasicMaterial({ color: '#ffffff', toneMapped: false })
    );
    const halo = document.createElement('canvas');
    halo.width = halo.height = 64;
    const g = halo.getContext('2d');
    if (g) {
      const gradient = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(255,255,255,0.9)');
      gradient.addColorStop(0.3, 'rgba(255,255,255,0.35)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gradient;
      g.fillRect(0, 0, 64, 64);
    }
    this.halos = this.instanced(
      new PlaneGeometry(0.2, 0.2),
      new MeshBasicMaterial({
        map: this.track(new CanvasTexture(halo)),
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false
      })
    );
    this.spots.forEach(([x, y], i) => {
      const scale = y > -99 ? 1 : 0;
      this.place(this.bulbs, i, x, y, FRONT_Z + 0.03, scale);
      this.place(this.halos, i, x, y, FRONT_Z + 0.02, scale);
    });

    this.canvas.width = CANVAS_W;
    this.canvas.height = CANVAS_H;
    this.context = this.canvas.getContext('2d');
    this.texture = this.track(new CanvasTexture(this.canvas));
    this.texture.colorSpace = SRGBColorSpace;
    this.plate = new Mesh(
      this.track(new PlaneGeometry(PLATE_W, PLATE_H)),
      this.track(
        new MeshBasicMaterial({
          map: this.texture,
          transparent: true,
          toneMapped: false
        })
      )
    );
    this.plate.position.set(0, PLATE_Y, FRONT_Z + 0.06);
    this.alarmCanvas.width = this.alarmCanvas.height = 256;
    this.alarmTexture = this.track(new CanvasTexture(this.alarmCanvas));
    this.alarmTexture.colorSpace = SRGBColorSpace;
    this.alarm = new Mesh(
      this.track(new PlaneGeometry(DIAL_SIZE, DIAL_SIZE)),
      this.track(
        new MeshBasicMaterial({
          map: this.alarmTexture,
          transparent: true,
          depthWrite: false,
          toneMapped: false
        })
      )
    );
    this.alarm.position.set(DIAL_X, DIAL_Y, FRONT_Z + 0.015);
    this.alarm.visible = false;
    this.tumblers = this.instanced(
      new SphereGeometry(0.052, 12, 10),
      new MeshStandardMaterial({
        color: '#e0304f',
        roughness: 0.35,
        emissive: '#ff3355',
        emissiveIntensity: 0.25
      }),
      TUMBLERS
    );
    for (let i = 0; i < TUMBLERS; i += 1) {
      this.tumblers.setColorAt(i, this.color.set('#ffffff'));
      this.place(this.tumblers, i, 0, 0, 0, 0);
    }
    this.root.add(
      this.halos,
      this.bulbs,
      this.plate,
      this.alarm,
      this.tumblers
    );
    this.paint('calm');
  }

  /** The score the plate rolls toward. */
  public setScore(score: number): void {
    const next = Math.max(0, Math.floor(score));
    if (next > this.target) {
      this.flash = 1;
      this.popAge = 0;
    }
    this.target = next;
    if (next < this.rolled) this.rolled = next;
  }

  /** A jar hit of `weight` 2–4 squashes the board. */
  public hit(weight: number): void {
    if (!Number.isFinite(this.bounceAge) || this.bounceAge > 0.05)
      this.bounceWeight = weight;
    else this.bounceWeight = Math.max(this.bounceWeight, weight);
    this.bounceAge = 0;
  }

  public setAnimated(animated: boolean): void {
    this.animated = animated;
  }

  public get score(): number {
    return this.target;
  }

  public get countdown(): boolean {
    return this.alarm.visible;
  }

  public get shown(): number {
    return this.rolled;
  }

  /** World anchors: the score plate's centre and the housing's top-left corner. */
  public anchor(where: 'plate' | 'corner', out: Vector3): Vector3 {
    this.root.updateMatrixWorld();
    if (where === 'plate') out.set(0, PLATE_Y, FRONT_Z + 0.08);
    else out.set(-HOUSING_WIDTH / 2 + 0.1, HOUSING_HEIGHT / 2 - 0.1, FRONT_Z);
    return out.applyMatrix4(this.root.matrixWorld);
  }

  /** A "+N" landed in the plate: the reels kick again. */
  public land(): void {
    this.flash = 1;
    this.popAge = 0;
  }

  /** Largest |NDC| of the plate's corners and the bulbs: the board's own pieces must stay on screen. */
  public maxNdc(camera: Camera): number {
    this.root.updateMatrixWorld();
    const p = new Vector3();
    let max = 0;
    const points: Array<[number, number]> = [
      ...this.spots.filter(([, y]) => y > -99),
      ...[-1, 1].flatMap(
        (sx): Array<[number, number]> =>
          [-1, 1].map((sy) => [
            (sx * PLATE_W) / 2,
            PLATE_Y + (sy * PLATE_H) / 2
          ])
      )
    ];
    for (const [x, y] of points) {
      p.set(x, y, FRONT_Z).applyMatrix4(this.root.matrixWorld).project(camera);
      max = Math.max(max, Math.abs(p.x), Math.abs(p.y));
    }
    return max;
  }

  /** Seconds left in the round; the dial pulses red through the last 10. */
  public setTime(seconds: number): void {
    this.time = seconds;
  }

  /** Balls left; each one used tumbles out of the counter's hole. */
  public setBalls(count: number): void {
    if (this.balls >= 0 && count < this.balls)
      for (let n = 0; n < Math.min(3, this.balls - count); n += 1) {
        if (this.tumbling.length >= TUMBLERS) this.tumbling.shift();
        const side = Math.random() < 0.5 ? -1 : 1;
        this.tumbling.push({
          x: HOLE_X,
          y: HOLE_Y,
          z: FRONT_Z + 0.06,
          vx: side * (0.25 + Math.random() * 0.35),
          vy: -0.2,
          vz: 0.25,
          spin: side * (8 + Math.random() * 6),
          age: -n * 0.08,
          bounced: false
        });
      }
    this.balls = count;
  }

  public update(realDt: number, heat: Heat): void {
    this.root.visible = this.display.visible;
    this.applyBounce(realDt);
    this.root.position.copy(this.display.position);
    this.root.quaternion.copy(this.display.quaternion);
    this.root.scale.copy(this.display.scale);
    if (!this.root.visible) return;

    const chase = MARQUEE_CHASE[heat];
    const dt = this.animated ? realDt : 0;
    this.phase += dt * chase.speed;
    this.hue = (this.hue + dt * 0.5) % 1;
    const head = Math.floor(this.phase);
    for (let i = 0; i < BULBS; i += 1) {
      // Bulbs light in a chasing train; the newest of each train is brightest.
      const step = (((head - i) % chase.period) + chase.period) % chase.period;
      const on = step === 0;
      if (heat === 'fever')
        this.color.setHSL((i / BULBS + this.hue) % 1, 1, 0.6);
      else if (heat === 'calm')
        this.color.set(i % 2 ? '#ffffff' : HEAT_COLOR.calm);
      else this.color.set(HEAT_COLOR[heat]);
      const level = on ? GLOW_GAIN : chase.dim;
      this.bulbs.setColorAt(i, this.color.multiplyScalar(level));
      this.halos.setColorAt(i, this.color.multiplyScalar(on ? 0.45 : 0.15));
      const [x, y] = this.spots[i];
      if (y > -99)
        this.place(this.bulbs, i, x, y, FRONT_Z + 0.03, on ? 1.25 : 0.85);
    }
    this.bulbs.instanceColor!.needsUpdate = true;
    this.halos.instanceColor!.needsUpdate = true;
    this.bulbs.instanceMatrix.needsUpdate = true;

    this.rolled = approachScore(this.rolled, this.target, realDt);
    this.flash = Math.max(0, this.flash - realDt * 3.5);
    this.popAge += realDt;
    const pop = spring(this.popAge, -0.14, 9, 26);
    this.plate.scale.set(2 - pop, pop, 1);
    this.paint(heat);
    this.updateAlarm();
    this.updateTumblers(realDt);
  }

  private updateTumblers(realDt: number): void {
    for (let i = this.tumbling.length - 1; i >= 0; i -= 1) {
      const ball = this.tumbling[i];
      if (ball.age < 0) ball.age += realDt;
      else if (!stepTumble(ball, realDt, LIP_Y)) this.tumbling.splice(i, 1);
    }
    for (let i = 0; i < TUMBLERS; i += 1) {
      const ball = this.tumbling[i];
      if (!ball || ball.age < 0) {
        this.place(this.tumblers, i, 0, 0, 0, 0);
        continue;
      }
      this.scratch.position.set(ball.x, ball.y, ball.z);
      this.scratch.rotation.set(0, 0, ball.spin * ball.age);
      // Stretch along the fall; the bounce snaps it back round.
      const stretch = 1 + Math.min(0.25, Math.abs(ball.vy) * 0.08);
      const s = tumbleScale(ball.age);
      this.scratch.scale.set(s / Math.sqrt(stretch), s * stretch, s);
      this.scratch.updateMatrix();
      this.tumblers.setMatrixAt(i, this.scratch.matrix);
    }
    this.tumblers.instanceMatrix.needsUpdate = true;
  }

  private updateAlarm(): void {
    const live = this.time > 0 && this.time <= COUNTDOWN_SECONDS;
    this.alarm.visible = live;
    if (!live) return;
    const second = Math.ceil(this.time);
    if (second !== this.alarmSecond) this.paintAlarm(second);
    const pulse = countdownPulse(this.time);
    // A lub-dub: the ring swells and flares on each whole second, and never fades below readable.
    this.alarm.scale.setScalar(1 + pulse * 0.12);
    this.alarm.material.opacity = 0.8 + pulse * 0.2;
  }

  private paintAlarm(second: number): void {
    this.alarmSecond = second;
    const g = this.alarmCanvas.getContext('2d');
    if (!g) return;
    const c = 128;
    g.clearRect(0, 0, 256, 256);
    // Glow ring around the dial's track (the dial's outer edge sits at 1 / 1.3 of this plane's half-size).
    const ring = g.createRadialGradient(c, c, 70, c, c, 128);
    ring.addColorStop(0, 'rgba(255,47,94,0)');
    ring.addColorStop(0.45, 'rgba(255,47,94,0.95)');
    ring.addColorStop(0.62, 'rgba(255,47,94,0.6)');
    ring.addColorStop(1, 'rgba(255,47,94,0)');
    g.fillStyle = ring;
    g.fillRect(0, 0, 256, 256);
    // The seconds left, big and red in the dial's face, over a light disc so the needle stays behind it.
    g.fillStyle = 'rgba(224,251,255,0.82)';
    g.beginPath();
    g.arc(c, c, 46, 0, Math.PI * 2);
    g.fill();
    g.font = 'italic 900 78px system-ui, Arial Black, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.lineWidth = 8;
    g.strokeStyle = '#ffffff';
    g.strokeText(String(second), c - 2, c + 4);
    g.fillStyle = '#e8173f';
    g.fillText(String(second), c - 2, c + 4);
    this.alarmTexture.needsUpdate = true;
  }

  public reset(): void {
    this.rolled = 0;
    this.target = 0;
    this.flash = 0;
    this.popAge = Infinity;
    this.plate.scale.set(1, 1, 1);
    this.time = Infinity;
    this.alarmSecond = -1;
    this.alarm.visible = false;
    this.tumbling.length = 0;
    this.balls = -1;
    for (let i = 0; i < TUMBLERS; i += 1)
      this.place(this.tumblers, i, 0, 0, 0, 0);
    this.tumblers.instanceMatrix.needsUpdate = true;
    if (this.bouncing) this.display.scale.copy(this.baseScale);
    this.bouncing = false;
    this.bounceAge = Infinity;
    this.paint('calm');
  }

  public dispose(): void {
    if (this.bouncing) this.display.scale.copy(this.baseScale);
    this.root.removeFromParent();
    this.disposables.forEach((item) => item.dispose());
  }

  private applyBounce(realDt: number): void {
    // Squash about the scale SceneRoot set, captured whenever no bounce is running.
    if (!this.bouncing) this.baseScale.copy(this.display.scale);
    if (!Number.isFinite(this.bounceAge)) return;
    this.bouncing = true;
    this.bounceAge += realDt;
    if (this.bounceAge > 0.9 || !this.display.visible) {
      this.display.scale.copy(this.baseScale);
      this.bounceAge = Infinity;
      this.bouncing = false;
      return;
    }
    const b = boardBounce(this.bounceAge, this.bounceWeight);
    this.display.scale.set(
      this.baseScale.x * b.x,
      this.baseScale.y * b.y,
      this.baseScale.z
    );
  }

  private paint(heat: Heat): void {
    const value = this.rolled;
    const key = `${value.toFixed(2)}|${this.flash.toFixed(2)}|${heat}`;
    if (key === this.painted || !this.context) return;
    this.painted = key;
    const g = this.context;
    g.clearRect(0, 0, CANVAS_W, CANVAS_H);
    const pad = 8;
    const r = 46;
    g.beginPath();
    g.roundRect(pad, pad, CANVAS_W - pad * 2, CANVAS_H - pad * 2, r);
    const bg = g.createLinearGradient(0, 0, 0, CANVAS_H);
    bg.addColorStop(0, '#2a1559');
    bg.addColorStop(1, '#120a2e');
    g.fillStyle = bg;
    g.fill();
    g.lineWidth = 10;
    g.strokeStyle =
      heat === 'fever' ? `hsl(${this.hue * 360} 100% 65%)` : HEAT_COLOR[heat];
    g.stroke();

    g.fillStyle = '#b8b2e6';
    g.font = '800 30px system-ui, Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.save();
    g.translate(78, CANVAS_H / 2);
    g.rotate(-Math.PI / 2);
    g.fillText('SCORE', 0, 0);
    g.restore();

    const digits = scoreDigits(this.target);
    const reels = odometer(value, digits);
    const cell = Math.min(118, (CANVAS_W - 160) / digits);
    const reelH = CANVAS_H - 44;
    const left = 120 + (CANVAS_W - 140 - cell * digits) / 2;
    const top = 22;
    const digitColor = new Color(DIGIT_COLOR[heat]).lerp(
      new Color('#ffffff'),
      this.flash
    );
    g.font = `italic 900 ${Math.round(reelH * 0.9)}px system-ui, Arial Black, sans-serif`;
    for (let k = 0; k < digits; k += 1) {
      const x = left + (digits - 1 - k) * cell;
      g.fillStyle = '#0a0620';
      g.beginPath();
      g.roundRect(x + 4, top, cell - 8, reelH, 14);
      g.fill();
      g.save();
      g.clip();
      const p = reels[k];
      const d = Math.floor(p) % 10;
      const frac = p - Math.floor(p);
      const cx = x + cell / 2;
      const cy = top + reelH / 2 + 4;
      // Leading zeros are dim, so the real score reads first.
      const lead = value < 10 ** k && k > 0 && frac === 0;
      g.fillStyle = lead ? '#3a2d6a' : `#${digitColor.getHexString()}`;
      g.shadowColor = lead ? 'transparent' : g.fillStyle;
      g.shadowBlur = 10 + this.flash * 24;
      g.fillText(String(d), cx, cy - frac * reelH);
      if (frac > 0)
        g.fillText(String((d + 1) % 10), cx, cy + (1 - frac) * reelH);
      g.restore();
      // Reel glass: a soft highlight band.
      const glass = g.createLinearGradient(0, top, 0, top + reelH);
      glass.addColorStop(0, 'rgba(0,0,0,0.55)');
      glass.addColorStop(0.25, 'rgba(255,255,255,0.06)');
      glass.addColorStop(0.75, 'rgba(255,255,255,0)');
      glass.addColorStop(1, 'rgba(0,0,0,0.55)');
      g.fillStyle = glass;
      g.fillRect(x + 4, top, cell - 8, reelH);
    }
    this.texture.needsUpdate = true;
  }

  private place(
    mesh: InstancedMesh,
    i: number,
    x: number,
    y: number,
    z: number,
    scale: number
  ): void {
    this.scratch.position.set(x, y, z);
    this.scratch.rotation.set(0, 0, 0);
    this.scratch.scale.setScalar(scale);
    this.scratch.updateMatrix();
    mesh.setMatrixAt(i, this.scratch.matrix);
  }

  private track<
    T extends BufferGeometry | Material | InstancedMesh | CanvasTexture
  >(item: T): T {
    this.disposables.push(item);
    return item;
  }

  private instanced(
    geometry: BufferGeometry,
    material: Material,
    count = BULBS
  ): InstancedMesh {
    const mesh = this.track(
      new InstancedMesh(this.track(geometry), this.track(material), count)
    );
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    mesh.frustumCulled = false;
    for (let i = 0; i < count; i += 1)
      mesh.setColorAt(i, this.color.set('#000000'));
    return mesh;
  }
}
