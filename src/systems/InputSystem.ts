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
    let lastPointerPrimaryAt = Number.NEGATIVE_INFINITY;

    const triggerPrimaryAction = (target: EventTarget | null): void => {
      if (isInteractiveTarget(target)) {
        return;
      }

      if (options.isRoundEnded?.()) {
        options.onPlayAgain?.();
        return;
      }

      options.onDrop();
    };

    window.addEventListener('keyup', (event) => {
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

    window.addEventListener('pointerup', (event) => {
      const pointerType = event.pointerType;
      if (
        (pointerType && pointerType !== 'mouse' && pointerType !== 'touch') ||
        event.button !== 0
      ) {
        return;
      }

      lastPointerPrimaryAt = performance.now();
      triggerPrimaryAction(event.target);
    });

    window.addEventListener('click', (event) => {
      if (
        performance.now() - lastPointerPrimaryAt < 400 ||
        event.button !== 0
      ) {
        return;
      }

      triggerPrimaryAction(event.target);
    });
  }
}
