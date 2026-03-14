import type { Meta, StoryObj } from '@storybook/html';
import { createHud } from '../ui/hud';

interface DropButtonArgs {
  enabled: boolean;
  label: string;
}

const meta: Meta<DropButtonArgs> = {
  title: 'Components/Drop Button',
  render: (args) => {
    const host = document.createElement('div');
    host.style.position = 'relative';
    host.style.width = '520px';
    host.style.maxWidth = '95vw';
    host.style.height = '180px';
    host.style.border = '1px solid rgba(255,255,255,0.14)';
    host.style.borderRadius = '14px';
    host.style.background = 'rgba(10, 14, 26, 0.9)';
    host.style.overflow = 'hidden';

    const hud = createHud(host);
    hud.root.remove();

    hud.dropButton.disabled = !args.enabled;
    hud.dropButton.textContent = args.label;

    const controls = hud.dropButton.closest<HTMLElement>('.controls');
    if (controls) {
      controls.style.top = '50%';
      controls.style.bottom = 'auto';
      controls.style.left = '50%';
      controls.style.transform = 'translate(-50%, -50%)';
    }

    return host;
  },
  args: {
    enabled: true,
    label: 'Drop Ball (Space)'
  },
  argTypes: {
    enabled: { control: 'boolean' },
    label: { control: 'text' }
  }
};

export default meta;
type Story = StoryObj<DropButtonArgs>;

export const Default: Story = {};
