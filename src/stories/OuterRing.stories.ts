import type { Meta, StoryObj } from '@storybook/html';
import { useArgs } from '@storybook/preview-api';
import { Color, Mesh, MeshPhysicalMaterial, TorusGeometry } from 'three';
import {
  createPlayfieldBase,
  createPlayfieldDimensions
} from '../entities/Playfield';
import { renderThreePreview } from './threePreview';

interface OuterRingStoryArgs {
  ringDiameter: number;
  jarOrbitRadius: number;
  jarRadius: number;
  ringColor: string;
  emissiveColor: string;
  emissiveIntensity: number;
  cameraX: number;
  cameraY: number;
  cameraZ: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  cameraFov: number;
}

const roundControlValue = (value: number) => Math.round(value * 1000) / 1000;

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
    ringDiameter: 6.41,
    jarOrbitRadius: 2.86,
    jarRadius: 0.33,
    ringColor: '#f3f7ff',
    emissiveColor: '#4e79ff',
    emissiveIntensity: 0.1,
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
