import {
  AmbientLight,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PointLight,
  Scene,
  SphereGeometry,
  SpotLight,
  type Light
} from 'three';

export type LightType =
  | 'ambient'
  | 'hemisphere'
  | 'directional'
  | 'point'
  | 'spot';

export interface LightSnapshot {
  id: string;
  name: string;
  type: LightType;
  enabled: boolean;
  color: string;
  groundColor: string;
  intensity: number;
  x: number;
  y: number;
  z: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  distance: number;
  decay: number;
  angle: number;
  penumbra: number;
}

export type LightPropertyKey =
  | 'name'
  | 'type'
  | 'enabled'
  | 'color'
  | 'groundColor'
  | 'intensity'
  | 'x'
  | 'y'
  | 'z'
  | 'targetX'
  | 'targetY'
  | 'targetZ'
  | 'distance'
  | 'decay'
  | 'angle'
  | 'penumbra';

interface LightEntry {
  snapshot: LightSnapshot;
  light: Light;
  target: Object3D | null;
  sourceHelper: Mesh | null;
  sourceSelectionHelper: Mesh | null;
  targetHelper: Mesh | null;
}

export interface LightingOptions {
  showDebugHelpers?: boolean;
}

export interface LightingRig {
  getSnapshot: () => LightSnapshot[];
  setLightValue: (
    id: string,
    key: LightPropertyKey,
    value: number | string | boolean
  ) => void;
  addLight: (type?: LightType) => LightSnapshot;
  setSelectedLight: (id: string | null) => void;
}

const toHexColor = (value: string): string => {
  if (/^#[\da-f]{6}$/i.test(value)) {
    return value.toLowerCase();
  }

  return '#ffffff';
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const toNumber = (value: number | string, fallback: number): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const makeLight = (
  snapshot: LightSnapshot
): { light: Light; target: Object3D | null } => {
  switch (snapshot.type) {
    case 'ambient': {
      return {
        light: new AmbientLight(snapshot.color, snapshot.intensity),
        target: null
      };
    }
    case 'hemisphere': {
      const light = new HemisphereLight(
        snapshot.color,
        snapshot.groundColor,
        snapshot.intensity
      );
      light.position.set(snapshot.x, snapshot.y, snapshot.z);
      return { light, target: null };
    }
    case 'directional': {
      const light = new DirectionalLight(snapshot.color, snapshot.intensity);
      light.position.set(snapshot.x, snapshot.y, snapshot.z);
      const target = new Object3D();
      target.position.set(snapshot.targetX, snapshot.targetY, snapshot.targetZ);
      light.target = target;
      return { light, target };
    }
    case 'spot': {
      const light = new SpotLight(
        snapshot.color,
        snapshot.intensity,
        snapshot.distance,
        snapshot.angle,
        snapshot.penumbra,
        snapshot.decay
      );
      light.position.set(snapshot.x, snapshot.y, snapshot.z);
      const target = new Object3D();
      target.position.set(snapshot.targetX, snapshot.targetY, snapshot.targetZ);
      light.target = target;
      return { light, target };
    }
    case 'point':
    default: {
      const light = new PointLight(
        snapshot.color,
        snapshot.intensity,
        snapshot.distance,
        snapshot.decay
      );
      light.position.set(snapshot.x, snapshot.y, snapshot.z);
      return { light, target: null };
    }
  }
};

const syncEntryInstance = (
  entry: LightEntry,
  selectedLightId: string | null
): void => {
  const { snapshot, light, target } = entry;

  light.visible = snapshot.enabled;
  light.color.set(snapshot.color);
  light.intensity = snapshot.intensity;

  if (light instanceof HemisphereLight) {
    light.position.set(snapshot.x, snapshot.y, snapshot.z);
    light.groundColor.set(snapshot.groundColor);
  }

  if (
    light instanceof DirectionalLight ||
    light instanceof PointLight ||
    light instanceof SpotLight
  ) {
    light.position.set(snapshot.x, snapshot.y, snapshot.z);
  }

  if (light instanceof PointLight || light instanceof SpotLight) {
    light.distance = snapshot.distance;
    light.decay = snapshot.decay;
  }

  if (light instanceof SpotLight) {
    light.angle = snapshot.angle;
    light.penumbra = snapshot.penumbra;
  }

  if (
    target &&
    (light instanceof DirectionalLight || light instanceof SpotLight)
  ) {
    target.visible = snapshot.enabled;
    target.position.set(snapshot.targetX, snapshot.targetY, snapshot.targetZ);
  }

  syncLightHelpers(entry, selectedLightId);
};

const createDefaultSnapshot = (
  id: string,
  name: string,
  type: LightType,
  overrides: Partial<LightSnapshot> = {}
): LightSnapshot => ({
  id,
  name,
  type,
  enabled: true,
  color: '#ffffff',
  groundColor: '#1b0f36',
  intensity: 1,
  x: 0,
  y: 5,
  z: 0,
  targetX: 0,
  targetY: 0.45,
  targetZ: 0,
  distance: 12,
  decay: 2,
  angle: 0.62,
  penumbra: 0.28,
  ...overrides
});

const createLightHelper = (color: string, scale = 0.06): Mesh => {
  const material = new MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.9,
    depthWrite: false
  });
  return new Mesh(new SphereGeometry(scale, 12, 12), material);
};

