export const createDebugMenu = (host: HTMLElement, enabled: boolean): HTMLElement | null => {
  if (!enabled) {
    return null;
  }

  const menu = document.createElement('aside');
  menu.className = 'debug-menu';
  menu.innerHTML = `
    <h3>Debug Menu (stubs)</h3>
    <ul>
      <li><button type="button" data-action="pause">Pause/Resume</button></li>
      <li><button type="button" data-action="step">Step Frame</button></li>
      <li><button type="button" data-action="set-timer">Set Timer</button></li>
    </ul>
  `;

  menu.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.getAttribute('data-action') ?? 'unknown';
      console.info('[DebugMenu] stub action', action);
    });
  });

  host.appendChild(menu);
  return menu;
};
