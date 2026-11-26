import { MeshPhysicalMaterial, Vector3 } from 'three';
import type { SceneRoot } from '../scene/SceneRoot';
import { FeverBloom } from './bloom';
import { Trauma, TimeDistortion } from './core';
import { RingShow } from './ledShow';
import { Machinery } from './machinery';
import {
  FOV_PUNCH_DEGREES,
  HEAT_MACHINERY,
  LedDirector,
  blendMachinery,
  jarSquash,
  maxPunchDegrees,
  punchEnvelope
} from './show';
import { advance, hit, initialJuiceState, miss } from './state';
import { ParticlePool } from './particles';
import { JUICE_TABLE } from './table';
import type { JuiceEvent, JuiceSink } from './types';
import './style.css';

interface Popup {
  element: HTMLElement;
  position: Vector3;
  age: number;
  screen: boolean;
  lift: number;
}

export const createFeverSink = (
  host: HTMLElement,
  scene: SceneRoot,
  ballsTotal: number
): JuiceSink => {
  const root = document.createElement('div');
  root.className = 'fever-overlay';
  root.dataset.juice = 'FAST_DROP_FEVER_JUICE_CORE';
  root.innerHTML = `
    <header class="fever-hud">
      <div class="fever-edition">FAST DROP <b>FEVER</b></div>
      <div class="fever-stamp" data-fever-combo></div>
      <div class="fever-meter-label"><span data-fever-label>BUILD THE FEVER</span><b data-fever-multiplier>×1</b></div>
      <div class="fever-meter" role="meter" aria-label="Fever" aria-valuemin="0" aria-valuemax="15" aria-valuenow="0"><i></i></div>
    </header>
    <div class="fever-flash"></div>`;
  host.append(root);
  const stamp = root.querySelector<HTMLElement>('[data-fever-combo]')!;
  const label = root.querySelector<HTMLElement>('[data-fever-label]')!;
  const multiplier = root.querySelector<HTMLElement>(
    '[data-fever-multiplier]'
  )!;
  const meter = root.querySelector<HTMLElement>('.fever-meter')!;
  const fill = root.querySelector<HTMLElement>('.fever-meter i')!;
  const flash = root.querySelector<HTMLElement>('.fever-flash')!;
  const particles = new ParticlePool(scene.scene);
  const popups: Popup[] = [];
  const jarMaterials = scene.jars.map(
    (jar) => jar.material as MeshPhysicalMaterial
  );
  const baseEmissive = jarMaterials.map(
    (material) => material.emissiveIntensity
  );
  const jarFlash = jarMaterials.map(() => 0);
  const jarAge = jarMaterials.map(() => Infinity);
  // Jars rest on their base at half their height; the squash keeps the base on the petal.
  const jarBase = scene.jars.map((jar) => ({
    scale: jar.scale.clone(),
    y: jar.position.y
  }));
  const restoreJars = (): void =>
    scene.jars.forEach((jar, i) => {
      jar.scale.copy(jarBase[i].scale);
      jar.position.y = jarBase[i].y;
    });
  const stage = scene.getStage();
  const ringShow = stage.ledOverlay ? new RingShow(stage.ledOverlay) : null;
  const director = new LedDirector();
  const outerRingRadius = stage.ledOverlay?.geometry.parameters.radius ?? 3.1;
  const machinery = new Machinery({ ...stage, outerRingRadius }, ballsTotal);
  scene.scene.add(machinery.root);
  const bloom = scene.renderer
    ? new FeverBloom(scene.renderer, scene.scene, scene.camera)
    : null;
  if (bloom) scene.renderOverride = () => bloom.render();
  let machine = { ...HEAT_MACHINERY.calm };
  let punchAge = Infinity;
  // −3° would push the portrait fit's edge points to |NDC| ≈ 1.003; punch as far as keeps them at 0.985, leaving room for the shake.
  const punchDegrees = Math.max(
    FOV_PUNCH_DEGREES,
    maxPunchDegrees(stage.baseFov, stage.fitMargin, 0.985)
  );
  let juiceMs = 0;
  let state = initialJuiceState();
  let trauma = new Trauma();
  let time = new TimeDistortion();
  let scale = 1;
  let light = 0;
  let fireworksTimer = 0;
  let ended = false;
  const fallback = new Vector3(0, 1.1, 0);
  const projected = new Vector3();

  const popup = (
    text: string,
    position: Vector3,
    color: string,
    screen: boolean,
    tag = ''
  ): void => {
    // Bounded DOM, even under a scripted burst of hits.
    if (popups.length >= 24) popups.shift()!.element.remove();
    const element = document.createElement('div');
    element.className = `fever-popup${screen ? ' fever-popup--hero' : ''}`;
    element.textContent = text;
    element.style.color = color;
    if (tag) {
      // The multiplier that produced these points, as a badge: "+30" is what was awarded, not 30 × 3.
      const badge = document.createElement('small');
      badge.className = 'fever-popup__tag';
      badge.textContent = tag;
      badge.style.background = color;
      element.append(badge);
    }
    root.append(element);
    const lane = popups.filter(
      (p) =>
        !p.screen && p.age < 0.7 && p.position.distanceToSquared(position) < 0.1
    ).length;
    popups.push({
      element,
      position: position.clone(),
      age: 0,
      screen,
      lift: screen ? 0 : (lane % 3) * 112
    });
  };

  const emit = (
    event: JuiceEvent,
    weight: number,
    worldPos?: Vector3
  ): void => {
    if (ended) return;
    const w = Math.max(1, Math.min(5, weight));
    let starts = false;
    if (event === 'jar-hit') {
      const previous = state;
      state = hit(state);
      starts = previous.feverRemaining <= 0 && state.feverRemaining > 0;
    } else if (event === 'miss') {
      state = miss(state);
    }
    const tuning =
      JUICE_TABLE[
        event === 'jar-hit' && state.feverRemaining > 0 ? 'bonus-jar' : event
      ];
    const position = worldPos ?? fallback;
    trauma.add(w, tuning.shake);
    time.request(tuning.scale, tuning.seconds);
    light = Math.max(light, tuning.light);
    flash.style.background = tuning.color;
    particles.burst(position, tuning.particles, tuning.color);
    director.trigger(event, w);
    if (w >= 4) punchAge = 0;
    if (event === 'jar-hit' && worldPos) {
      let nearest = 0;
      for (let i = 1; i < scene.jars.length; i += 1) {
        if (
          scene.jars[i].position.distanceToSquared(worldPos) <
          scene.jars[nearest].position.distanceToSquared(worldPos)
        )
          nearest = i;
      }
      jarFlash[nearest] = 2.5;
      jarAge[nearest] = 0;
      const jar = scene.jars[nearest].position;
      ringShow?.burstAt(Math.atan2(jar.z, jar.x));
    }
    let text = tuning.text;
    let tag = '';
    if (event === 'jar-hit') {
      text = `+${10 * state.multiplier}`;
      if (state.multiplier > 1) tag = `×${state.multiplier}`;
    }
    if (event === 'combo-milestone') text = `${state.combo} COMBO!`;
    if (text && (event !== 'miss' || worldPos)) {
      popup(
        text,
        position,
        tuning.color,
        event === 'fever-start' || event === 'round-end',
        tag
      );
    }
    if (event === 'jar-hit' && state.combo % 5 === 0)
      emit('combo-milestone', Math.min(5, 2 + state.combo / 5), position);
    if (starts) emit('fever-start', 5, position);
    if (event === 'round-end') {
      ended = true;
      state = {
        ...state,
        feverRemaining: 0,
        orbitScale: 1,
        heat: 'calm',
        meter: 0
      };
    }
  };

  return {
    emit,
    update(realDt, ballsRemaining) {
      const started = performance.now();
      state = advance(state, realDt);
      scale = time.update(realDt);
      const offset = trauma.update(realDt);
      scene.setCameraOffset(offset.x, offset.y);
      particles.update(realDt, scene.camera);
      light = Math.max(0, light - realDt * 1.8);
      flash.style.opacity = String(light * 0.5);
      root.dataset.heat = state.heat;
      root.dataset.ended = String(ended);
      stamp.textContent = `${state.combo} COMBO`;
      stamp.dataset.visible = String(state.combo > 0 && !ended);
      multiplier.textContent = `×${state.multiplier}`;
      label.textContent = ended
        ? 'ROUND COMPLETE'
        : state.feverRemaining > 0
          ? `FEVER · ${state.feverRemaining.toFixed(1)}s`
          : 'BUILD THE FEVER';
      const progress =
        state.feverRemaining > 0 ? state.feverRemaining / 6 : state.meter;
      fill.style.transform = `scaleX(${progress})`;
      meter.setAttribute('aria-valuenow', String(Math.round(progress * 15)));
      for (let i = 0; i < jarFlash.length; i += 1) {
        jarFlash[i] = Math.max(0, jarFlash[i] - realDt * 6);
        jarMaterials[i].emissiveIntensity = baseEmissive[i] + jarFlash[i];
        // Squash and stretch about the jar's base: SceneRoot keeps the jar centred at half its height.
        jarAge[i] += realDt;
        const squash = jarSquash(jarAge[i]);
        const jar = scene.jars[i];
        const base = jarBase[i];
        if (squash.y !== 1 || jar.scale.y !== base.scale.y) {
          jar.scale.set(
            base.scale.x * squash.xz,
            base.scale.y * squash.y,
            base.scale.z * squash.xz
          );
          jar.position.y = base.y * squash.y;
        }
      }
      machine = blendMachinery(machine, state.heat, realDt);
      ringShow?.update(realDt, director.update(realDt, state.heat));
      machinery.update(realDt, state.heat, machine, ballsRemaining);
      if (bloom) bloom.strength = machine.bloom;
      punchAge += realDt;
      scene.setFovPunch(punchDegrees * punchEnvelope(punchAge));
      for (let i = popups.length - 1; i >= 0; i -= 1) {
        const p = popups[i];
        p.age += realDt;
        if (p.age > 1.4) {
          p.element.remove();
          popups.splice(i, 1);
          continue;
        }
        projected.copy(p.position).project(scene.camera);
        p.element.style.left = `${p.screen ? 50 : (projected.x * 0.5 + 0.5) * 100}%`;
        p.element.style.top = `${p.screen ? 40 : (-projected.y * 0.5 + 0.5) * 100}%`;
        const spring = 1 - Math.exp(-p.age * 12) * Math.cos(p.age * 20);
        p.element.style.transform = `translate(-50%, calc(-100% - ${p.age * 75 + p.lift}px)) scale(${spring}) rotate(-5deg)`;
        p.element.style.opacity = String(Math.min(1, (1.4 - p.age) * 3));
      }
      if (state.feverRemaining > 0) {
        fireworksTimer += realDt;
        if (fireworksTimer >= 0.2) {
          fireworksTimer = 0;
          const jar = scene.jars[Math.floor(Math.random() * scene.jars.length)];
          particles.burst(
            jar.position.clone().add(new Vector3(0, 0.5, 0)),
            JUICE_TABLE['fever-start'].particles / 10,
            JUICE_TABLE['fever-start'].color
          );
        }
      }
      juiceMs = juiceMs * 0.95 + (performance.now() - started) * 0.05;
    },
    timeScale: () => scale,
    getState: () => ({ ...state }),
    reset() {
      state = initialJuiceState();
      trauma = new Trauma();
      time = new TimeDistortion();
      scale = 1;
      light = 0;
      ended = false;
      fireworksTimer = 0;
      jarFlash.fill(0);
      jarAge.fill(Infinity);
      restoreJars();
      jarMaterials.forEach((material, i) => {
        material.emissiveIntensity = baseEmissive[i];
      });
      popups.splice(0).forEach((p) => p.element.remove());
      particles.reset();
      director.reset();
      machinery.reset();
      machine = { ...HEAT_MACHINERY.calm };
      punchAge = Infinity;
      scene.setFovPunch(0);
      scene.setCameraOffset(0, 0);
    },
    setQuality(tier) {
      // Low tier: no bloom, static machinery. Pixel ratio and LEDs follow Game's own tier settings.
      if (bloom) bloom.enabled = tier !== 'low';
      machinery.setAnimated(tier !== 'low');
    },
    getStats: () => ({
      bloom: bloom?.enabled ?? false,
      calls: bloom?.calls ?? 0,
      juiceMs
    }),
    destroy() {
      particles.destroy();
      machinery.dispose();
      ringShow?.dispose();
      bloom?.dispose();
      scene.renderOverride = undefined;
      root.remove();
      restoreJars();
      jarMaterials.forEach((material, i) => {
        material.emissiveIntensity = baseEmissive[i];
      });
      scene.setFovPunch(0);
      scene.setCameraOffset(0, 0);
    }
  };
};
