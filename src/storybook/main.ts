import '../style.css';
import './style.css';
import {
  Clock,
  Group,
  Mesh,
  PerspectiveCamera,
  Scene,
  WebGLRenderer
} from 'three';
import { createBallMesh } from '../entities/Ball';
import { JAR_RADIUS, createJarMesh } from '../entities/Jar';
import {
  createJarBridgeMesh,
  createJarPetalMesh,
  createPlayfieldBase,
  createPlayfieldDimensions
} from '../entities/Playfield';
import { addLighting } from '../scene/lighting';
import { createHud } from '../ui/hud';

type StoryId = 'ball' | 'jar-bonus' | 'center-platform' | 'score-panel';

interface StoryConfig {
  id: StoryId;
  label: string;
  description: string;
  mount: (host: HTMLElement) => () => void;
}

const FEEDBACK_KEY_PREFIX = 'fast-drop-story-feedback:';

const root = document.querySelector<HTMLDivElement>('#storybook-app');
if (!root) {
  throw new Error('Missing #storybook-app root element');
}

root.innerHTML = `
  <aside class="storybook-nav">
    <h1>Fast Drop Stories</h1>
  </aside>
  <main class="storybook-main">
    <header class="storybook-title">
      <h2 data-role="title"></h2>
      <p data-role="description"></p>
    </header>
    <section class="storybook-stage" data-role="stage"></section>
    <section class="storybook-feedback">
      <h3>Feedback</h3>
      <textarea data-role="feedback" placeholder="What should change for this component?"></textarea>
      <div class="storybook-feedback__actions">
        <button type="button" data-role="save-feedback">Save feedback</button>
        <button type="button" data-role="copy-feedback">Copy all feedback JSON</button>
      </div>
      <div class="storybook-feedback__status" data-role="feedback-status"></div>
    </section>
  </main>
`;

const queryRequired = <T extends Element>(selector: string): T => {
  const element = root.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Failed to initialize storybook element: ${selector}`);
  }
  return element;
};

const nav = queryRequired<HTMLElement>('.storybook-nav');
const title = queryRequired<HTMLElement>('[data-role="title"]');
const description = queryRequired<HTMLElement>('[data-role="description"]');
const stage = queryRequired<HTMLElement>('[data-role="stage"]');
const feedbackInput = queryRequired<HTMLTextAreaElement>(
  '[data-role="feedback"]'
);
const saveFeedbackButton = queryRequired<HTMLButtonElement>(
  '[data-role="save-feedback"]'
);
const copyFeedbackButton = queryRequired<HTMLButtonElement>(
  '[data-role="copy-feedback"]'
);
const feedbackStatus = queryRequired<HTMLElement>('[data-role="feedback-status"]');

const stories: StoryConfig[] = [
  {
    id: 'ball',
    label: 'Ball',
    description: 'Single ball mesh in isolation.',
    mount: (host) => mountThreeStory(host, () => createBallMesh())
  },
  {
    id: 'jar-bonus',
    label: 'Jar (Bonus)',
    description: 'Bonus jar with neon glass and top rim ring.',
    mount: (host) => mountThreeStory(host, () => createJarMesh(true), 0.24)
  },
  {
    id: 'center-platform',
    label: 'Center Platform',
    description: 'Center cone platform and one bridge+pad connector sample.',
    mount: (host) =>
      mountThreeStory(host, () => {
        const group = new Group();
        const dimensions = createPlayfieldDimensions(2.2, JAR_RADIUS);
        const center = createPlayfieldBase(dimensions);
        const bridge = createJarBridgeMesh(dimensions);
        const pad = createJarPetalMesh(dimensions);

        bridge.position.z = dimensions.bridgeCenterRadius;
        pad.position.z = 2.2;

        group.add(center, bridge, pad);
        return group;
      })
  },
  {
    id: 'score-panel',
    label: 'Score Panel',
    description: 'HUD score panel styled independently from gameplay.',
    mount: (host) => {
      host.innerHTML = '';
      const panelHost = document.createElement('div');
      panelHost.className = 'score-story-host';
      host.append(panelHost);

      const hud = createHud(panelHost);
      hud.scoreValue.textContent = '001245';
      hud.timeValue.textContent = '26.4';
      hud.ballsValue.textContent = '07';
      hud.dropButton.disabled = true;

      return () => {
        panelHost.remove();
      };
    }
  }
];

const initialStory = stories[0];
if (!initialStory) {
  throw new Error('No stories configured');
}

let activeStoryId: StoryId = initialStory.id;
let cleanupStory: (() => void) | null = null;

const storyButtons = new Map<StoryId, HTMLButtonElement>();
for (const story of stories) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = story.label;
  button.addEventListener('click', () => setStory(story.id));
  nav.append(button);
  storyButtons.set(story.id, button);
}

saveFeedbackButton.addEventListener('click', () => {
  localStorage.setItem(
    `${FEEDBACK_KEY_PREFIX}${activeStoryId}`,
    feedbackInput.value.trim()
  );
  feedbackStatus.textContent = 'Saved.';
});

copyFeedbackButton.addEventListener('click', () => {
  const payload = Object.fromEntries(
    stories.map((story) => [
      story.id,
      localStorage.getItem(`${FEEDBACK_KEY_PREFIX}${story.id}`) ?? ''
    ])
  );

  const serialized = JSON.stringify(payload, null, 2);
  navigator.clipboard
    .writeText(serialized)
    .then(() => {
      feedbackStatus.textContent = 'Copied all feedback JSON to clipboard.';
    })
    .catch(() => {
      feedbackStatus.textContent =
        'Clipboard unavailable. Open DevTools to copy.';
      console.log(serialized);
    });
});

setStory(activeStoryId);

function setStory(storyId: StoryId): void {
  const story = stories.find((entry) => entry.id === storyId);
  if (!story) {
    return;
  }

  activeStoryId = story.id;

  for (const [id, button] of storyButtons) {
    button.setAttribute('aria-current', String(id === story.id));
  }

  title.textContent = story.label;
  description.textContent = story.description;

  cleanupStory?.();
  cleanupStory = story.mount(stage);

  feedbackInput.value =
    localStorage.getItem(`${FEEDBACK_KEY_PREFIX}${story.id}`) ?? '';
  feedbackStatus.textContent = '';
}

function mountThreeStory(
  host: HTMLElement,
  buildMesh: () => Mesh | Group,
  spinSpeed = 0.34
): () => void {
  host.innerHTML = '';

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    host.innerHTML = '<div class="storybook-fallback">WebGL unavailable.</div>';
    return () => {};
  }

  const canvasHost = document.createElement('div');
  canvasHost.className = 'storybook-canvas';
  host.append(canvasHost);
  canvasHost.append(renderer.domElement);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new Scene();
  addLighting(scene);

  const camera = new PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 1.2, 3.1);
  camera.lookAt(0, 0.35, 0);

  const model = buildMesh();
  scene.add(model);

  const clock = new Clock();
  let rafId = 0;

  const resize = () => {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  const frame = () => {
    const dt = clock.getDelta();
    model.rotation.y += dt * spinSpeed;
    renderer.render(scene, camera);
    rafId = window.requestAnimationFrame(frame);
  };

  resize();
  frame();

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);

  return () => {
    window.cancelAnimationFrame(rafId);
    resizeObserver.disconnect();
    renderer.dispose();
    canvasHost.remove();
  };
}
