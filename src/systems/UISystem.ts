import type { GameState } from '../game/types';
import { createHud, type HudView } from '../ui/hud';

export class UISystem {
  private readonly hud: HudView;

  public constructor(host: HTMLElement) {
    this.hud = createHud(host);
  }

  public onPlayAgain(handler: () => void): void {
    this.hud.playAgainButton.addEventListener('click', handler);
  }

  public render(state: GameState): void {
    this.hud.timeValue.textContent = state.timeRemaining
      .toFixed(1)
      .padStart(4, '0');
    this.hud.ballsValue.textContent = String(
      Math.max(0, state.ballsRemaining)
    ).padStart(2, '0');

    const isEnded = state.phase === 'ended';

    this.hud.root.hidden = isEnded;
    this.hud.summaryOverlay.hidden = true;
  }
}
