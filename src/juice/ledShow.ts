import {
  AdditiveBlending,
  Color,
  DoubleSide,
  ShaderMaterial,
  type Mesh
} from 'three';
import { LED_PATTERNS, MAX_FLASH_HZ, type LedFrame } from './show';

// Same values as scene/outerRingLed.ts. Importing them would make this chunk import main's entry, which is
// still mid top-level await when Fever loads (see vite.config.ts manualChunks).
const OUTER_RING_LED_BASE_COLOR = new Color('#1f3f99');
const OUTER_RING_LED_MAX_HEADS = 12;

/**
 * Fever's light show for the outer ring. It replaces the classic chase material on the same overlay mesh and
 * keeps its uniform names, so SceneRoot's per-frame writes (uPhase, uHeadCount…) stay harmless.
 */
export const createRingShowMaterial = (): ShaderMaterial =>
  new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    blending: AdditiveBlending,
    toneMapped: false,
    uniforms: {
      uPhase: { value: 0 },
      uHeadCount: { value: 4 },
      uTrail: { value: 0.58 },
      uDirection: { value: 1 },
      uBaseColor: { value: OUTER_RING_LED_BASE_COLOR.clone() },
      uPalette: { value: [0, 1, 2, 3].map(() => new Color()) },
      uPattern: { value: 0 },
      uShowPhase: { value: 0 },
      uTime: { value: 0 },
      uStrobe: { value: 0 },
      uBurst: { value: 0 },
      uBurstT: { value: 0 },
      uBurstSpread: { value: 0 }
    },
    vertexShader: `
      varying vec3 vWorldPosition;

      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      varying vec3 vWorldPosition;

      uniform float uHeadCount;
      uniform float uTrail;
      uniform vec3 uBaseColor;
      uniform vec3 uPalette[4];
      uniform int uPattern;
      uniform float uShowPhase;
      uniform float uTime;
      uniform float uStrobe;
      uniform float uBurst;
      uniform float uBurstT;
      uniform float uBurstSpread;

      const float LED_COUNT = 96.0;

      float wrapSigned(float value) {
        return mod(value + 0.5, 1.0) - 0.5;
      }

      float hash(float n) {
        return fract(sin(n * 91.3458) * 47453.5453);
      }

      vec3 hue(float h) {
        return clamp(abs(fract(h + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0) - 1.0, 0.0, 1.0);
      }

      vec3 palette(float t) {
        int index = int(mod(floor(t * 4.0), 4.0));
        return index == 0 ? uPalette[0] : index == 1 ? uPalette[1] : index == 2 ? uPalette[2] : uPalette[3];
      }

      void main() {
        float ringT = atan(vWorldPosition.z, vWorldPosition.x) / 6.28318530718 + 0.5;
        float led = floor(ringT * LED_COUNT);
        // Discrete bulbs: each LED cell is bright in its middle and dimmer between bulbs.
        float cell = abs(fract(ringT * LED_COUNT) - 0.5);
        float bulb = 0.45 + 0.55 * smoothstep(0.5, 0.18, cell);
        float intensity = 0.0;
        vec3 color = uPalette[0];

        if (uPattern == 0) {
          float headCount = clamp(uHeadCount, 1.0, ${OUTER_RING_LED_MAX_HEADS.toFixed(1)});
          float sigma = 0.03 + (1.0 - clamp(uTrail, 0.05, 1.0)) * 0.08;
          float weight = 0.0;
          vec3 weighted = vec3(0.0);
          for (int i = 0; i < ${OUTER_RING_LED_MAX_HEADS}; i += 1) {
            if (float(i) >= headCount) break;
            float delta = wrapSigned(ringT - fract(uShowPhase + float(i) / headCount));
            // The show's clock only runs forward, so the tail is always behind the head.
            float tail = delta < 0.0 ? 1.0 : 0.25;
            float c = exp(-(delta * delta) / (2.0 * sigma * sigma)) * tail;
            intensity += c;
            weighted += palette(float(i) / 4.0 + 0.01) * c;
            weight += c;
          }
          color = weight > 0.0001 ? weighted / weight : uBaseColor;
        } else if (uPattern == 1) {
          float tick = floor(uShowPhase * 8.0);
          float spark = step(0.74, hash(led + tick * 17.0));
          intensity = spark * (1.0 - fract(uShowPhase * 8.0)) * 1.3 + 0.1;
          color = palette(hash(led + tick));
        } else if (uPattern == 2) {
          float front = fract(uShowPhase);
          float behind = fract(front - ringT);
          float edge = exp(-pow(min(behind, 1.0 - behind) / 0.02, 2.0));
          intensity = (1.0 - behind) * 0.9 + edge * 1.2;
          color = mix(palette(ringT * 4.0), vec3(1.0), edge * 0.6);
        } else if (uPattern == 3) {
          intensity = step(0.5, fract(uShowPhase)) * 1.2 + 0.08;
          color = palette(mod(led, 4.0) / 4.0 + 0.01);
        } else if (uPattern == 4) {
          float heads = 0.0;
          for (int i = 0; i < 3; i += 1) {
            float delta = wrapSigned(ringT - fract(uShowPhase * 1.6 + float(i) / 3.0));
            heads += exp(-(delta * delta) / 0.0098);
          }
          intensity = 0.6 + heads * 0.7;
          color = hue(ringT * 2.0 - uShowPhase * 0.5);
        } else {
          float p = fract(uShowPhase);
          float beat = exp(-pow(p / 0.05, 2.0)) + 0.65 * exp(-pow((p - 0.2) / 0.05, 2.0));
          intensity = 0.1 + beat * 1.25;
        }

        // Ring-wide strobe layer, kept partial so the ring never blacks out. 3 Hz: the photosensitivity limit.
        intensity *= 1.0 - uStrobe * step(0.5, fract(uTime * ${MAX_FLASH_HZ.toFixed(1)}));

        // A hit sends two bright fronts out from the jar's angle.
        float burstDelta = abs(wrapSigned(ringT - uBurstT));
        float burst = uBurst * exp(-pow((burstDelta - uBurstSpread) / 0.03, 2.0));
        intensity += burst * 1.6;
        color = mix(color, vec3(1.0), clamp(burst, 0.0, 1.0) * 0.5);

        float lit = clamp(intensity, 0.0, 1.6) * bulb;
        vec3 finalColor = mix(uBaseColor, color, 0.92) * (0.22 + lit * 1.15);
        float alpha = 0.08 + clamp(lit, 0.0, 1.0) * 0.5;
        gl_FragColor = vec4(finalColor, alpha);
      }
    `
  });

