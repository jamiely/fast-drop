import type { Meta, StoryObj } from '@storybook/html';
import { useArgs } from '@storybook/preview-api';
import {
  Color,
  Mesh,
  MeshPhysicalMaterial,
  TorusGeometry
} from 'three';
import {
  createPlayfieldBase,
  createPlayfieldDimensions
} from '../entities/Playfield';
import {
  OUTER_RING_LED_BASE_COLOR,
  createOuterRingLedShaderMaterial
} from '../scene/outerRingLed';
import { renderThreePreview } from './threePreview';

interface OuterRingStoryArgs {
  ringDiameter: number;
  jarOrbitRadius: number;
  jarRadius: number;
  ringColor: string;
  emissiveColor: string;
  emissiveIntensity: number;
  ledEnabled: boolean;
  ledSpeed: number;
  ledHeadCount: number;
  ledTrail: number;
  ledReverseChance: number;
  cameraX: number;
  cameraY: number;
  cameraZ: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  cameraFov: number;
}

const roundControlValue = (value: number) => Math.round(value * 1000) / 1000;
const LED_REVERSE_CHECK_SECONDS = 2.4;

const meta: Meta<OuterRingStoryArgs> = {
  title: 'Components/Outer Ring',
  render: (args) => {
    const [, updateArgs] = useArgs<OuterRingStoryArgs>();

    const dimensions = createPlayfieldDimensions(args.jarOrbitRadius, args.jarRadius);
    const platform = createPlayfieldBase(dimensions);

    const outerRing = platform.children[1] as Mesh | undefined;
    if (outerRing) {
      const radius = Math.max(0.3, args.ringDiameter * 0.5);
      outerRing.geometry.dispose();
      outerRing.geometry = new TorusGeometry(
        radius,
        dimensions.outerRingTubeRadius,
        24,
        120
      );

      const material = outerRing.material as MeshPhysicalMaterial;
      material.color = new Color(args.ringColor);
      material.emissive = new Color(args.emissiveColor);
      material.emissiveIntensity = args.emissiveIntensity;

      const ledOverlay = new Mesh(
        outerRing.geometry.clone(),
        createOuterRingLedShaderMaterial({
          headCount: args.ledHeadCount,
          trail: args.ledTrail,
          direction: 1
        })
      );
      ledOverlay.rotation.copy(outerRing.rotation);
      ledOverlay.position.copy(outerRing.position);
      ledOverlay.scale.setScalar(1.0015);
      ledOverlay.visible = args.ledEnabled;

      let phase = 0;
      let direction = 1;
      let reverseTimer = 0;
      let lastNow = performance.now();

      ledOverlay.onBeforeRender = () => {
        const now = performance.now();
        const dt = Math.min(0.05, (now - lastNow) / 1000);
        lastNow = now;

        const ledMaterial = ledOverlay.material;
        if (!args.ledEnabled) {
          ledOverlay.visible = false;
          material.emissive.copy(OUTER_RING_LED_BASE_COLOR);
          material.emissiveIntensity = 0.02;
          return;
        }

        ledOverlay.visible = true;
        reverseTimer += dt;
        if (reverseTimer >= LED_REVERSE_CHECK_SECONDS) {
          reverseTimer = 0;
          if (Math.random() <= args.ledReverseChance) {
            direction *= -1;
          }
        }

        phase += dt * args.ledSpeed * direction;

        ledMaterial.uniforms.uPhase.value = phase;
        ledMaterial.uniforms.uHeadCount.value = Math.round(args.ledHeadCount);
        ledMaterial.uniforms.uTrail.value = args.ledTrail;
        ledMaterial.uniforms.uDirection.value = direction;

        material.emissive.copy(OUTER_RING_LED_BASE_COLOR);
        material.emissiveIntensity = 0.08;
      };

      platform.add(ledOverlay);
    }

    return renderThreePreview(platform, {
      previewId: 'components-outer-ring',
      camera: {
        x: args.cameraX,
        y: args.cameraY,
        z: args.cameraZ,
        targetX: args.targetX,
        targetY: args.targetY,
        targetZ: args.targetZ,
        fov: args.cameraFov
      },
      onCameraChange: (camera) => {
        const nextCameraX = roundControlValue(camera.x);
        const nextCameraY = roundControlValue(camera.y);
        const nextCameraZ = roundControlValue(camera.z);
        const nextTargetX = roundControlValue(camera.targetX);
        const nextTargetY = roundControlValue(camera.targetY);
        const nextTargetZ = roundControlValue(camera.targetZ);

        if (
          nextCameraX === args.cameraX &&
          nextCameraY === args.cameraY &&
          nextCameraZ === args.cameraZ &&
          nextTargetX === args.targetX &&
          nextTargetY === args.targetY &&
          nextTargetZ === args.targetZ
        ) {
          return;
        }

        updateArgs({
          cameraX: nextCameraX,
          cameraY: nextCameraY,
          cameraZ: nextCameraZ,
          targetX: nextTargetX,
          targetY: nextTargetY,
          targetZ: nextTargetZ
        });
      }
    });
  },
  args: {
    ringDiameter: 7.5,
    jarOrbitRadius: 2.86,
    jarRadius: 0.33,
    ringColor: '#f3f7ff',
    emissiveColor: '#4e79ff',
    emissiveIntensity: 0.1,
    ledEnabled: true,
    ledSpeed: 0.35,
    ledHeadCount: 4,
    ledTrail: 0.58,
    ledReverseChance: 0.2,
    cameraX: 0,
    cameraY: 1.2,
    cameraZ: 3.1,
    targetX: 0,
    targetY: 0.35,
    targetZ: 0,
    cameraFov: 50
  },
  argTypes: {
    ringDiameter: { control: { type: 'range', min: 3, max: 8, step: 0.01 } },
    jarOrbitRadius: {
      control: { type: 'range', min: 1.4, max: 3.8, step: 0.01 }
    },
    jarRadius: { control: { type: 'range', min: 0.2, max: 0.65, step: 0.01 } },
    ringColor: { control: 'color' },
    emissiveColor: { control: 'color' },
    emissiveIntensity: {
      control: { type: 'range', min: 0, max: 1, step: 0.01 }
    },
    ledEnabled: { control: 'boolean' },
    ledSpeed: { control: { type: 'range', min: 0.05, max: 2.5, step: 0.01 } },
    ledHeadCount: { control: { type: 'range', min: 1, max: 12, step: 1 } },
    ledTrail: { control: { type: 'range', min: 0.05, max: 1, step: 0.01 } },
    ledReverseChance: { control: { type: 'range', min: 0, max: 1, step: 0.01 } },
    cameraX: { control: { type: 'range', min: -5, max: 5, step: 0.01 } },
    cameraY: { control: { type: 'range', min: -1, max: 5, step: 0.01 } },
    cameraZ: { control: { type: 'range', min: 0.5, max: 8, step: 0.01 } },
    targetX: { control: { type: 'range', min: -3, max: 3, step: 0.01 } },
    targetY: { control: { type: 'range', min: -1, max: 3, step: 0.01 } },
    targetZ: { control: { type: 'range', min: -3, max: 3, step: 0.01 } },
    cameraFov: { control: { type: 'range', min: 20, max: 90, step: 1 } }
  }
};

export default meta;
type Story = StoryObj<OuterRingStoryArgs>;

export const Default: Story = {};
