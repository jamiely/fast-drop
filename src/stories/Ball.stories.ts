import type { Meta, StoryObj } from '@storybook/html';
import { useArgs } from '@storybook/preview-api';
import { Color, Group, MeshPhysicalMaterial } from 'three';
import { BALL_DIAMETER, createBallMesh } from '../entities/Ball';
import { createJarMesh } from '../entities/Jar';
import { renderThreePreview } from './threePreview';

interface BallStoryArgs {
  diameter: number;
  color: string;
  emissiveColor: string;
  emissiveIntensity: number;
  roughness: number;
  metalness: number;
  cameraX: number;
  cameraY: number;
  cameraZ: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  cameraFov: number;
}

const roundControlValue = (value: number) => Math.round(value * 1000) / 1000;

const meta: Meta<BallStoryArgs> = {
  title: 'Components/Ball',
  render: (args) => {
    const [, updateArgs] = useArgs<BallStoryArgs>();
    const group = new Group();

    const jar = createJarMesh(false);
    group.add(jar);

    const mesh = createBallMesh();
    mesh.scale.setScalar(args.diameter / BALL_DIAMETER);
    mesh.position.y = 1.05 + args.diameter * 0.5;

    const material = mesh.material as MeshPhysicalMaterial;
    material.color = new Color(args.color);
    material.emissive = new Color(args.emissiveColor);
    material.emissiveIntensity = args.emissiveIntensity;
    material.roughness = args.roughness;
    material.metalness = args.metalness;

    group.add(mesh);

    return renderThreePreview(group, {
      previewId: 'components-ball',
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
    diameter: 0.157,
    color: '#f7fbff',
    emissiveColor: '#6cd6ff',
    emissiveIntensity: 0.15,
    roughness: 0.08,
    metalness: 0.18,
    cameraX: 0,
    cameraY: 1.2,
    cameraZ: 3.1,
    targetX: 0,
    targetY: 0.35,
    targetZ: 0,
    cameraFov: 50
  },
  argTypes: {
    diameter: {
      control: { type: 'range', min: 0.03, max: 0.24, step: 0.001 }
    },
    color: { control: 'color' },
    emissiveColor: { control: 'color' },
    emissiveIntensity: {
      control: { type: 'range', min: 0, max: 1.2, step: 0.01 }
    },
    roughness: { control: { type: 'range', min: 0, max: 1, step: 0.01 } },
    metalness: { control: { type: 'range', min: 0, max: 1, step: 0.01 } },
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
type Story = StoryObj<BallStoryArgs>;

export const Default: Story = {};
