import { MeshPhysicalMaterial, Vector3 } from 'three';
import type { SceneRoot } from '../scene/SceneRoot';
import { FeverBloom } from './bloom';
import { FeverBoard } from './board';
import { Trauma, TimeDistortion } from './core';
import { RingShow } from './ledShow';
import { Machinery } from './machinery';
import {
  FOV_PUNCH_DEGREES,
  HEAT_MACHINERY,
  LedDirector,
  blendMachinery,
  dropRecoil,
  jarSquash,
  maxPunchDegrees,
  punchEnvelope
} from './show';
import { advance, hit, initialJuiceState, miss } from './state';
import { ParticlePool } from './particles';
import { FeverSound } from './sound';
import { heatMusic } from './soundLogic';
import { DiscoTheme, screenPoint } from './theme';
import { canSkipFinale, roundRank, tallyScore, TALLY_SECONDS } from './finale';
import { JUICE_TABLE } from './table';
import type { JuiceEvent, JuiceSink } from './types';
import './style.css';

interface Popup {
  element: HTMLElement;
  position: Vector3;
  age: number;
  screen: boolean;
  milestone: boolean;
  lift: number;
  /** 1 while live; once pushed out it falls to 0 over POPUP_DISMISS_SECONDS and the popup is removed. */
  fade: number;
  dismissed: boolean;
}

