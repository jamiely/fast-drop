import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  Quaternion,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
  type BufferGeometry,
  type Material,
  type PerspectiveCamera,
  type Scene
} from 'three';
import { JAR_HEIGHT, JAR_RADIUS } from '../entities/Jar';
import {
  FACE_FRAMES,
  advanceMascot,
  faceFrame,
  faceMotion,
  initialMascot,
  mascotEvent,
  type MascotEvent,
  type MascotState
} from './mascot';
import type { Heat } from './state';

/** Disco palette per heat: [primary, secondary]. FEVER cycles the hue on top. */
const DISCO: Record<Heat, [string, string]> = {
  calm: ['#3b2cff', '#00c8ff'],
  warm: ['#ff8a3d', '#ffd23f'],
  hot: ['#ff2fa8', '#9b3dff'],
  fever: ['#ffd23f', '#ff2fa8']
};

const SPECKS = 56;
const GLINTS = 5;
const BACKDROP_Z = -9;

/** World point on the ray through an NDC point, `distance` from the camera. */
export const screenPoint = (
  camera: PerspectiveCamera,
  x: number,
  y: number,
  distance: number,
  out: Vector3
): Vector3 => {
  out.set(x, y, 0.5).unproject(camera).sub(camera.position).normalize();
  return out.multiplyScalar(distance).add(camera.position);
};

const canvasTexture = (
  width: number,
  height: number,
  draw: (g: CanvasRenderingContext2D) => void
): CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
};

/** Mirror tiles: a grid of grey facets, a few bright ones, thin dark grout. */
const mirrorTexture = (): CanvasTexture =>
  canvasTexture(512, 256, (g) => {
    g.fillStyle = '#1c1830';
    g.fillRect(0, 0, 512, 256);
    const cols = 48;
    const rows = 24;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const n = Math.sin(r * 12.9898 + c * 78.233) * 43758.5453;
        const v = n - Math.floor(n);
        const tint = v > 0.93 ? 255 : 90 + Math.floor(v * 120);
        const hue = v > 0.8 && v <= 0.93 ? (c * 37) % 360 : 0;
        g.fillStyle =
          hue > 0
            ? `hsl(${hue} 70% ${45 + v * 20}%)`
            : `rgb(${tint},${tint},${Math.min(255, tint + 18)})`;
        g.fillRect(
          (c * 512) / cols + 0.8,
          (r * 256) / rows + 0.8,
          512 / cols - 1.6,
          256 / rows - 1.6
        );
      }
    }
  });

const glowTexture = (): CanvasTexture =>
  canvasTexture(64, 64, (g) => {
    const gradient = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gradient;
    g.fillRect(0, 0, 64, 64);
    // A four-point star glint.
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.fillRect(31, 2, 2, 60);
    g.fillRect(2, 31, 60, 2);
  });

