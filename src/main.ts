import './style.css';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Missing #app root element');
}

app.innerHTML = `
  <main class="shell">
    <h1>Fast Drop</h1>
    <p>Bootstrap build is ready. Gameplay systems are added in later phases.</p>
  </main>
`;
