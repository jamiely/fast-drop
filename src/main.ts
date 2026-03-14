import './style.css';
import { App } from './app/App';

const appRoot = document.querySelector<HTMLDivElement>('#app');

if (!appRoot) {
  throw new Error('Missing #app root element');
}

const app = new App(appRoot);
await app.start();
