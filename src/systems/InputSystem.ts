export interface InputSystemOptions {
  onDrop: () => void;
  onPlayAgain?: () => void;
  isRoundEnded?: () => boolean;
}

const isInteractiveTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest(
      'button, input, select, textarea, label, a, [role="button"], .summary-overlay'
    )
  );
};

export class InputSystem {
  public constructor(options: InputSystemOptions) {
    window.addEventListener('keydown', (event) => {
      const isEnded = options.isRoundEnded?.() ?? false;
      const isSpace = event.code === 'Space';
      const isEnter = event.code === 'Enter';

      if ((isSpace || isEnter) && isEnded) {
        event.preventDefault();
        options.onPlayAgain?.();
        return;
      }

      if (!isSpace) {
        return;
      }

      event.preventDefault();
      options.onDrop();
    });

    window.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) {
        return;
      }

      if (isInteractiveTarget(event.target)) {
        return;
      }

      if (options.isRoundEnded?.()) {
        return;
      }

      options.onDrop();
    });
  }
}
