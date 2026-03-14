import type { Meta, StoryObj } from '@storybook/html';
import { Color, Mesh, MeshPhysicalMaterial } from 'three';
import { createJarMesh } from '../entities/Jar';
import { renderThreePreview } from './threePreview';

interface JarStoryArgs {
  bodyColor: string;
  rimColor: string;
  bodyOpacity: number;
  rimOpacity: number;
  emissiveIntensity: number;
  rimScale: number;
}

const meta: Meta<JarStoryArgs> = {
  title: 'Components/Jar (Bonus)',
  render: (args) => {
    const jar = createJarMesh(true);

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

    return renderThreePreview(jar);
  },
  args: {
    bodyColor: '#57d66a',
    rimColor: '#7deb88',
    bodyOpacity: 0.56,
    rimOpacity: 0.9,
    emissiveIntensity: 0.45,
    rimScale: 1
  },
  argTypes: {
    bodyColor: { control: 'color' },
    rimColor: { control: 'color' },
    bodyOpacity: { control: { type: 'range', min: 0.1, max: 1, step: 0.01 } },
    rimOpacity: { control: { type: 'range', min: 0.1, max: 1, step: 0.01 } },
    emissiveIntensity: {
      control: { type: 'range', min: 0, max: 1.2, step: 0.01 }
    },
    rimScale: { control: { type: 'range', min: 0.8, max: 1.3, step: 0.01 } }
  }
};

export default meta;
type Story = StoryObj<JarStoryArgs>;

export const BonusJar: Story = {};
