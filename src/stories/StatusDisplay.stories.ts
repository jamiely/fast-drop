import type { Meta, StoryObj } from '@storybook/html';
import { useArgs } from '@storybook/preview-api';
import { Group } from 'three';
import { createJarMesh } from '../entities/Jar';
import { createPlayfieldBase, createPlayfieldDimensions } from '../entities/Playfield';
import { createStatusDisplay } from '../entities/StatusDisplay';
import { renderThreePreview } from './threePreview';

interface StatusDisplayStoryArgs {
  timeRemaining: number;
  timeTotal: number;
  ballsRemaining: number;
  jarOrbitRadius: number;
  displayX: number;
  displayY: number;
  displayZ: number;
  cameraX: number;
  cameraY: number;
  cameraZ: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  cameraFov: number;
}

const roundControlValue = (value: number) => Math.round(value * 1000) / 1000;

const meta: Meta<StatusDisplayStoryArgs> = {
  title: 'Components/Status Display',
  render: (args) => {
    const [, updateArgs] = useArgs<StatusDisplayStoryArgs>();

    const group = new Group();

    const jarRadius = 0.33;
    const dimensions = createPlayfieldDimensions(args.jarOrbitRadius, jarRadius);
    const playfield = createPlayfieldBase(dimensions);
    group.add(playfield);

    const jarCount = 5;
    const step = (Math.PI * 2) / jarCount;
    for (let index = 0; index < jarCount; index += 1) {
      const jar = createJarMesh(index < 2);
      const angle = step * index;
      jar.position.x = Math.cos(angle) * args.jarOrbitRadius;
      jar.position.z = Math.sin(angle) * args.jarOrbitRadius;
      jar.lookAt(0, jar.position.y, 0);
      group.add(jar);
    }

    const statusDisplay = createStatusDisplay();
    statusDisplay.setPlacement(args.displayX, args.displayY, args.displayZ);
    statusDisplay.updateData({
      timeRemaining: args.timeRemaining,
      timeTotal: args.timeTotal,
      ballsRemaining: args.ballsRemaining
    });
    group.add(statusDisplay.group);

    return renderThreePreview(group, {
      previewId: 'components-status-display',
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
    timeRemaining: 22,
    timeTotal: 30,
    ballsRemaining: 11,
    jarOrbitRadius: 2.86,
    displayX: 0,
    displayY: 1.45,
    displayZ: 1.2,
    cameraX: 0,
    cameraY: 1.8,
    cameraZ: 6.4,
    targetX: 0,
    targetY: 0.8,
    targetZ: 0.8,
    cameraFov: 40
  },
  argTypes: {
    timeRemaining: { control: { type: 'range', min: 0, max: 60, step: 0.1 } },
    timeTotal: { control: { type: 'range', min: 1, max: 60, step: 0.5 } },
    ballsRemaining: { control: { type: 'range', min: 0, max: 50, step: 1 } },
    jarOrbitRadius: {
      control: { type: 'range', min: 1.4, max: 3.8, step: 0.01 }
    },
    displayX: { control: { type: 'range', min: -4, max: 4, step: 0.01 } },
    displayY: { control: { type: 'range', min: 0.2, max: 4, step: 0.01 } },
    displayZ: { control: { type: 'range', min: -4, max: 4, step: 0.01 } },
    cameraX: { control: { type: 'range', min: -8, max: 8, step: 0.01 } },
    cameraY: { control: { type: 'range', min: -1, max: 8, step: 0.01 } },
    cameraZ: { control: { type: 'range', min: 0.5, max: 12, step: 0.01 } },
    targetX: { control: { type: 'range', min: -4, max: 4, step: 0.01 } },
    targetY: { control: { type: 'range', min: -1, max: 4, step: 0.01 } },
    targetZ: { control: { type: 'range', min: -4, max: 4, step: 0.01 } },
    cameraFov: { control: { type: 'range', min: 20, max: 90, step: 1 } }
  }
};

export default meta;
type Story = StoryObj<StatusDisplayStoryArgs>;

export const Default: Story = {};