/** Drives the overlay's show material from a frame and a jar burst. A few uniform writes; no allocation. */
export class RingShow {
  private readonly material = createRingShowMaterial();
  private readonly original: ShaderMaterial;
  private phase = 0;
  private time = 0;
  private frame: LedFrame | null = null;
  private burst = 0;
  private burstAge = 0;

  public constructor(private readonly mesh: Mesh) {
    this.original = mesh.material as ShaderMaterial;
    mesh.material = this.material;
  }

  /** `angle` in the ring's atan(z, x) convention. */
  public burstAt(angle: number): void {
    this.material.uniforms.uBurstT.value = angle / (Math.PI * 2) + 0.5;
    this.burst = 1;
    this.burstAge = 0;
  }

  public update(realDt: number, frame: LedFrame): void {
    const u = this.material.uniforms;
    if (frame !== this.frame) {
      // A new pattern starts from its beginning (a wipe sweeps from 0); a heat change within chase keeps going.
      if (frame.pattern !== this.frame?.pattern) this.phase = 0;
      this.frame = frame;
      u.uPattern.value = LED_PATTERNS.indexOf(frame.pattern);
      frame.palette.forEach((color, i) =>
        (u.uPalette.value as Color[])[i].set(color)
      );
    }
    this.phase += realDt * frame.speed;
    this.time += realDt;
    this.burstAge += realDt;
    this.burst = Math.max(0, this.burst - realDt * 1.6);
    u.uShowPhase.value = this.phase;
    u.uTime.value = this.time;
    u.uStrobe.value = frame.strobe;
    u.uBurst.value = this.burst;
    u.uBurstSpread.value = Math.min(0.5, this.burstAge * 0.9);
  }

  public dispose(): void {
    this.mesh.material = this.original;
    this.material.dispose();
  }
}
