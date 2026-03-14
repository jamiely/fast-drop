import type { Meta, StoryObj } from '@storybook/html';
import { createHud } from '../ui/hud';

interface RoundCompleteDialogArgs {
  score: string;
  hits: string;
  misses: string;
  accuracy: string;
  buttonLabel: string;
}

const meta: Meta<RoundCompleteDialogArgs> = {
  title: 'Components/Round Complete Dialog',
  render: (args) => {
    const host = document.createElement('div');
    host.style.position = 'relative';
    host.style.width = '520px';
    host.style.maxWidth = '95vw';
    host.style.height = '320px';
    host.style.border = '1px solid rgba(255,255,255,0.14)';
    host.style.borderRadius = '14px';
    host.style.background = 'rgba(10, 14, 26, 0.9)';
    host.style.overflow = 'hidden';

    const hud = createHud(host);
    hud.root.remove();

    const controls = hud.dropButton.closest<HTMLElement>('.controls');
    controls?.remove();

    hud.summaryOverlay.hidden = false;
    hud.summaryScore.textContent = args.score;
    hud.summaryHits.textContent = args.hits;
    hud.summaryMisses.textContent = args.misses;
    hud.summaryAccuracy.textContent = args.accuracy;
    hud.playAgainButton.textContent = args.buttonLabel;

    return host;
  },
  args: {
    score: '2410',
    hits: '38',
    misses: '12',
    accuracy: '76%',
    buttonLabel: 'Play Again'
  },
  argTypes: {
    score: { control: 'text' },
    hits: { control: 'text' },
    misses: { control: 'text' },
    accuracy: { control: 'text' },
    buttonLabel: { control: 'text' }
  }
};

export default meta;
type Story = StoryObj<RoundCompleteDialogArgs>;

export const Default: Story = {};
