import { Game } from '../game/Game';

export class App {
  private readonly game: Game;

  public constructor(host: HTMLElement) {
    this.game = new Game(host);
  }

  public async start(): Promise<void> {
    await this.game.init();
    this.game.start();
  }
}
