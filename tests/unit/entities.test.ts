import { describe, expect, it } from 'vitest';
import { MeshStandardMaterial } from 'three';
import { createJarMesh } from '../../src/entities/Jar';

describe('entity factories', () => {
  it('creates a standard jar mesh', () => {
    const jar = createJarMesh(false);
    const material = jar.material as MeshStandardMaterial;

    expect(jar.position.y).toBeCloseTo(0.4);
    expect(material.color.getStyle()).toContain('rgb');
  });

  it('creates a bonus jar mesh with a different material color', () => {
    const normal = createJarMesh(false).material as MeshStandardMaterial;
    const bonus = createJarMesh(true).material as MeshStandardMaterial;

    expect(bonus.color.getHex()).not.toBe(normal.color.getHex());
  });
});
