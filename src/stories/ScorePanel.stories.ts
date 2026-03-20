import type { Meta, StoryObj } from '@storybook/html';
import { createHud } from '../ui/hud';

interface ScoreboardArgs {
  time: string;
  balls: string;
  ledColor: string;
  panelScale: number;
}

const meta: Meta<ScoreboardArgs> = {
  title: 'Components/Scoreboard',
  render: (args) => {
    const host = document.createElement('div');
    host.style.position = 'relative';
    host.style.width = '520px';
    host.style.maxWidth = '95vw';
    host.style.height = '240px';
    host.style.border = '1px solid rgba(255,255,255,0.14)';
    host.style.borderRadius = '14px';
    host.style.background = 'rgba(10, 14, 26, 0.9)';
    host.style.overflow = 'hidden';

    const hud = createHud(host);
    hud.timeValue.textContent = args.time;
    hud.ballsValue.textContent = args.balls;

    hud.root.style.transform = `scale(${args.panelScale})`;
    hud.root.style.transformOrigin = 'top left';

    const leds = host.querySelectorAll<HTMLElement>('.led');
    for (const led of leds) {
      led.style.color = args.ledColor;
      led.style.textShadow = `0 0 4px ${args.ledColor}, 0 0 12px ${args.ledColor}`;
    }

    return host;
  },
  args: {
    time: '26.4',
    balls: '07',
    ledColor: '#ff3f3f',
    panelScale: 1
  },
  argTypes: {
    time: { control: 'text' },
    balls: { control: 'text' },
    ledColor: { control: 'color' },
    panelScale: { control: { type: 'range', min: 0.75, max: 1.4, step: 0.01 } }
  }
};

export default meta;
type Story = StoryObj<ScoreboardArgs>;

export const Default: Story = {};
