export interface HudView {
  root: HTMLElement;
  scoreValue: HTMLElement;
  timeValue: HTMLElement;
  ballsValue: HTMLElement;
  dropButton: HTMLButtonElement;
  summaryOverlay: HTMLElement;
  summaryScore: HTMLElement;
  summaryHits: HTMLElement;
  summaryMisses: HTMLElement;
  summaryAccuracy: HTMLElement;
  playAgainButton: HTMLButtonElement;
}

export const createHud = (host: HTMLElement): HudView => {
  const root = document.createElement('section');
  root.className = 'hud';
  root.innerHTML = `
    <div class="hud__title">SCORE PANEL</div>
    <div class="hud__row">
      <span>Score</span>
      <strong class="led" data-role="score">000000</strong>
    </div>
    <div class="hud__row">
      <span>Time</span>
      <strong class="led" data-role="time">00.0</strong>
    </div>
    <div class="hud__row">
      <span>Balls</span>
      <strong class="led" data-role="balls">00</strong>
    </div>
  `;

  const controls = document.createElement('div');
  controls.className = 'controls';
  controls.innerHTML =
    '<button class="drop-btn" type="button">Drop Ball (Space)</button>';

  const summaryOverlay = document.createElement('aside');
  summaryOverlay.className = 'summary-overlay';
  summaryOverlay.hidden = true;
  summaryOverlay.innerHTML = `
    <div class="summary-overlay__title">Round Complete</div>
    <div class="summary-overlay__row"><span>Score</span><strong data-role="summary-score">0</strong></div>
    <div class="summary-overlay__row"><span>Hits</span><strong data-role="summary-hits">0</strong></div>
    <div class="summary-overlay__row"><span>Misses</span><strong data-role="summary-misses">0</strong></div>
    <div class="summary-overlay__row"><span>Accuracy</span><strong data-role="summary-accuracy">0%</strong></div>
    <button class="summary-overlay__play-again" type="button">Play Again</button>
  `;

  const scoreValue = root.querySelector<HTMLElement>('[data-role="score"]');
  const timeValue = root.querySelector<HTMLElement>('[data-role="time"]');
  const ballsValue = root.querySelector<HTMLElement>('[data-role="balls"]');
  const dropButton = controls.querySelector<HTMLButtonElement>('button');
  const summaryScore = summaryOverlay.querySelector<HTMLElement>(
    '[data-role="summary-score"]'
  );
  const summaryHits = summaryOverlay.querySelector<HTMLElement>(
    '[data-role="summary-hits"]'
  );
  const summaryMisses = summaryOverlay.querySelector<HTMLElement>(
    '[data-role="summary-misses"]'
  );
  const summaryAccuracy = summaryOverlay.querySelector<HTMLElement>(
    '[data-role="summary-accuracy"]'
  );
  const playAgainButton =
    summaryOverlay.querySelector<HTMLButtonElement>('button');

  if (
    !scoreValue ||
    !timeValue ||
    !ballsValue ||
    !dropButton ||
    !summaryScore ||
    !summaryHits ||
    !summaryMisses ||
    !summaryAccuracy ||
    !playAgainButton
  ) {
    throw new Error('Failed to initialize HUD elements');
  }

  host.append(root, controls, summaryOverlay);

  return {
    root,
    scoreValue,
    timeValue,
    ballsValue,
    dropButton,
    summaryOverlay,
    summaryScore,
    summaryHits,
    summaryMisses,
    summaryAccuracy,
    playAgainButton
  };
};
