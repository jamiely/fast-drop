import {
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Scene,
  WebGLRenderer
} from 'three';
import { createJarMesh } from '../entities/Jar';
import { createCamera } from './camera';
import { addLighting } from './lighting';

export class SceneRoot {
  public readonly renderer: WebGLRenderer | null;
  public readonly scene: Scene;
  public readonly camera;
  public readonly jarGroup: Group;
  public readonly jars: Mesh[];

  public constructor(private readonly host: HTMLElement, jarCount: number) {
    this.scene = new Scene();
    this.scene.background = new Color('#101826');

    const aspect = host.clientWidth / host.clientHeight;
    this.camera = createCamera(aspect);

    try {
      this.renderer = new WebGLRenderer({ antialias: true });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.setSize(host.clientWidth, host.clientHeight);
      host.appendChild(this.renderer.domElement);
    } catch (error) {
      console.warn('[SceneRoot] WebGL unavailable, continuing without renderer', error);
      this.renderer = null;
    }

    addLighting(this.scene);

    const floor = new Mesh(
      new PlaneGeometry(8, 8),
      new MeshStandardMaterial({ color: '#1f2937', roughness: 0.9 })
    );
    floor.rotation.x = -Math.PI * 0.5;
    this.scene.add(floor);

    this.jarGroup = new Group();
    this.jars = Array.from({ length: jarCount }, (_, index) => {
      const jar = createJarMesh(index < 2);
      this.jarGroup.add(jar);
      return jar;
    });
    this.scene.add(this.jarGroup);
  }

  public resize(): void {
    const width = this.host.clientWidth;
    const height = this.host.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer?.setSize(width, height);
  }

  public render(): void {
    this.renderer?.render(this.scene, this.camera);
  }
}
