import { AdditiveBlending, Color, DoubleSide, ShaderMaterial } from 'three';

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
    side: DoubleSide,
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
      varying float vRingT;

      void main() {
        vRingT = atan(position.y, position.x) / 6.28318530718 + 0.5;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying float vRingT;

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
          float wrappedDelta = wrapSigned(vRingT - headT);
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

export const createCenterDomeReflectionMaterial = (): ShaderMaterial =>
  new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: AdditiveBlending,
    uniforms: {
      uPhase: { value: 0 },
      uEnabled: { value: 1 },
      uBaseColor: { value: new Color('#274a93') },
      uPalette: { value: OUTER_RING_LED_PALETTE.map((color) => color.clone()) }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vWorldPosition;

      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        vNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      varying vec3 vWorldPosition;

      uniform float uPhase;
      uniform float uEnabled;
      uniform vec3 uBaseColor;
      uniform vec3 uPalette[4];

      float wrapSigned(float value) {
        return mod(value + 0.5, 1.0) - 0.5;
      }

      void main() {
        if (uEnabled < 0.5) {
          gl_FragColor = vec4(0.0);
          return;
        }

        float angle = atan(vWorldPosition.z, vWorldPosition.x) / (6.28318530718) + 0.5;
        float radial = clamp(length(vWorldPosition.xz) * 0.4, 0.0, 1.0);
        float headCount = 4.0;
        float sigma = 0.08;

        float intensity = 0.0;
        float weight = 0.0;
        vec3 colorSum = vec3(0.0);

        for (int i = 0; i < 4; i += 1) {
          float idx = float(i);
          float headT = fract(uPhase + idx / headCount);
          float dist = abs(wrapSigned(angle - headT));
          float contribution = exp(-(dist * dist) / (2.0 * sigma * sigma));
          contribution *= (0.55 + radial * 0.45);

          intensity += contribution;
          colorSum += uPalette[i] * contribution;
          weight += contribution;
        }

        float fresnel = pow(1.0 - clamp(dot(normalize(vNormal), vec3(0.0, 1.0, 0.0)), 0.0, 1.0), 1.45);
        vec3 ledColor = weight > 0.0001 ? colorSum / weight : uBaseColor;
        float glow = clamp(intensity, 0.0, 1.0) * (0.28 + fresnel * 0.72);

        vec3 finalColor = mix(uBaseColor, ledColor, 0.9) * glow;
        float alpha = glow * 0.5;
        gl_FragColor = vec4(finalColor, alpha);
      }
    `
  });
