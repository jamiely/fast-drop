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
    const inputDebugEnabled =
      new URLSearchParams(window.location.search).get('inputDebug') === '1';

    let lastPointerPrimaryAt = Number.NEGATIVE_INFINITY;
    let touchActionInProgress = false;

    const logInput = (
      phase: string,
      target: EventTarget | null,
      details?: Record<string, unknown>
    ): void => {
      if (!inputDebugEnabled) {
        return;
      }

      const targetLabel =
        target instanceof Element
          ? `${target.tagName.toLowerCase()}${target.id ? `#${target.id}` : ''}`
          : 'non-element-target';

      console.info('[InputSystem]', phase, {
        target: targetLabel,
        ...details
      });
    };

    const triggerPrimaryAction = (
      target: EventTarget | null,
      source: string
    ): void => {
      if (isInteractiveTarget(target)) {
        logInput('ignored-interactive', target, { source });
        return;
      }

      if (options.isRoundEnded?.()) {
        logInput('play-again', target, { source });
        options.onPlayAgain?.();
        return;
      }

      logInput('drop', target, { source });
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

    document.addEventListener(
      'touchstart',
      (event) => {
        if (event.touches.length > 1) {
          return;
        }

        touchActionInProgress = true;
        lastPointerPrimaryAt = performance.now();
        triggerPrimaryAction(event.target, 'touchstart');
      },
      { capture: true }
    );

    document.addEventListener(
      'pointerup',
      (event) => {
        const pointerType = event.pointerType;
        if (pointerType && !['mouse', 'touch', 'pen'].includes(pointerType)) {
          return;
        }

        if (pointerType === 'touch' && touchActionInProgress) {
          return;
        }

        if ((pointerType === 'mouse' || !pointerType) && event.button !== 0) {
          return;
        }

        lastPointerPrimaryAt = performance.now();
        triggerPrimaryAction(event.target, 'pointerup');
      },
      { capture: true }
    );

    document.addEventListener(
      'touchend',
      (event) => {
        if (touchActionInProgress) {
          touchActionInProgress = false;
          return;
        }

        if (performance.now() - lastPointerPrimaryAt < 250) {
          return;
        }

        lastPointerPrimaryAt = performance.now();
        triggerPrimaryAction(event.target, 'touchend-fallback');
      },
      { capture: true }
    );

    document.addEventListener(
      'touchcancel',
      () => {
        touchActionInProgress = false;
      },
      { capture: true }
    );

    document.addEventListener(
      'mousedown',
      (event) => {
        if (event.button !== 0) {
          return;
        }

        if (performance.now() - lastPointerPrimaryAt < 250) {
          return;
        }

        lastPointerPrimaryAt = performance.now();
        triggerPrimaryAction(event.target, 'mousedown-fallback');
      },
      { capture: true }
    );

    document.addEventListener(
      'click',
      (event) => {
        if (
          performance.now() - lastPointerPrimaryAt < 400 ||
          event.button !== 0
        ) {
          return;
        }

        triggerPrimaryAction(event.target, 'click-fallback');
      },
      { capture: true }
    );
  }
}
