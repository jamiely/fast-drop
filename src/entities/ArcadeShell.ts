import {
  CanvasTexture,
  CircleGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  SRGBColorSpace,
  TorusGeometry
} from 'three';

interface DropLabelTexture {
  texture: CanvasTexture;
  setPressAmount: (amount: number) => void;
}

const createDropLabelTexture = (): DropLabelTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;

  const draw = (amount: number): void => {
    if (!context) {
      return;
    }

    const clamped = Math.max(0, Math.min(1, amount));
    const alpha = 0.45 + clamped * 0.45;
    const tint = Math.round(255 * clamped);

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = `rgba(${tint}, ${tint}, ${tint}, ${alpha})`;

    context.font = 'bold 78px Arial';
    context.fillText('drop', canvas.width * 0.5, canvas.height * 0.48);

    context.font = 'bold 168px Arial';
    context.fillText('⇓', canvas.width * 0.5, canvas.height * 0.76);

    texture.needsUpdate = true;
  };

  draw(0);

  return {
    texture,
    setPressAmount: (amount: number) => draw(amount)
  };
};

export interface DropButtonVisual {
  group: Group;
  setLitIntensity: (value: number) => void;
  setPressAmount: (value: number) => void;
}

export const createDropButtonVisual = (): DropButtonVisual => {
  const group = new Group();

  const base = new Mesh(
    new CylinderGeometry(0.42, 0.46, 0.13, 52),
    new MeshStandardMaterial({
      color: '#111129',
      metalness: 0.65,
      roughness: 0.32
    })
  );

  const capMaterial = new MeshPhysicalMaterial({
    color: '#cf1e2a',
    metalness: 0.03,
    roughness: 0.12,
    transparent: true,
    opacity: 0.96,
    transmission: 0.72,
    thickness: 0.48,
    ior: 1.5,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    emissive: '#ff3040',
    emissiveIntensity: 0.55
  });

  const cap = new Mesh(new CylinderGeometry(0.34, 0.38, 0.12, 52), capMaterial);
  const capRestY = 0.09;
  const capPressTravel = 0.04;
  cap.position.y = capRestY;

  const dropLabelTexture = createDropLabelTexture();

  const label = new Mesh(
    new CircleGeometry(0.24, 64),
    new MeshBasicMaterial({
      map: dropLabelTexture.texture,
      transparent: true
    })
  );
  const labelOffsetY = 0.061;
  label.rotation.x = -Math.PI * 0.5;
  label.rotation.z = -Math.PI * 0.5;
  label.position.y = capRestY + labelOffsetY;

  group.add(base, cap, label);

  return {
    group,
    setLitIntensity: (value: number) => {
      const amount = Math.max(0, Math.min(1, value));
      capMaterial.emissiveIntensity = 0.5 + amount * 3.8;
      capMaterial.transmission = 0.6 + amount * 0.35;
    },
    setPressAmount: (value: number) => {
      const amount = Math.max(0, Math.min(1, value));
      cap.position.y = capRestY - capPressTravel * amount;
      label.position.y = cap.position.y + labelOffsetY;
      dropLabelTexture.setPressAmount(amount);
    }
  };
};

export interface DropTubeVisual {
  group: Group;
  syncToBallRadius: (ballRadius: number) => void;
  setDropHeight: (dropHeight: number) => void;
}

export const createDropTubeVisual = (
  initialBallRadius: number,
  initialDropHeight: number
): DropTubeVisual => {
  const group = new Group();
  const tubeMaterial = new MeshPhysicalMaterial({
    color: '#dff8ff',
    transparent: true,
    opacity: 0.2,
    transmission: 0,
    metalness: 0,
    roughness: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.05
  });

  const lipMaterial = new MeshStandardMaterial({
    color: '#b8cfff',
    metalness: 0.58,
    roughness: 0.22,
    emissive: '#415bb7',
    emissiveIntensity: 0.2
  });

  const tubeHeight = 1.05;
  let tubeRadius = Math.max(0.12, initialBallRadius * 1.32);

  const tube = new Mesh(
    new CylinderGeometry(tubeRadius, tubeRadius, tubeHeight, 36, 1, true),
    tubeMaterial
  );

  const topLip = new Mesh(
    new TorusGeometry(tubeRadius, 0.03, 18, 54),
    lipMaterial
  );
  topLip.rotation.x = Math.PI * 0.5;
  topLip.position.y = tubeHeight * 0.5;

  const bottomLip = new Mesh(
    new TorusGeometry(tubeRadius * 0.92, 0.018, 14, 42),
    lipMaterial
  );
  bottomLip.rotation.x = Math.PI * 0.5;
  bottomLip.position.y = -tubeHeight * 0.5;

  group.add(tube, topLip, bottomLip);

  const applyDropHeight = (dropHeight: number) => {
    group.position.y = dropHeight - tubeHeight * 0.38;
  };

  applyDropHeight(initialDropHeight);

  return {
    group,
    syncToBallRadius: (ballRadius: number) => {
      tubeRadius = Math.max(0.12, ballRadius * 1.32);
      tube.geometry.dispose();
      tube.geometry = new CylinderGeometry(
        tubeRadius,
        tubeRadius,
        tubeHeight,
        36,
        1,
        true
      );
      topLip.geometry.dispose();
      topLip.geometry = new TorusGeometry(tubeRadius, 0.03, 18, 54);
      bottomLip.geometry.dispose();
      bottomLip.geometry = new TorusGeometry(tubeRadius * 0.92, 0.018, 14, 42);
    },
    setDropHeight: (dropHeight: number) => {
      applyDropHeight(dropHeight);
    }
  };
};

export const createOuterEnclosure = (radius: number): Group => {
  const group = new Group();
  const safeRadius = Math.max(2.2, radius);
  const height = 3.15;

  const wall = new Mesh(
    new CylinderGeometry(safeRadius, safeRadius, height, 72, 1, true),
    new MeshPhysicalMaterial({
      color: '#d7e6ff',
      transparent: true,
      opacity: 0.12,
      transmission: 0,
      metalness: 0,
      roughness: 0.16,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      depthWrite: false
    })
  );
  wall.position.y = height * 0.5;

  const topBand = new Mesh(
    new TorusGeometry(safeRadius, 0.06, 18, 72),
    new MeshStandardMaterial({
      color: '#90a9f8',
      metalness: 0.6,
      roughness: 0.24,
      emissive: '#2a3f86',
      emissiveIntensity: 0.15
    })
  );
  topBand.rotation.x = Math.PI * 0.5;
  topBand.position.y = height;

  group.add(wall, topBand);

  return group;
};
