import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
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
  MARQUEE_CHASE,
  odometer,
  scoreDigits,
  spring
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
    this.root.add(this.halos, this.bulbs, this.plate);
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

  public get shown(): number {
    return this.rolled;
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
  }

  public reset(): void {
    this.rolled = 0;
    this.target = 0;
    this.flash = 0;
    this.popAge = Infinity;
    this.plate.scale.set(1, 1, 1);
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
    material: Material
  ): InstancedMesh {
    const mesh = this.track(
      new InstancedMesh(this.track(geometry), this.track(material), BULBS)
    );
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    mesh.frustumCulled = false;
    for (let i = 0; i < BULBS; i += 1)
      mesh.setColorAt(i, this.color.set('#000000'));
    return mesh;
  }
}
