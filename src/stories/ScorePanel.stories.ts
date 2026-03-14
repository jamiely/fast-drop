import type { Meta, StoryObj } from '@storybook/html';
import { createHud } from '../ui/hud';

interface ScorePanelArgs {
  score: string;
  time: string;
  balls: string;
  ledColor: string;
  panelScale: number;
  buttonEnabled: boolean;
  showScoreboard: boolean;
  showDropButton: boolean;
}

const meta: Meta<ScorePanelArgs> = {
  title: 'Components/Score Panel',
  render: (args) => {
    const host = document.createElement('div');
    host.style.position = 'relative';
    host.style.width = '520px';
    host.style.maxWidth = '95vw';
    host.style.height = args.showScoreboard && args.showDropButton ? '420px' : '240px';
    host.style.border = '1px solid rgba(255,255,255,0.14)';
    host.style.borderRadius = '14px';
    host.style.background = 'rgba(10, 14, 26, 0.9)';
    host.style.overflow = 'hidden';

    const hud = createHud(host);
    hud.scoreValue.textContent = args.score;
    hud.timeValue.textContent = args.time;
    hud.ballsValue.textContent = args.balls;
    hud.dropButton.disabled = !args.buttonEnabled;

    hud.root.style.transform = `scale(${args.panelScale})`;
    hud.root.style.transformOrigin = 'top left';
    hud.root.style.display = args.showScoreboard ? '' : 'none';

    const controls = hud.dropButton.closest<HTMLElement>('.controls');
    if (controls) {
      controls.style.display = args.showDropButton ? '' : 'none';

      if (args.showDropButton && !args.showScoreboard) {
        controls.style.top = '50%';
        controls.style.bottom = 'auto';
        controls.style.transform = 'translate(-50%, -50%)';
      } else {
        controls.style.top = 'auto';
        controls.style.bottom = '24px';
        controls.style.transform = 'translateX(-50%)';
      }
    }

    const leds = host.querySelectorAll<HTMLElement>('.led');
    for (const led of leds) {
      led.style.color = args.ledColor;
      led.style.textShadow = `0 0 4px ${args.ledColor}, 0 0 12px ${args.ledColor}`;
    }

    return host;
  },
  args: {
    score: '001245',
    time: '26.4',
    balls: '07',
    ledColor: '#ff3f3f',
    panelScale: 1,
    buttonEnabled: true,
    showScoreboard: true,
    showDropButton: true
  },
  argTypes: {
    score: { control: 'text' },
    time: { control: 'text' },
    balls: { control: 'text' },
    ledColor: { control: 'color' },
    panelScale: { control: { type: 'range', min: 0.75, max: 1.4, step: 0.01 } },
    buttonEnabled: { control: 'boolean' },
    showScoreboard: { control: 'boolean' },
    showDropButton: { control: 'boolean' }
  }
};

export default meta;
type Story = StoryObj<ScorePanelArgs>;

export const Combined: Story = {};

export const ScoreboardOnly: Story = {
  args: {
    showScoreboard: true,
    showDropButton: false
  }
};

export const DropButtonOnly: Story = {
  args: {
    showScoreboard: false,
    showDropButton: true
  }
};
