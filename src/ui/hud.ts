export interface HudView {
  root: HTMLElement;
  scoreValue: HTMLElement;
  timeValue: HTMLElement;
  ballsValue: HTMLElement;
  dropButton: HTMLButtonElement;
}

export const createHud = (host: HTMLElement): HudView => {
  const root = document.createElement('section');
  root.className = 'hud';
  root.innerHTML = `
    <div class="hud__row"><span>Score</span><strong data-role="score">0</strong></div>
    <div class="hud__row"><span>Time</span><strong data-role="time">0.0</strong></div>
    <div class="hud__row"><span>Balls</span><strong data-role="balls">0</strong></div>
  `;

  const controls = document.createElement('div');
  controls.className = 'controls';
  controls.innerHTML = '<button class="drop-btn" type="button">Drop Ball (Space)</button>';

  const scoreValue = root.querySelector<HTMLElement>('[data-role="score"]');
  const timeValue = root.querySelector<HTMLElement>('[data-role="time"]');
  const ballsValue = root.querySelector<HTMLElement>('[data-role="balls"]');
  const dropButton = controls.querySelector<HTMLButtonElement>('button');

  if (!scoreValue || !timeValue || !ballsValue || !dropButton) {
    throw new Error('Failed to initialize HUD elements');
  }

  host.append(root, controls);

  return { root, scoreValue, timeValue, ballsValue, dropButton };
};
