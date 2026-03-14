import type { Preview } from '@storybook/html';
import '../src/style.css';

const preview: Preview = {
  parameters: {
    layout: 'centered',
    controls: {
      expanded: true
    }
  }
};

export default preview;
