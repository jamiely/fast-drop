import RAPIER from '@dimforge/rapier3d-compat';

export class PhysicsWorld {
  private constructor(private readonly world: RAPIER.World) {}

  public static async create(): Promise<PhysicsWorld> {
    await RAPIER.init();
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    return new PhysicsWorld(world);
  }

  public step(): void {
    this.world.step();
  }
}
