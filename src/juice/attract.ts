export const ATTRACT_IDLE_SECONDS = 20;

export interface AttractState {
  phase: 'round' | 'idle' | 'attract';
  idleSeconds: number;
}

/** Real-time idle clock, independent of the simulation's slow motion. */
export class AttractMode {
  private state: AttractState = { phase: 'round', idleSeconds: 0 };
  private aimIndex = 0;
  private jitter = 0;

  public constructor(private readonly random: () => number = Math.random) {}

  public getState(): AttractState {
    return { ...this.state };
  }

  public endRound(): void {
    this.state = { phase: 'idle', idleSeconds: 0 };
  }

  public resetRound(): void {
    this.state = { phase: 'round', idleSeconds: 0 };
  }

  /** Returns true only when this input consumes the demo and starts a real round. */
  public input(): boolean {
    const consumed = this.state.phase === 'attract';
    this.state = {
      phase: consumed ? 'round' : this.state.phase,
      idleSeconds: 0
    };
    return consumed;
  }

  public activity(): void {
    if (this.state.phase === 'idle') this.state.idleSeconds = 0;
  }

  public update(realDt: number): boolean {
    if (this.state.phase !== 'idle') return false;
    this.state.idleSeconds += Math.max(0, realDt);
    return this.state.idleSeconds >= ATTRACT_IDLE_SECONDS && this.start();
  }

  public start(): boolean {
    if (this.state.phase !== 'idle') return false;
    this.state = { phase: 'attract', idleSeconds: 0 };
    this.aimIndex = Math.floor(this.random() * 26);
    this.dropped();
    return true;
  }

  public shouldDrop(
    jarAngles: readonly number[],
    angularSpeed: number,
    dropAngle: number,
    dropHeight: number,
    entryHeight: number,
    simulationDt: number
  ): boolean {
    return (
      this.state.phase === 'attract' &&
      secondsUntilDrop(
        jarAngles,
        angularSpeed,
        dropAngle,
        fallTimeToJar(dropHeight, entryHeight),
        this.jitter
      ) <= simulationDt
    );
  }

  public dropped(): void {
    // Correlated timing errors, rather than independent coin flips: a player can find
    // the rhythm, build a combo, then lose it. 17/26 aims are accurate; the random
    // starting point means some demos reach FEVER and others stay warm or hot.
    const index = this.aimIndex++ % 26;
    this.jitter = autopilotJitter(index, this.random());
  }
}

/** Two shots per passing jar, 200 ms apart; small human jitter or a deliberate late pair. */
export const autopilotJitter = (index: number, random: number): number =>
  (index % 26 < 17 ? -0.1 : 0.4) + (index % 2) * 0.2 + (random - 0.5) * 0.03;

/** Ball starts downward at 1.8 units/s; SceneRoot uses gravity 7.6. */
export const fallTimeToJar = (
  dropHeight: number,
  entryHeight: number
): number =>
  (Math.sqrt(1.8 ** 2 + 2 * 7.6 * Math.max(0, dropHeight - entryHeight)) -
    1.8) /
  7.6;

/** Seconds until a jar reaches the predicted ball-entry angle. Signed speed supports either orbit direction. */
export const secondsUntilDrop = (
  jarAngles: readonly number[],
  angularSpeed: number,
  dropAngle: number,
  fallSeconds: number,
  jitterSeconds: number
): number => {
  if (angularSpeed === 0) return Infinity;
  const period = (Math.PI * 2) / Math.abs(angularSpeed);
  return Math.min(
    ...jarAngles.map((angle) => {
      const delay =
        (dropAngle - angle) / angularSpeed - fallSeconds + jitterSeconds;
      return ((delay % period) + period) % period;
    })
  );
};
