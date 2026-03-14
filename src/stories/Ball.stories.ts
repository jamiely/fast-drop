import type { Meta, StoryObj } from '@storybook/html';
import { Color, Group, MeshPhysicalMaterial } from 'three';
import { BALL_RADIUS, createBallMesh } from '../entities/Ball';
import { createJarMesh } from '../entities/Jar';
import { renderThreePreview } from './threePreview';

interface BallStoryArgs {
  radius: number;
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

const meta: Meta<BallStoryArgs> = {
  title: 'Components/Ball',
  render: (args) => {
    const group = new Group();

    const jar = createJarMesh(false);
    group.add(jar);

    const mesh = createBallMesh();
    mesh.scale.setScalar(args.radius / BALL_RADIUS);
    mesh.position.y = 1.05 + args.radius;

    const material = mesh.material as MeshPhysicalMaterial;
    material.color = new Color(args.color);
    material.emissive = new Color(args.emissiveColor);
    material.emissiveIntensity = args.emissiveIntensity;
    material.roughness = args.roughness;
    material.metalness = args.metalness;

    group.add(mesh);

    return renderThreePreview(group, {
      camera: {
        x: args.cameraX,
        y: args.cameraY,
        z: args.cameraZ,
        targetX: args.targetX,
        targetY: args.targetY,
        targetZ: args.targetZ,
        fov: args.cameraFov
      }
    });
  },
  args: {
    radius: BALL_RADIUS,
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
    radius: { control: { type: 'range', min: 0.015, max: 0.12, step: 0.001 } },
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
