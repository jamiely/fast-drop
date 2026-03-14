import {
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Scene,
  WebGLRenderer
} from 'three';
import { BALL_RADIUS, createBallMesh } from '../entities/Ball';
import { JAR_HEIGHT, JAR_RADIUS, createJarMesh } from '../entities/Jar';
import { createCamera } from './camera';
import { addLighting } from './lighting';

interface ActiveBallVisual {
  id: number | null;
  mesh: Mesh;
  verticalVelocity: number;
}

export interface SceneBallSettlement {
  ballId: number | null;
  jarIndex: number;
  isBonusJar: boolean;
}

const bonusJarIndices = new Set([0, 1]);

export class SceneRoot {
  public readonly renderer: WebGLRenderer | null;
  public readonly scene: Scene;
  public readonly camera;
  public readonly jarGroup: Group;
  public readonly jars: Mesh[];
  private readonly ballGroup: Group;
  private readonly activeBalls: ActiveBallVisual[] = [];

  public constructor(
    private readonly host: HTMLElement,
    jarCount: number
  ) {
    this.scene = new Scene();
    this.scene.background = new Color('#0f1724');

    const aspect = host.clientWidth / host.clientHeight;
    this.camera = createCamera(aspect);

    try {
      this.renderer = new WebGLRenderer({ antialias: true });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.setSize(host.clientWidth, host.clientHeight);
      host.appendChild(this.renderer.domElement);
    } catch (error) {
      console.warn(
        '[SceneRoot] WebGL unavailable, continuing without renderer',
        error
      );
      this.renderer = null;
    }

    addLighting(this.scene);

    const floor = new Mesh(
      new PlaneGeometry(8, 8),
      new MeshStandardMaterial({ color: '#1a2433', roughness: 0.9 })
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

    this.ballGroup = new Group();
    this.scene.add(this.ballGroup);
  }

  public spawnDropBall(dropX = 0, dropZ = 2.2, ballId: number | null = null): void {
    const ball = createBallMesh();
    ball.position.set(dropX, 2.6, dropZ);
    this.ballGroup.add(ball);
    this.activeBalls.push({
      id: ballId,
      mesh: ball,
      verticalVelocity: -2.2
    });
  }

  public update(dt: number): SceneBallSettlement[] {
    const settlements: SceneBallSettlement[] = [];

    for (let index = this.activeBalls.length - 1; index >= 0; index -= 1) {
      const activeBall = this.activeBalls[index];
      if (!activeBall) {
        continue;
      }

      const previousY = activeBall.mesh.position.y;
      activeBall.verticalVelocity -= 2.8 * dt;
      activeBall.mesh.position.y += activeBall.verticalVelocity * dt;

      const settlement = this.findTopIntersection(
        activeBall,
        previousY,
        activeBall.mesh.position.y
      );

      if (settlement) {
        settlements.push(settlement);
        this.ballGroup.remove(activeBall.mesh);
        this.activeBalls.splice(index, 1);
        continue;
      }

      if (activeBall.mesh.position.y <= BALL_RADIUS) {
        this.ballGroup.remove(activeBall.mesh);
        this.activeBalls.splice(index, 1);
      }
    }

    return settlements;
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

  private findTopIntersection(
    activeBall: ActiveBallVisual,
    previousY: number,
    nextY: number
  ): SceneBallSettlement | null {
    const jarTopY = JAR_HEIGHT;
    const topCollisionPlaneY = jarTopY + BALL_RADIUS;

    if (!(previousY > topCollisionPlaneY && nextY <= topCollisionPlaneY)) {
      return null;
    }

    for (const [jarIndex, jar] of this.jars.entries()) {
      const dx = activeBall.mesh.position.x - jar.position.x;
      const dz = activeBall.mesh.position.z - jar.position.z;
      const distanceXZ = Math.hypot(dx, dz);

      if (distanceXZ <= JAR_RADIUS + BALL_RADIUS) {
        return {
          ballId: activeBall.id,
          jarIndex,
          isBonusJar: bonusJarIndices.has(jarIndex)
        };
      }
    }

    return null;
  }
}
