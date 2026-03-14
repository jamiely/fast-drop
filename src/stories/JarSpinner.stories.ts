import type { Meta, StoryObj } from '@storybook/html';
import { useArgs } from '@storybook/preview-api';
import { Group } from 'three';
import { createJarMesh } from '../entities/Jar';
import { renderThreePreview } from './threePreview';

interface JarSpinnerStoryArgs {
  jarCount: number;
  bonusJarCount: number;
  orbitRadius: number;
  spinSpeed: number;
  cameraX: number;
  cameraY: number;
  cameraZ: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  cameraFov: number;
}

const roundControlValue = (value: number) => Math.round(value * 1000) / 1000;

const meta: Meta<JarSpinnerStoryArgs> = {
  title: 'Gameplay/Jar Spinner',
  render: (args) => {
    const [, updateArgs] = useArgs<JarSpinnerStoryArgs>();

    const group = new Group();
    const jarCount = Math.max(1, Math.round(args.jarCount));
    const spacing = (Math.PI * 2) / jarCount;

    for (let index = 0; index < jarCount; index += 1) {
      const isBonus = index < Math.max(0, Math.round(args.bonusJarCount));
      const jar = createJarMesh(isBonus);
      const angle = spacing * index;
      jar.position.x = Math.cos(angle) * args.orbitRadius;
      jar.position.z = Math.sin(angle) * args.orbitRadius;
      jar.lookAt(0, jar.position.y, 0);
      group.add(jar);
    }

    const startTime = performance.now();
    group.onBeforeRender = () => {
      const elapsedSeconds = (performance.now() - startTime) / 1000;
      group.rotation.y = elapsedSeconds * args.spinSpeed;
    };

    return renderThreePreview(group, {
      previewId: 'gameplay-jar-spinner',
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
    jarCount: 5,
    bonusJarCount: 2,
    orbitRadius: 2.86,
    spinSpeed: 0.7,
    cameraX: 0,
    cameraY: 2.6,
    cameraZ: 5.9,
    targetX: 0,
    targetY: 0.4,
    targetZ: 0,
    cameraFov: 42
  },
  argTypes: {
    jarCount: { control: { type: 'range', min: 3, max: 10, step: 1 } },
    bonusJarCount: { control: { type: 'range', min: 0, max: 5, step: 1 } },
    orbitRadius: { control: { type: 'range', min: 1.4, max: 3.8, step: 0.01 } },
    spinSpeed: { control: { type: 'range', min: 0, max: 2.2, step: 0.01 } },
    cameraX: { control: { type: 'range', min: -7, max: 7, step: 0.01 } },
    cameraY: { control: { type: 'range', min: -1, max: 7, step: 0.01 } },
    cameraZ: { control: { type: 'range', min: 0.5, max: 12, step: 0.01 } },
    targetX: { control: { type: 'range', min: -3, max: 3, step: 0.01 } },
    targetY: { control: { type: 'range', min: -1, max: 3, step: 0.01 } },
    targetZ: { control: { type: 'range', min: -3, max: 3, step: 0.01 } },
    cameraFov: { control: { type: 'range', min: 20, max: 90, step: 1 } }
  }
};

export default meta;
type Story = StoryObj<JarSpinnerStoryArgs>;

export const Default: Story = {};
