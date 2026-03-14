import type { Meta, StoryObj } from '@storybook/html';
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
}

const meta: Meta<PlatformStoryArgs> = {
  title: 'Components/Center Platform',
  render: (args) => {
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
    return renderThreePreview(group);
  },
  args: {
    jarOrbitRadius: 2.2,
    jarRadius: 0.33,
    moundColor: '#4f87ff',
    bridgeColor: '#5d99ff',
    padColor: '#69a8ff',
    bridgeScale: 1
  },
  argTypes: {
    jarOrbitRadius: {
      control: { type: 'range', min: 1.4, max: 3.6, step: 0.05 }
    },
    jarRadius: { control: { type: 'range', min: 0.2, max: 0.65, step: 0.01 } },
    moundColor: { control: 'color' },
    bridgeColor: { control: 'color' },
    padColor: { control: 'color' },
    bridgeScale: { control: { type: 'range', min: 0.75, max: 1.6, step: 0.01 } }
  }
};

export default meta;
type Story = StoryObj<PlatformStoryArgs>;

export const Default: Story = {};
