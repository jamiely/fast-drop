import type { Meta, StoryObj } from '@storybook/html';
import { useArgs } from '@storybook/preview-api';
import { Color, Mesh, MeshPhysicalMaterial } from 'three';
import { createJarMesh } from '../entities/Jar';
import { renderThreePreview } from './threePreview';

interface JarStoryArgs {
  isBonus: boolean;
  bodyColor: string;
  rimColor: string;
  bodyOpacity: number;
  rimOpacity: number;
  emissiveIntensity: number;
  rimScale: number;
  cameraX: number;
  cameraY: number;
  cameraZ: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  cameraFov: number;
}

const roundControlValue = (value: number) => Math.round(value * 1000) / 1000;

const meta: Meta<JarStoryArgs> = {
  title: 'Components/Jar',
  render: (args) => {
    const [, updateArgs] = useArgs<JarStoryArgs>();
    const jar = createJarMesh(args.isBonus);

    const bodyMaterial = jar.material as MeshPhysicalMaterial;
    bodyMaterial.color = new Color(args.bodyColor);
    bodyMaterial.opacity = args.bodyOpacity;
    bodyMaterial.emissiveIntensity = args.emissiveIntensity;

    const rim = jar.children[0] as Mesh | undefined;
    if (rim) {
      const rimMaterial = rim.material as MeshPhysicalMaterial;
      rimMaterial.color = new Color(args.rimColor);
      rimMaterial.opacity = args.rimOpacity;
      rim.scale.setScalar(args.rimScale);
    }

    return renderThreePreview(jar, {
      previewId: 'components-jar',
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
    isBonus: true,
    bodyColor: '#57d66a',
    rimColor: '#7deb88',
    bodyOpacity: 0.56,
    rimOpacity: 0.9,
    emissiveIntensity: 0.45,
    rimScale: 1,
    cameraX: 0,
    cameraY: 1.2,
    cameraZ: 3.1,
    targetX: 0,
    targetY: 0.35,
    targetZ: 0,
    cameraFov: 50
  },
  argTypes: {
    isBonus: { control: 'boolean' },
    bodyColor: { control: 'color' },
    rimColor: { control: 'color' },
    bodyOpacity: { control: { type: 'range', min: 0.1, max: 1, step: 0.01 } },
    rimOpacity: { control: { type: 'range', min: 0.1, max: 1, step: 0.01 } },
    emissiveIntensity: {
      control: { type: 'range', min: 0, max: 1.2, step: 0.01 }
    },
    rimScale: { control: { type: 'range', min: 0.8, max: 1.3, step: 0.01 } },
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
type Story = StoryObj<JarStoryArgs>;

export const BonusJar: Story = {
  args: {
    isBonus: true,
    bodyColor: '#57d66a',
    rimColor: '#7deb88',
    bodyOpacity: 0.56,
    rimOpacity: 0.9,
    emissiveIntensity: 0.45,
    rimScale: 1
  }
};

export const StandardJar: Story = {
  args: {
    isBonus: false,
    bodyColor: '#4ea4ff',
    rimColor: '#7dc0ff',
    bodyOpacity: 0.5,
    rimOpacity: 0.84,
    emissiveIntensity: 0.24,
    rimScale: 1
  }
};
