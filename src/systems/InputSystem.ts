export class InputSystem {
  public constructor(onDrop: () => void) {
    window.addEventListener('keydown', (event) => {
      if (event.code !== 'Space') {
        return;
      }

      event.preventDefault();
      onDrop();
    });
  }
}