/** At a fast hit rate, only the newest few world callouts stay; older ones fade out quickly. */
const MAX_LIVE_CALLOUTS = 4;
const POPUP_DISMISS_SECONDS = 0.15;

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
    <div class="fever-flash"></div>
    <div class="fever-attract" hidden>
      <span>DEMO</span>
      <b>PRESS DROP</b>
    </div>`;
  host.append(root);
  const stamp = root.querySelector<HTMLElement>('[data-fever-combo]')!;
  const label = root.querySelector<HTMLElement>('[data-fever-label]')!;
  const multiplier = root.querySelector<HTMLElement>(
    '[data-fever-multiplier]'
  )!;
  const meter = root.querySelector<HTMLElement>('.fever-meter')!;
  const fill = root.querySelector<HTMLElement>('.fever-meter i')!;
  const flash = root.querySelector<HTMLElement>('.fever-flash')!;
  const attractBanner = root.querySelector<HTMLElement>('.fever-attract')!;
  const particles = new ParticlePool(scene.scene);
  const sound = new FeverSound();
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
  const board = new FeverBoard(stage.statusDisplay);
  scene.scene.add(board.root);
  const theme = new DiscoTheme(scene.scene, scene.camera, scene.jars);
  const bloom = scene.renderer
    ? new FeverBloom(scene.renderer, scene.scene, scene.camera)
    : null;
  if (bloom) scene.renderOverride = () => bloom.render();
  let machine = { ...HEAT_MACHINERY.calm };
  let punchAge = Infinity;
  let dropAge = Infinity;
  const buttonBase = stage.dropButton.scale.clone();
  /** World units the camera dips on a drop; the trauma shake peaks near 0.035, so this stays inside the fit. */
  const DROP_KICK = 0.028;
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
  let finale: HTMLElement | null = null;
  let finaleAge = Infinity;
  let finaleScore = 0;
  let finaleWave = -1;
  let lastTally = -1;
  let shortFinale = false;
  const celebrate = (title: string, score: number, short = false): void => {
    finale?.remove();
    finale = document.createElement('section');
    finale.className = 'fever-finale';
    finale.innerHTML = `<small>${short ? 'NICE MOVES!' : 'ROUND COMPLETE'}</small><b class="fever-rank"></b><strong class="fever-tally"></strong><small>${short ? '' : 'PRESS DROP'}</small>`;
    finale.querySelector('b')!.textContent = title;
    root.append(finale);
    finale.dataset.wide = String(title.length > 1);
    popups.splice(0).forEach((p) => p.element.remove());
    finaleScore = score;
    finaleAge = 0;
    finaleWave = -1;
    lastTally = -1;
    shortFinale = short;
    if (!short) {
      stage.statusDisplay.visible = false;
      particles.reset();
    }
    theme.all('cheer');
    trauma.add(5, 0.025);
    punchAge = 0;
    sound.finale(short);
  };
  const fallback = new Vector3(0, 1.1, 0);
  const projected = new Vector3();

  const popup = (
    text: string,
    position: Vector3,
    color: string,
    screen: boolean,
    tag = '',
    milestone = false
  ): void => {
    // Bounded DOM, even under a scripted burst of hits.
    if (popups.length >= 24) popups.shift()!.element.remove();
    const dismiss = (p: Popup): void => {
      p.dismissed = true;
      p.element.dataset.dismissed = 'true';
    };
    if (milestone) {
      // A newer milestone replaces the older one instead of stacking over it.
      popups.filter((p) => p.milestone && !p.dismissed).forEach(dismiss);
    } else if (!screen) {
      const live = popups.filter(
        (p) => !p.screen && !p.milestone && !p.dismissed
      );
      live
        .slice(0, Math.max(0, live.length - (MAX_LIVE_CALLOUTS - 1)))
        .forEach(dismiss);
    }
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
        !p.screen &&
        !p.dismissed &&
        p.age < 0.7 &&
        p.position.distanceToSquared(position) < 0.1
    ).length;
    popups.push({
      element,
      position: position.clone(),
      age: 0,
      screen,
      milestone,
      lift: screen ? 0 : (lane % 3) * 112,
      fade: 1,
      dismissed: false
    });
  };

  const nearestJar = (position: Vector3): number => {
    let nearest = 0;
    for (let i = 1; i < scene.jars.length; i += 1) {
      if (
        scene.jars[i].position.distanceToSquared(position) <
        scene.jars[nearest].position.distanceToSquared(position)
      )
        nearest = i;
    }
    return nearest;
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
    sound.emit(event, state);
    const tuning =
      JUICE_TABLE[
        event === 'jar-hit' && state.feverRemaining > 0 ? 'bonus-jar' : event
      ];
    const position = worldPos ?? fallback;
    trauma.add(w, tuning.shake);
    time.request(tuning.scale, tuning.seconds);
    light = Math.max(light, tuning.light);
    flash.style.background = tuning.color;
    if (event !== 'round-end')
      particles.burst(position, tuning.particles, tuning.color);
    director.trigger(event, w);
    if (w >= 4) punchAge = 0;
    if (event === 'drop') {
      dropAge = 0;
      // Puff from the tube mouth: a ring of slow, short-lived sparks instead of the default upward fountain.
      const tube = stage.dropTube.position;
      const mouthY = tube.y - 0.5;
      for (let i = 0; i < 22; i += 1) {
        const a = (i / 22) * Math.PI * 2 + Math.random() * 0.3;
        const speed = 1.4 + Math.random() * 0.9;
        particles.spawn(
          tube.x + Math.cos(a) * 0.12,
          mouthY,
          tube.z + Math.sin(a) * 0.12,
          Math.cos(a) * speed,
          -0.4 - Math.random() * 0.5,
          Math.sin(a) * speed,
          i % 2 ? '#ffffff' : tuning.color,
          { decay: 2.6, gravity: 0.4, drag: 0.01, size: 2.6 }
        );
      }
    }
    if (event === 'rim-bounce' && worldPos)
      theme.mascot(nearestJar(worldPos), 'near-miss');
    if (event === 'jar-hit' && worldPos) {
      const nearest = nearestJar(worldPos);
      jarFlash[nearest] = 2.5;
      board.hit(w);
      jarAge[nearest] = 0;
      theme.mascot(nearest, 'hit');
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
    if (text && event !== 'round-end' && (event !== 'miss' || worldPos)) {
      popup(
        text,
        position,
        tuning.color,
        event === 'fever-start',
        tag,
        event === 'combo-milestone'
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
    finishRound(score, hits) {
      celebrate(roundRank(score, hits, ballsTotal), score);
    },
    skipFinale() {
      if (!shortFinale && canSkipFinale(finaleAge)) finaleAge = TALLY_SECONDS;
    },
    update(realDt, ballsRemaining, score = 0) {
      const started = performance.now();
      const wasFever = state.feverRemaining > 0;
      state = advance(state, realDt);
      if (wasFever && state.feverRemaining <= 0 && !ended)
        celebrate('FEVER COMPLETE', 0, true);
      if (finale) {
        finaleAge += realDt;
        const score = tallyScore(finaleScore, finaleAge);
        finale.querySelector('strong')!.textContent = shortFinale
          ? ''
          : score.toLocaleString();
        if (
          score !== lastTally &&
          Math.floor(finaleAge * 12) !== Math.floor((finaleAge - realDt) * 12)
        )
          sound.tick();
        lastTally = score;
        const wave = Math.floor(finaleAge / 0.85);
        if (wave !== finaleWave && finaleAge < (shortFinale ? 0.9 : 3.3)) {
          finaleWave = wave;
          for (let rocket = 0; rocket < (shortFinale ? 1 : 3); rocket += 1) {
            const origin = screenPoint(
              scene.camera,
              -0.8 + rocket * 0.4,
              -0.85,
              8,
              new Vector3()
            );
            const color = ['#ff85de', '#ffe78a', '#72efff'][rocket % 3];
            for (let n = 0; n < 14; n += 1) {
              const angle = Math.random() * Math.PI * 2;
              particles.spawn(
                origin.x,
                origin.y,
                origin.z,
                Math.cos(angle) * 2.5,
                4 + Math.random() * 5,
                Math.sin(angle) * 1.5,
                color,
                { decay: 1.4, gravity: 3, size: 1.1 }
              );
            }
          }
          for (let rocket = 0; rocket < 3; rocket += 1) {
            const burst = screenPoint(
              scene.camera,
              -0.65 + rocket * 0.65,
              0.25 + (wave % 2) * 0.3,
              7,
              new Vector3()
            );
            particles.burst(
              burst,
              shortFinale ? 12 : 24,
              ['#ff85de', '#ffe78a', '#72efff'][rocket]
            );
          }
          const top = screenPoint(scene.camera, 0, 0.8, 7, new Vector3());
          for (let n = 0; n < (shortFinale ? 16 : 42); n += 1)
            particles.spawn(
              top.x + (Math.random() - 0.5) * 7,
              top.y,
              top.z,
              (Math.random() - 0.5) * 2,
              -Math.random() * 2,
              0,
              ['#ff85de', '#ffe78a', '#72efff'][n % 3],
              { decay: 1.2, gravity: 1, size: 0.8 }
            );
        }
        if (shortFinale && finaleAge >= 1.5) {
          finale.remove();
          finale = null;
          theme.all('calm');
        }
      }
      scale = time.update(realDt);
      sound.update(state, scale, realDt);
      const offset = trauma.update(realDt);
      dropAge += realDt;
      const recoil = dropRecoil(dropAge);
      scene.setCameraOffset(offset.x, offset.y - recoil.kick * DROP_KICK);
      stage.dropButton.scale.set(
        buttonBase.x * recoil.xz,
        buttonBase.y * recoil.y,
        buttonBase.z * recoil.xz
      );
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
      board.setScore(score);
      board.update(realDt, state.heat);
      theme.update(realDt, state.heat, heatMusic(state.heat).bpm);
      if (bloom) bloom.strength = ended ? 0.25 : machine.bloom;
      punchAge += realDt;
      scene.setFovPunch(punchDegrees * punchEnvelope(punchAge));
      for (let i = popups.length - 1; i >= 0; i -= 1) {
        const p = popups[i];
        p.age += realDt;
        if (p.dismissed)
          p.fade = Math.max(0, p.fade - realDt / POPUP_DISMISS_SECONDS);
        if (p.age > 1.4 || p.fade <= 0) {
          p.element.remove();
          popups.splice(i, 1);
          continue;
        }
        projected.copy(p.position).project(scene.camera);
        p.element.style.left = `${p.screen || p.milestone ? 50 : Math.max(24, Math.min(76, (projected.x * 0.5 + 0.5) * 100))}%`;
        p.element.style.top = `${p.screen ? 40 : (-projected.y * 0.5 + 0.5) * 100}%`;
        const spring = 1 - Math.exp(-p.age * 12) * Math.cos(p.age * 20);
        p.element.style.transform = `translate(-50%, calc(-100% - ${p.age * 75 + p.lift}px)) scale(${spring}) rotate(-5deg)`;
        p.element.style.opacity = String(
          Math.min(1, (1.4 - p.age) * 3) * p.fade
        );
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
      sound.reset();
      finale?.remove();
      finale = null;
      finaleAge = Infinity;
      stage.statusDisplay.visible = true;
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
      board.reset();
      theme.reset();
      machine = { ...HEAT_MACHINERY.calm };
      punchAge = Infinity;
      dropAge = Infinity;
      stage.dropButton.scale.copy(buttonBase);
      scene.setFovPunch(0);
      scene.setCameraOffset(0, 0);
    },
    setAttract(active) {
      attractBanner.hidden = !active;
      sound.setAttract(active);
    },
    setQuality(tier) {
      // Low tier: no bloom, static machinery. Pixel ratio and LEDs follow Game's own tier settings.
      if (bloom) bloom.enabled = tier !== 'low';
      machinery.setAnimated(tier !== 'low');
      board.setAnimated(tier !== 'low');
      theme.setAnimated(tier !== 'low');
    },
    getStats: () => ({
      bloom: bloom?.enabled ?? false,
      calls: bloom?.calls ?? 0,
      juiceMs,
      particles: particles.live,
      board: {
        shown: board.shown,
        score: board.score,
        maxNdc: board.maxNdc(scene.camera)
      }
    }),
    destroy() {
      stage.statusDisplay.visible = true;
      sound.destroy();
      particles.destroy();
      machinery.dispose();
      board.dispose();
      theme.dispose();
      ringShow?.dispose();
      bloom?.dispose();
      scene.renderOverride = undefined;
      root.remove();
      restoreJars();
      jarMaterials.forEach((material, i) => {
        material.emissiveIntensity = baseEmissive[i];
      });
      stage.dropButton.scale.copy(buttonBase);
      scene.setFovPunch(0);
      scene.setCameraOffset(0, 0);
    }
  };
};
