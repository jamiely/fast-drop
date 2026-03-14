import type { Meta, StoryObj } from '@storybook/html';
import { Color, MeshPhysicalMaterial } from 'three';
import { BALL_RADIUS, createBallMesh } from '../entities/Ball';
import { renderThreePreview } from './threePreview';

interface BallStoryArgs {
  radius: number;
  color: string;
  emissiveColor: string;
  emissiveIntensity: number;
  roughness: number;
  metalness: number;
}

const meta: Meta<BallStoryArgs> = {
  title: 'Components/Ball',
  render: (args) => {
    const mesh = createBallMesh();
    mesh.scale.setScalar(args.radius / BALL_RADIUS);

    const material = mesh.material as MeshPhysicalMaterial;
    material.color = new Color(args.color);
    material.emissive = new Color(args.emissiveColor);
    material.emissiveIntensity = args.emissiveIntensity;
    material.roughness = args.roughness;
    material.metalness = args.metalness;

    return renderThreePreview(mesh);
  },
  args: {
    radius: BALL_RADIUS,
    color: '#f7fbff',
    emissiveColor: '#6cd6ff',
    emissiveIntensity: 0.15,
    roughness: 0.08,
    metalness: 0.18
  },
  argTypes: {
    radius: { control: { type: 'range', min: 0.015, max: 0.12, step: 0.001 } },
    color: { control: 'color' },
    emissiveColor: { control: 'color' },
    emissiveIntensity: {
      control: { type: 'range', min: 0, max: 1.2, step: 0.01 }
    },
    roughness: { control: { type: 'range', min: 0, max: 1, step: 0.01 } },
    metalness: { control: { type: 'range', min: 0, max: 1, step: 0.01 } }
  }
};

export default meta;
type Story = StoryObj<BallStoryArgs>;

export const Default: Story = {};
