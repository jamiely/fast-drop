import type { GameState } from '../game/types';
import { createHud, type HudView } from '../ui/hud';

export class UISystem {
  private readonly hud: HudView;

  public constructor(host: HTMLElement) {
    this.hud = createHud(host);
  }

  public onDrop(handler: () => void): void {
    this.hud.dropButton.addEventListener('click', handler);
  }

  public render(state: GameState): void {
    this.hud.scoreValue.textContent = String(state.score);
    this.hud.timeValue.textContent = state.timeRemaining.toFixed(1);
    this.hud.ballsValue.textContent = String(state.ballsRemaining);
    this.hud.dropButton.disabled =
      state.timeRemaining <= 0 || state.ballsRemaining <= 0;
  }
}