/** One 128 px cell per FACE_FRAMES entry, left to right. */
export const faceAtlas = (): CanvasTexture =>
  canvasTexture(128 * FACE_FRAMES.length, 128, (g) => {
    FACE_FRAMES.forEach((frame, i) => {
      g.save();
      g.translate(i * 128 + 64, 64);
      const ink = '#2a1240';
      g.lineCap = 'round';
      g.lineJoin = 'round';
      // Cheeks.
      g.fillStyle = 'rgba(255,110,170,0.7)';
      for (const x of [-38, 38]) {
        g.beginPath();
        g.ellipse(x, 14, 11, 7, 0, 0, Math.PI * 2);
        g.fill();
      }
      const blink = frame === 'blink' || frame === 'cheer-blink';
      const happyEyes = frame === 'happy' || frame === 'cheer';
      for (const x of [-22, 22]) {
        if (blink || happyEyes) {
          // Closed (blink) or smiling (^ ^) eyes.
          g.strokeStyle = ink;
          g.lineWidth = 7;
          g.beginPath();
          if (blink) {
            g.moveTo(x - 10, -8);
            g.quadraticCurveTo(x, -2, x + 10, -8);
          } else {
            g.moveTo(x - 11, -4);
            g.quadraticCurveTo(x, -22, x + 11, -4);
          }
          g.stroke();
          continue;
        }
        const worried = frame === 'worried';
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.ellipse(x, -8, 13, worried ? 17 : 15, 0, 0, Math.PI * 2);
        g.fill();
        g.lineWidth = 3;
        g.strokeStyle = ink;
        g.stroke();
        g.fillStyle = ink;
        g.beginPath();
        g.ellipse(x + (worried ? 0 : 2), worried ? -4 : -6, 7, 9, 0, 0, 7);
        g.fill();
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.arc(x + 4, -11, 3, 0, Math.PI * 2);
        g.fill();
        if (worried) {
          // Brows tilted up in the middle.
          g.strokeStyle = ink;
          g.lineWidth = 5;
          g.beginPath();
          g.moveTo(x - 12 * Math.sign(x), -34);
          g.lineTo(x + 8 * Math.sign(x), -28);
          g.stroke();
        }
      }
      g.strokeStyle = ink;
      g.fillStyle = ink;
      g.lineWidth = 6;
      g.beginPath();
      if (frame === 'idle' || frame === 'blink') {
        g.moveTo(-12, 18);
        g.quadraticCurveTo(0, 28, 12, 18);
        g.stroke();
      } else if (frame === 'happy') {
        // Big open grin with a tongue.
        g.moveTo(-20, 14);
        g.quadraticCurveTo(0, 50, 20, 14);
        g.closePath();
        g.fill();
        g.fillStyle = '#ff5c8a';
        g.beginPath();
        g.ellipse(0, 30, 9, 6, 0, 0, Math.PI * 2);
        g.fill();
      } else if (frame === 'worried') {
        // A small wobbly "o".
        g.lineWidth = 5;
        g.ellipse(0, 24, 7, 9, 0, 0, Math.PI * 2);
        g.stroke();
      } else {
        // Cheer: wide open "O!" mouth.
        g.ellipse(0, 26, 15, 17, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#ff5c8a';
        g.beginPath();
        g.ellipse(0, 35, 9, 6, 0, 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
    });
  });

const backdropMaterial = (): ShaderMaterial =>
  new ShaderMaterial({
    // Opaque on purpose: three draws transmissive glass before transparent objects, so a transparent backdrop would paint over the jars.
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uBeat: { value: 0 },
      uA: { value: new Color(DISCO.calm[0]) },
      uB: { value: new Color(DISCO.calm[1]) },
      uEnergy: { value: 0.3 },
      uOrigin: { value: new Vector3() }
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uBeat;
      uniform vec3 uA;
      uniform vec3 uB;
      uniform float uEnergy;
      uniform vec3 uOrigin;
      varying vec3 vWorld;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        vec2 p = vWorld.xy;
        // Deep purple sky, a glow under the machine.
        vec3 color = mix(vec3(0.035, 0.012, 0.08), vec3(0.09, 0.02, 0.16), smoothstep(14.0, -2.0, p.y));
        float pulse = 0.5 + 0.5 * cos(fract(uBeat) * 6.2832);
        color += uA * 0.12 * (0.6 + 0.4 * pulse) * smoothstep(9.0, 0.0, length(p - vec2(0.0, 1.0)));
        // Slow rays from the disco ball.
        vec2 d = p - uOrigin.xy;
        float a = atan(d.y, d.x);
        float rays = pow(max(0.0, sin(a * 9.0 + uTime * 0.35)), 8.0);
        color += mix(uA, uB, 0.5 + 0.5 * sin(a * 3.0)) * rays * 0.07 * uEnergy * smoothstep(22.0, 3.0, length(d));
        // Twinkling stars.
        vec2 cell = floor(p * 1.6);
        vec2 f = fract(p * 1.6) - 0.5;
        float h = hash(cell);
        float star = step(0.86, h) * smoothstep(0.09, 0.0, length(f - (vec2(hash(cell + 3.1), hash(cell + 7.7)) - 0.5) * 0.7));
        star *= 0.45 + 0.55 * sin(uTime * (1.0 + h * 3.0) + h * 40.0);
        color += mix(vec3(1.0), uB, 0.4) * max(0.0, star) * 0.75;
        gl_FragColor = vec4(color, 1.0);
      }
    `
  });

const floorMaterial = (): ShaderMaterial =>
  new ShaderMaterial({
    depthWrite: false,
    uniforms: {
      uBeat: { value: 0 },
      uA: { value: new Color(DISCO.calm[0]) },
      uB: { value: new Color(DISCO.calm[1]) },
      uEnergy: { value: 0.3 }
    },
    vertexShader: /* glsl */ `
      varying vec2 vXZ;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vXZ = world.xz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uBeat;
      uniform vec3 uA;
      uniform vec3 uB;
      uniform float uEnergy;
      varying vec2 vXZ;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 15731.743); }
      void main() {
        vec2 q = vXZ / 1.1;
        vec2 cell = floor(q);
        vec2 f = fract(q);
        float edge = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y));
        float tile = smoothstep(0.02, 0.07, edge);
        // Each tile lights on some beats and fades through the beat, never a hard flash.
        float beat = floor(uBeat);
        float on = step(0.62, hash(cell + beat * 1.37));
        float fade = 1.0 - smoothstep(0.0, 1.0, fract(uBeat));
        vec3 hue = mix(uA, uB, hash(cell + 19.0));
        vec3 color = vec3(0.05, 0.025, 0.1) * tile + hue * tile * (0.05 + on * fade * (0.12 + 0.26 * uEnergy));
        float r = length(vXZ - vec2(0.0, 1.2));
        // Opaque, like the backdrop: fade into the sky's horizon colour instead of alpha.
        gl_FragColor = vec4(mix(vec3(0.09, 0.02, 0.16), color, smoothstep(13.0, 4.0, r)), 1.0);
      }
    `
  });

interface Speck {
  lat: number;
  lon: number;
  phase: number;
}

/**
 * Disco Fever: a mirror ball hung in a top corner of the screen, throwing specks on a starry backdrop and a
 * dance floor that pulses with the heat, and a face on every jar. Six draws in all; every part is cosmetic.
 */
export class DiscoTheme {
  private readonly disposables: Array<
    BufferGeometry | Material | CanvasTexture
  > = [];
  private readonly backdrop: Mesh<PlaneGeometry, ShaderMaterial>;
  private readonly floor: Mesh<PlaneGeometry, ShaderMaterial>;
  private readonly ball: Mesh;
  private readonly cord: Mesh;
  private readonly specks: InstancedMesh;
  private readonly faces: InstancedMesh;
  private readonly frames: InstancedBufferAttribute;
  private readonly speckDirs: Speck[] = [];
  private readonly scratch = new Object3D();
  private readonly v = new Vector3();
  private readonly w = new Vector3();
  private readonly toCamera = new Vector3();
  private readonly yaw = new Quaternion();
  private readonly colorA = new Color();
  private readonly colorB = new Color();
  private readonly speckColor = new Color();
  private readonly ballRadius = { value: 0.4 };
  private mascots: MascotState[];
  private spin = 0;
  private time = 0;
  private beat = 0;
  private energy = 0.3;
  private hue = 0;
  private aspect = 0;
  private animated = true;

  public constructor(
    private readonly scene: Scene,
    private readonly camera: PerspectiveCamera,
    private readonly jars: readonly Mesh[]
  ) {
    this.backdrop = new Mesh(
      this.track(new PlaneGeometry(90, 60)),
      this.track(backdropMaterial())
    );
    this.backdrop.position.set(0, 8, BACKDROP_Z);
    this.backdrop.renderOrder = -10;
    this.floor = new Mesh(
      this.track(new PlaneGeometry(34, 34)),
      this.track(floorMaterial())
    );
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.set(0, -0.015, 1.2);
    this.floor.renderOrder = -9;

    const mirror = this.track(mirrorTexture());
    this.ball = new Mesh(
      this.track(new SphereGeometry(1, 28, 18)),
      this.track(new MeshBasicMaterial({ map: mirror }))
    );
    this.cord = new Mesh(
      this.track(new CylinderGeometry(0.012, 0.012, 1, 6)),
      this.track(new MeshBasicMaterial({ color: '#8f86b8' }))
    );

    const glow = this.track(glowTexture());
    this.specks = new InstancedMesh(
      this.track(new PlaneGeometry(1, 1)),
      this.track(
        new MeshBasicMaterial({
          map: glow,
          transparent: true,
          depthWrite: false,
          blending: AdditiveBlending,
          toneMapped: false
        })
      ),
      SPECKS + GLINTS
    );
    this.specks.instanceMatrix.setUsage(DynamicDrawUsage);
    this.specks.frustumCulled = false;
    this.specks.renderOrder = 4;
    for (let i = 0; i < SPECKS + GLINTS; i += 1) {
      // Golden-angle spiral: even coverage of the lower hemisphere and the band toward the backdrop.
      const t = (i + 0.5) / (SPECKS + GLINTS);
      this.speckDirs.push({
        lat: Math.asin(1.4 * t - 1),
        lon: i * 2.39996,
        phase: i * 1.7
      });
      this.specks.setColorAt(i, this.speckColor.set('#ffffff'));
    }

    const atlas = this.track(faceAtlas());
    const faceGeometry = this.track(new PlaneGeometry(1, 1));
    this.frames = new InstancedBufferAttribute(
      new Float32Array(jars.length),
      1
    );
    this.frames.setUsage(DynamicDrawUsage);
    faceGeometry.setAttribute('aFrame', this.frames);
    const faceMaterial = this.track(
      new MeshBasicMaterial({
        map: atlas,
        transparent: true,
        depthWrite: false,
        side: DoubleSide
      })
    );
    faceMaterial.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          '#include <common>\nattribute float aFrame;'
        )
        .replace(
          '#include <uv_vertex>',
          `#include <uv_vertex>\nvMapUv.x = (vMapUv.x + aFrame) / ${FACE_FRAMES.length}.0;`
        );
    };
    this.faces = new InstancedMesh(faceGeometry, faceMaterial, jars.length);
    this.faces.instanceMatrix.setUsage(DynamicDrawUsage);
    this.faces.frustumCulled = false;
    this.faces.renderOrder = 3;
    this.mascots = jars.map((_, i) => initialMascot(((i * 0.37) % 1) + 0.05));

    scene.add(
      this.backdrop,
      this.floor,
      this.ball,
      this.cord,
      this.specks,
      this.faces
    );
  }

  public get moods(): string[] {
    return this.mascots.map((m) => m.mood);
  }

  public mascot(index: number, event: MascotEvent): void {
    if (this.mascots[index])
      this.mascots[index] = mascotEvent(this.mascots[index], event);
  }

  public all(event: MascotEvent): void {
    this.mascots = this.mascots.map((m) => mascotEvent(m, event));
  }

  public setAnimated(animated: boolean): void {
    this.animated = animated;
  }

  /** Hangs the ball in the top-right gutter, beside the HUD, whatever the window's shape. */
  private place(): void {
    this.aspect = this.camera.aspect;
    const portrait = this.aspect < 1;
    const distance = portrait ? 9 : 10;
    const half = Math.tan((this.camera.fov * Math.PI) / 360) * distance;
    this.ballRadius.value = half * (portrait ? 0.085 : 0.11);
    screenPoint(
      this.camera,
      portrait ? 0.76 : 0.8,
      portrait ? 0.86 : 0.74,
      distance,
      this.ball.position
    );
    this.ball.scale.setScalar(this.ballRadius.value);
    this.ball.rotation.z = 0.18;
    // A cord up past the top edge.
    const top = this.ball.position.y + half * 1.2;
    const length = top - this.ball.position.y;
    this.cord.position.copy(this.ball.position);
    this.cord.position.y += length / 2;
    this.cord.scale.set(1, length, 1);
    (this.backdrop.material.uniforms.uOrigin.value as Vector3).copy(
      this.ball.position
    );
  }

  public update(realDt: number, heat: Heat, bpm: number): void {
    if (this.camera.aspect !== this.aspect) this.place();
    const dt = this.animated ? realDt : 0;
    this.time += dt;
    this.beat += (dt * bpm) / 60;
    this.spin += dt * (heat === 'fever' ? 1.6 : heat === 'hot' ? 1 : 0.5);
    this.hue = (this.hue + dt * 0.15) % 1;
    const target = { calm: 0.3, warm: 0.55, hot: 0.8, fever: 1 }[heat];
    this.energy += (target - this.energy) * (1 - Math.exp(-realDt * 3));
    const [a, b] = DISCO[heat];
    const k = 1 - Math.exp(-realDt * 4);
    if (heat === 'fever') {
      this.colorA.setHSL(this.hue, 1, 0.55);
      this.colorB.setHSL((this.hue + 0.45) % 1, 1, 0.55);
    } else {
      this.colorA.set(a);
      this.colorB.set(b);
    }
    for (const material of [this.backdrop.material, this.floor.material]) {
      const u = material.uniforms;
      (u.uA.value as Color).lerp(this.colorA, k);
      (u.uB.value as Color).lerp(this.colorB, k);
      u.uBeat.value = this.beat;
      u.uEnergy.value = this.energy;
    }
    this.backdrop.material.uniforms.uTime.value = this.time;
    this.ball.rotation.y = this.spin;

    this.updateSpecks();
    this.updateFaces(realDt);
  }

  private updateSpecks(): void {
    const origin = this.ball.position;
    const r = this.ballRadius.value;
    const uA = this.backdrop.material.uniforms.uA.value as Color;
    const uB = this.backdrop.material.uniforms.uB.value as Color;
    for (let i = 0; i < SPECKS + GLINTS; i += 1) {
      const s = this.speckDirs[i];
      const lon = s.lon + this.spin;
      const cos = Math.cos(s.lat);
      this.v.set(Math.cos(lon) * cos, Math.sin(s.lat), Math.sin(lon) * cos);
      let size = 0;
      if (i >= SPECKS) {
        // Glints twinkle on the ball's camera-facing side.
        this.w
          .copy(this.v)
          .multiplyScalar(r * 1.02)
          .add(origin);
        this.toCamera.copy(this.camera.position).sub(origin).normalize();
        const facing = this.v.dot(this.toCamera);
        const twinkle = Math.max(0, Math.sin(this.time * 3 + s.phase));
        size = facing > 0.3 ? r * 0.9 * twinkle * twinkle : 0;
        this.speckColor.set('#ffffff');
      } else {
        // Specks land where the ray from the ball meets the dance floor or the backdrop.
        const toFloor = this.v.y < -0.05 ? -origin.y / this.v.y : Infinity;
        const toBack =
          this.v.z < -0.05
            ? (BACKDROP_Z + 0.05 - origin.z) / this.v.z
            : Infinity;
        const t = Math.min(toFloor, toBack);
        if (Number.isFinite(t) && t < 40 && origin.z + this.v.z * t < 3.2) {
          this.w.copy(this.v).multiplyScalar(t).add(origin);
          if (t === toFloor) this.w.y = 0.01;
          // Farther specks are wider but dimmer, like a spread beam.
          size = 0.16 + t * 0.012;
          this.speckColor
            .copy(
              i % 3 === 0
                ? uA
                : i % 3 === 1
                  ? uB
                  : this.speckColor.set('#ffffff')
            )
            .multiplyScalar(
              (0.35 + 0.45 * this.energy) *
                (0.75 + 0.25 * Math.sin(this.time * 4 + s.phase))
            );
        }
      }
      this.scratch.position.copy(this.w);
      this.scratch.quaternion.copy(this.camera.quaternion);
      this.scratch.scale.setScalar(size);
      this.scratch.updateMatrix();
      this.specks.setMatrixAt(i, this.scratch.matrix);
      this.specks.setColorAt(i, this.speckColor);
    }
    this.specks.instanceMatrix.needsUpdate = true;
    if (this.specks.instanceColor) this.specks.instanceColor.needsUpdate = true;
  }

  private updateFaces(realDt: number): void {
    for (let i = 0; i < this.jars.length; i += 1) {
      this.mascots[i] = advanceMascot(this.mascots[i], realDt);
      const jar = this.jars[i];
      const motion = faceMotion(this.mascots[i]);
      this.v.setFromMatrixPosition(jar.matrixWorld);
      this.toCamera.copy(this.camera.position).sub(this.v);
      this.toCamera.y = 0;
      this.toCamera.normalize();
      const height = JAR_HEIGHT * jar.scale.y;
      const radius = JAR_RADIUS * jar.scale.x;
      this.scratch.position
        .copy(this.v)
        .addScaledVector(this.toCamera, radius * 1.04);
      this.scratch.position.y += height * (0.02 + motion.lift);
      this.yaw.setFromAxisAngle(
        this.w.set(0, 1, 0),
        Math.atan2(this.toCamera.x, this.toCamera.z)
      );
      this.scratch.quaternion.copy(this.yaw);
      this.scratch.rotateZ(motion.tilt);
      const size = radius * 1.7;
      this.scratch.scale.set(size / motion.squash, size * motion.squash, 1);
      this.scratch.updateMatrix();
      this.faces.setMatrixAt(i, this.scratch.matrix);
      this.frames.setX(i, FACE_FRAMES.indexOf(faceFrame(this.mascots[i])));
    }
    this.faces.instanceMatrix.needsUpdate = true;
    this.frames.needsUpdate = true;
  }

  public reset(): void {
    this.mascots = this.jars.map((_, i) =>
      initialMascot(((i * 0.37) % 1) + 0.05)
    );
    this.energy = 0.3;
  }

  public dispose(): void {
    for (const object of [
      this.backdrop,
      this.floor,
      this.ball,
      this.cord,
      this.specks,
      this.faces
    ])
      this.scene.remove(object);
    this.specks.dispose();
    this.faces.dispose();
    this.disposables.forEach((item) => item.dispose());
  }

  private track<T extends BufferGeometry | Material | CanvasTexture>(
    item: T
  ): T {
    this.disposables.push(item);
    return item;
  }
}
