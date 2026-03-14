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
    this.hud.scoreValue.textContent = String(Math.max(0, state.score)).padStart(
      6,
      '0'
    );
    this.hud.timeValue.textContent = state.timeRemaining
      .toFixed(1)
      .padStart(4, '0');
    this.hud.ballsValue.textContent = String(
      Math.max(0, state.ballsRemaining)
    ).padStart(2, '0');
    this.hud.dropButton.disabled =
      state.timeRemaining <= 0 || state.ballsRemaining <= 0;
  }
}
