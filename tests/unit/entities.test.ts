import { describe, expect, it } from 'vitest';
import { Mesh, MeshPhysicalMaterial } from 'three';
import { createBallMesh } from '../../src/entities/Ball';
import { createJarMesh } from '../../src/entities/Jar';

describe('entity factories', () => {
  it('creates a standard jar mesh', () => {
    const jar = createJarMesh(false);
    const material = jar.material as MeshPhysicalMaterial;

    expect(jar.position.y).toBeCloseTo(0.4);
    expect(material.color.getStyle()).toContain('rgb');
    expect(material.transparent).toBe(true);
    expect(material.opacity).toBeCloseTo(0.4);
  });

  it('uses the same body color for normal and bonus jars with a black rim', () => {
    const normal = createJarMesh(false);
    const bonus = createJarMesh(true);

    const normalBodyMaterial = normal.material as MeshPhysicalMaterial;
    const bonusBodyMaterial = bonus.material as MeshPhysicalMaterial;

    expect(normal.children[0]).toBeDefined();
    const normalRim = normal.children[0] as Mesh;
    const normalRimMaterial = normalRim.material as MeshPhysicalMaterial;

    expect(bonusBodyMaterial.color.getHex()).toBe(
      normalBodyMaterial.color.getHex()
    );
    expect(normalRimMaterial.color.getHexString()).toBe('111111');
  });

  it('creates a visible placeholder ball mesh', () => {
    const ball = createBallMesh();
    const material = ball.material as MeshPhysicalMaterial;

    expect(ball.position.y).toBe(0);
    expect(material.emissiveIntensity).toBeGreaterThan(0);
  });
});
