import logoUrl from '../assets/logo.jpg';

const DROP_IN_DURATION_MS = 700;
const HOLD_DURATION_MS = 380;
const DROP_OUT_DURATION_MS = 650;
const CLEANUP_BUFFER_MS = 120;

const totalDurationMs =
  DROP_IN_DURATION_MS + HOLD_DURATION_MS + DROP_OUT_DURATION_MS;

export const playStartupLogoAnimation = (host: HTMLElement): Promise<void> => {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'startup-logo-overlay';

    const logo = document.createElement('img');
    logo.className = 'startup-logo-overlay__image';
    logo.src = logoUrl;
    logo.alt = 'Fast Drop logo';
    logo.style.setProperty('--startup-drop-in-ms', `${DROP_IN_DURATION_MS}ms`);
    logo.style.setProperty('--startup-hold-ms', `${HOLD_DURATION_MS}ms`);
    logo.style.setProperty(
      '--startup-drop-out-ms',
      `${DROP_OUT_DURATION_MS}ms`
    );

    overlay.append(logo);
    host.append(overlay);

    const cleanup = (): void => {
      overlay.remove();
      resolve();
    };

    const onAnimationEnd = (event: AnimationEvent): void => {
      if (event.animationName !== 'startupLogoDropOut') {
        return;
      }

      logo.removeEventListener('animationend', onAnimationEnd);
      window.clearTimeout(fallbackTimeout);
      cleanup();
    };

    const fallbackTimeout = window.setTimeout(
      cleanup,
      totalDurationMs + CLEANUP_BUFFER_MS
    );

    logo.addEventListener('animationend', onAnimationEnd);

    requestAnimationFrame(() => {
      logo.classList.add('is-animating');
    });
  });
};
