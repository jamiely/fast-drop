import { AdditiveBlending, Color, ShaderMaterial } from 'three';

export const OUTER_RING_LED_MAX_HEADS = 12;
export const OUTER_RING_LED_BASE_COLOR = new Color('#1f3f99');
export const OUTER_RING_LED_PALETTE = [
  new Color('#32f2ff'),
  new Color('#7b73ff'),
  new Color('#ff6bc9'),
  new Color('#6fd9ff')
];

export interface OuterRingLedShaderOptions {
  headCount: number;
  trail: number;
  direction: number;
}

export const createOuterRingLedShaderMaterial = (
  options: OuterRingLedShaderOptions
): ShaderMaterial =>
  new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    blending: AdditiveBlending,
    uniforms: {
      uPhase: { value: 0 },
      uHeadCount: { value: options.headCount },
      uTrail: { value: options.trail },
      uDirection: { value: options.direction },
      uBaseColor: { value: OUTER_RING_LED_BASE_COLOR.clone() },
      uPalette: { value: OUTER_RING_LED_PALETTE.map((color) => color.clone()) }
    },
    vertexShader: `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;

      uniform float uPhase;
      uniform float uHeadCount;
      uniform float uTrail;
      uniform float uDirection;
      uniform vec3 uBaseColor;
      uniform vec3 uPalette[4];

      float wrapSigned(float value) {
        return mod(value + 0.5, 1.0) - 0.5;
      }

      void main() {
        float headCount = clamp(uHeadCount, 1.0, ${OUTER_RING_LED_MAX_HEADS.toFixed(1)});
        float sigma = 0.06 + (1.0 - clamp(uTrail, 0.05, 1.0)) * 0.18;

        float intensity = 0.0;
        float colorWeightTotal = 0.0;
        vec3 weightedColor = vec3(0.0);

        for (int i = 0; i < ${OUTER_RING_LED_MAX_HEADS}; i += 1) {
          float index = float(i);
          if (index >= headCount) {
            break;
          }

          float headT = fract(uPhase + index / headCount);
          float wrappedDelta = wrapSigned(vUv.x - headT);
          float distanceToHead = abs(wrappedDelta);
          float directionDelta = wrappedDelta * uDirection;
          float tailMask = directionDelta < 0.0 ? 1.0 : 0.35;
          float gaussian = exp(-(distanceToHead * distanceToHead) / (2.0 * sigma * sigma));
          float contribution = gaussian * tailMask;

          intensity += contribution;
          vec3 paletteColor = uPalette[i % 4];
          weightedColor += paletteColor * contribution;
          colorWeightTotal += contribution;
        }

        float clampedIntensity = clamp(intensity, 0.0, 1.0);
        vec3 mixedColor = uBaseColor;
        if (colorWeightTotal > 0.0001) {
          mixedColor = weightedColor / colorWeightTotal;
        }

        vec3 finalColor = mix(uBaseColor, mixedColor, 0.92) * (0.28 + clampedIntensity * 1.05);
        float alpha = 0.08 + clampedIntensity * 0.44;

        gl_FragColor = vec4(finalColor, alpha);
      }
    `
  });
