import type { Meta, StoryObj } from '@storybook/html';
import { useArgs } from '@storybook/preview-api';
import { Color, Group, Mesh, MeshPhysicalMaterial } from 'three';
import {
  createJarBridgeMesh,
  createJarPetalMesh,
  createPlayfieldBase,
  createPlayfieldDimensions
} from '../entities/Playfield';
import { renderThreePreview } from './threePreview';

interface PlatformStoryArgs {
  jarOrbitRadius: number;
  jarRadius: number;
  moundColor: string;
  bridgeColor: string;
  padColor: string;
  bridgeScale: number;
  cameraX: number;
  cameraY: number;
  cameraZ: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  cameraFov: number;
}

const roundControlValue = (value: number) => Math.round(value * 1000) / 1000;

const meta: Meta<PlatformStoryArgs> = {
  title: 'Components/Center Platform',
  render: (args) => {
    const [, updateArgs] = useArgs<PlatformStoryArgs>();
    const dimensions = createPlayfieldDimensions(args.jarOrbitRadius, args.jarRadius);

    const group = new Group();
    const center = createPlayfieldBase(dimensions);
    const bridge = createJarBridgeMesh(dimensions);
    const pad = createJarPetalMesh(dimensions);

    bridge.position.z = dimensions.bridgeCenterRadius;
    bridge.scale.z = args.bridgeScale;
    pad.position.z = args.jarOrbitRadius;

    const centerCone = center.children[0] as Mesh | undefined;
    if (centerCone) {
      const mat = centerCone.material as MeshPhysicalMaterial;
      mat.color = new Color(args.moundColor);
    }

    const bridgeMat = bridge.material as MeshPhysicalMaterial;
    bridgeMat.color = new Color(args.bridgeColor);

    const padMat = pad.material as MeshPhysicalMaterial;
    padMat.color = new Color(args.padColor);

    group.add(center, bridge, pad);
    return renderThreePreview(group, {
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
    jarOrbitRadius: 2.2,
    jarRadius: 0.33,
    moundColor: '#4f87ff',
    bridgeColor: '#5d99ff',
    padColor: '#69a8ff',
    bridgeScale: 1,
    cameraX: 0,
    cameraY: 1.2,
    cameraZ: 3.1,
    targetX: 0,
    targetY: 0.35,
    targetZ: 0,
    cameraFov: 50
  },
  argTypes: {
    jarOrbitRadius: {
      control: { type: 'range', min: 1.4, max: 3.6, step: 0.05 }
    },
    jarRadius: { control: { type: 'range', min: 0.2, max: 0.65, step: 0.01 } },
    moundColor: { control: 'color' },
    bridgeColor: { control: 'color' },
    padColor: { control: 'color' },
    bridgeScale: { control: { type: 'range', min: 0.75, max: 1.6, step: 0.01 } },
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
type Story = StoryObj<PlatformStoryArgs>;

export const Default: Story = {};