const createSelectionHelper = (scale = 0.1): Mesh => {
  const material = new MeshBasicMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 0.88,
    wireframe: true,
    depthWrite: false
  });
  return new Mesh(new SphereGeometry(scale, 12, 12), material);
};

const syncLightHelpers = (
  entry: LightEntry,
  selectedLightId: string | null
): void => {
  if (!entry.sourceHelper) {
    return;
  }

  const isPositionedLight =
    entry.snapshot.type === 'hemisphere' ||
    entry.snapshot.type === 'directional' ||
    entry.snapshot.type === 'point' ||
    entry.snapshot.type === 'spot';

  const isSelected = entry.snapshot.id === selectedLightId;
  entry.sourceHelper.visible = isPositionedLight && entry.snapshot.enabled;
  if (isPositionedLight) {
    entry.sourceHelper.position.set(
      entry.snapshot.x,
      entry.snapshot.y,
      entry.snapshot.z
    );
    entry.sourceHelper.scale.setScalar(isSelected ? 1.45 : 0.92);

    const sourceMaterial = entry.sourceHelper.material as MeshBasicMaterial;
    sourceMaterial.color.set(entry.snapshot.color);
    sourceMaterial.wireframe = !isSelected;
    sourceMaterial.opacity = isSelected ? 1 : 0.26;
  }

  if (entry.sourceSelectionHelper) {
    entry.sourceSelectionHelper.visible =
      isPositionedLight && entry.snapshot.enabled && isSelected;
    if (isPositionedLight) {
      entry.sourceSelectionHelper.position.set(
        entry.snapshot.x,
        entry.snapshot.y,
        entry.snapshot.z
      );
      entry.sourceSelectionHelper.scale.setScalar(1.9);
    }
  }

  if (!entry.targetHelper) {
    return;
  }

  const hasTarget =
    entry.snapshot.type === 'directional' || entry.snapshot.type === 'spot';

  entry.targetHelper.visible = hasTarget && entry.snapshot.enabled;
  if (hasTarget) {
    entry.targetHelper.position.set(
      entry.snapshot.targetX,
      entry.snapshot.targetY,
      entry.snapshot.targetZ
    );
    entry.targetHelper.scale.setScalar(isSelected ? 1.45 : 1);
  }
};

