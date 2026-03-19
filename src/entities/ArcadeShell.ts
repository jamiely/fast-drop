import {
  CanvasTexture,
  CylinderGeometry,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  SRGBColorSpace,
  TorusGeometry
} from 'three';

const createDropLabelTexture = (): CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');

  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#ffefef';
    context.font = 'bold 82px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('DROP', canvas.width * 0.5, canvas.height * 0.54);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
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
    metalness: 0.15,
    roughness: 0.22,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    emissive: '#ff2c32',
    emissiveIntensity: 0.4,
    map: createDropLabelTexture()
  });

  const cap = new Mesh(new CylinderGeometry(0.34, 0.38, 0.12, 52), capMaterial);
  const capRestY = 0.09;
  const capPressTravel = 0.04;
  cap.position.y = capRestY;

  group.add(base, cap);

  return {
    group,
    setLitIntensity: (value: number) => {
      capMaterial.emissiveIntensity = 0.35 + Math.max(0, Math.min(1, value)) * 1.8;
    },
    setPressAmount: (value: number) => {
      const amount = Math.max(0, Math.min(1, value));
      cap.position.y = capRestY - capPressTravel * amount;
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
    opacity: 0.25,
    transmission: 0.94,
    thickness: 0.24,
    ior: 1.45,
    metalness: 0,
    roughness: 0.08,
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

  const topLip = new Mesh(new TorusGeometry(tubeRadius, 0.03, 18, 54), lipMaterial);
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
      tube.geometry = new CylinderGeometry(tubeRadius, tubeRadius, tubeHeight, 36, 1, true);
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
      opacity: 0.16,
      transmission: 0.92,
      thickness: 0.42,
      ior: 1.47,
      metalness: 0,
      roughness: 0.1,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
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
