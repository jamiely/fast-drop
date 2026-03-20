export interface HudView {
  root: HTMLElement;
  timeValue: HTMLElement;
  ballsValue: HTMLElement;
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
  root.hidden = true;

  const timeValue = document.createElement('strong');
  const ballsValue = document.createElement('strong');

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
    !summaryScore ||
    !summaryHits ||
    !summaryMisses ||
    !summaryAccuracy ||
    !playAgainButton
  ) {
    throw new Error('Failed to initialize HUD elements');
  }

  host.append(summaryOverlay);

  return {
    root,
    timeValue,
    ballsValue,
    summaryOverlay,
    summaryScore,
    summaryHits,
    summaryMisses,
    summaryAccuracy,
    playAgainButton
  };
};