export const addLighting = (
  scene: Scene,
  options: LightingOptions = {}
): LightingRig => {
  const entries: LightEntry[] = [];
  let debugLightCount = 0;
  let selectedLightId: string | null = null;

  const mountSnapshot = (snapshot: LightSnapshot): LightSnapshot => {
    const normalized: LightSnapshot = {
      ...snapshot,
      color: toHexColor(snapshot.color),
      groundColor: toHexColor(snapshot.groundColor)
    };

    const { light, target } = makeLight(normalized);
    scene.add(light);
    if (target) {
      scene.add(target);
    }

    const sourceHelper = options.showDebugHelpers
      ? createLightHelper(normalized.color, 0.07)
      : null;
    const sourceSelectionHelper = options.showDebugHelpers
      ? createSelectionHelper(0.1)
      : null;
    const targetHelper = options.showDebugHelpers
      ? createLightHelper('#ffd166', 0.045)
      : null;

    if (sourceHelper) {
      scene.add(sourceHelper);
    }

    if (sourceSelectionHelper) {
      scene.add(sourceSelectionHelper);
    }

    if (targetHelper) {
      scene.add(targetHelper);
    }

    const entry: LightEntry = {
      snapshot: normalized,
      light,
      target,
      sourceHelper,
      sourceSelectionHelper,
      targetHelper
    };

    syncLightHelpers(entry, selectedLightId);
    entries.push(entry);
    return normalized;
  };

  const replaceLightType = (entry: LightEntry, type: LightType): void => {
    if (entry.snapshot.type === type) {
      return;
    }

    scene.remove(entry.light);
    if (entry.target) {
      scene.remove(entry.target);
    }

    entry.snapshot.type = type;
    const { light, target } = makeLight(entry.snapshot);
    entry.light = light;
    entry.target = target;

    scene.add(entry.light);
    if (entry.target) {
      scene.add(entry.target);
    }

    syncLightHelpers(entry, selectedLightId);
  };

  mountSnapshot(
    createDefaultSnapshot('ambient', 'Ambient Fill', 'ambient', {
      color: '#88a8e0',
      intensity: 0.22
    })
  );

  mountSnapshot(
    createDefaultSnapshot('hemi', 'Sky/Ground', 'hemisphere', {
      color: '#c6dcff',
      groundColor: '#1b0f36',
      intensity: 0.5,
      x: 0,
      y: 5.8,
      z: 0
    })
  );

  mountSnapshot(
    createDefaultSnapshot('key', 'Key Light', 'directional', {
      color: '#ffffff',
      intensity: 5,
      x: 2.6,
      y: 6.2,
      z: 2.8,
      targetX: 0,
      targetY: 0.45,
      targetZ: 0
    })
  );

  mountSnapshot(
    createDefaultSnapshot('center-spot', 'Center Spot', 'spot', {
      color: '#fff7df',
      intensity: 6.7,
      distance: 14,
      angle: 0.62,
      penumbra: 0.28,
      decay: 1.3,
      x: 0,
      y: 2.5,
      z: 1.3,
      targetX: 0,
      targetY: 0.45,
      targetZ: 0
    })
  );

  mountSnapshot(
    createDefaultSnapshot('purple-back', 'Purple Back', 'point', {
      color: '#6d56ff',
      intensity: 0.66,
      distance: 14,
      decay: 2,
      x: 0,
      y: 4.8,
      z: -5.5
    })
  );

  const syncAllHelperSelections = (): void => {
    for (const entry of entries) {
      syncLightHelpers(entry, selectedLightId);
    }
  };

  return {
    getSnapshot: () => entries.map((entry) => ({ ...entry.snapshot })),
    setLightValue: (id, key, value: number | string | boolean) => {
      const entry = entries.find((candidate) => candidate.snapshot.id === id);
      if (!entry) {
        return;
      }

      if (key === 'name') {
        entry.snapshot.name = String(value).trim() || entry.snapshot.name;
        return;
      }

      if (key === 'type') {
        const type = String(value) as LightType;
        if (
          type !== 'ambient' &&
          type !== 'hemisphere' &&
          type !== 'directional' &&
          type !== 'point' &&
          type !== 'spot'
        ) {
          return;
        }

        replaceLightType(entry, type);
        syncEntryInstance(entry, selectedLightId);
        return;
      }

      if (key === 'enabled') {
        entry.snapshot.enabled =
          typeof value === 'boolean'
            ? value
            : Number.isFinite(Number(value))
              ? Number(value) >= 0.5
              : String(value).toLowerCase() === 'true';
        syncEntryInstance(entry, selectedLightId);
        return;
      }

      if (key === 'color' || key === 'groundColor') {
        entry.snapshot[key] = toHexColor(String(value));
        syncEntryInstance(entry, selectedLightId);
        return;
      }

      const numeric = toNumber(
        typeof value === 'boolean' ? Number(value) : value,
        Number(entry.snapshot[key] ?? 0)
      );
      switch (key) {
        case 'intensity':
          entry.snapshot.intensity = clamp(numeric, 0, 8);
          break;
        case 'x':
        case 'y':
        case 'z':
        case 'targetX':
        case 'targetY':
        case 'targetZ':
          entry.snapshot[key] = clamp(numeric, -12, 12);
          break;
        case 'distance':
          entry.snapshot.distance = clamp(numeric, 0, 40);
          break;
        case 'decay':
          entry.snapshot.decay = clamp(numeric, 0, 4);
          break;
        case 'angle':
          entry.snapshot.angle = clamp(numeric, 0.05, 1.57);
          break;
        case 'penumbra':
          entry.snapshot.penumbra = clamp(numeric, 0, 1);
          break;
        default:
          return;
      }

      syncEntryInstance(entry, selectedLightId);
    },
    addLight: (type = 'point') => {
      debugLightCount += 1;
      const snapshot = mountSnapshot(
        createDefaultSnapshot(
          `debug-${debugLightCount}`,
          `Debug Light ${debugLightCount}`,
          type,
          {
            intensity: type === 'ambient' ? 0.15 : 0.9,
            x: (debugLightCount % 3) * 1.8 - 1.8,
            y: 4 + (debugLightCount % 2) * 0.7,
            z: 3.8
          }
        )
      );

      return { ...snapshot };
    },
    setSelectedLight: (id) => {
      const normalized =
        id && entries.some((entry) => entry.snapshot.id === id) ? id : null;
      if (selectedLightId === normalized) {
        return;
      }

      selectedLightId = normalized;
      syncAllHelperSelections();
    }
  };
};
