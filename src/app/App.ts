import { Game } from '../game/Game';
import { playStartupLogoAnimation } from '../ui/startupLogo';

export class App {
  private readonly game: Game;
  private readonly host: HTMLElement;

  public constructor(host: HTMLElement) {
    this.host = host;
    this.game = new Game(host);
  }

  public async start(): Promise<void> {
    if (typeof document !== 'undefined' && typeof window !== 'undefined') {
      void playStartupLogoAnimation(this.host);
    }

    await this.game.init();
    this.game.start();
  }
}
