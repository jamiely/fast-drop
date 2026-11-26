/** Bounded trauma; squared weight in, squared trauma out. Sine layers avoid random-frame jitter. */
export class Trauma {
  public value = 0;
  private elapsed = 0;

  public add(weight: number, strength: number): void {
    this.value = Math.min(1, this.value + weight * weight * strength);
  }

  public update(realDt: number): { x: number; y: number } {
    const dt = Math.max(0, realDt);
    this.elapsed += dt;
    this.value = Math.max(0, this.value - dt * 1.8);
    const amplitude = this.value * this.value * 0.035;
    return {
      x:
        (amplitude *
          (Math.sin(this.elapsed * 39) + Math.sin(this.elapsed * 23))) /
        2,
      y: amplitude * Math.sin(this.elapsed * 31 + 1)
    };
  }
}

/** Budget counts *real seconds under distortion*, stricter than a 2 s lost-simulation budget. */
export class TimeDistortion {
  public used = 0;
  private effects: Array<{ scale: number; remaining: number }> = [];

  public request(scale: number, seconds: number): void {
    if (this.used >= 2 || seconds <= 0 || scale >= 1) return;
    this.effects.push({ scale: Math.max(0.25, scale), remaining: seconds });
  }

  /** Frame-averaged scale. Each overlapping effect keeps its own expiry, never stretching hit-stop. */
  public update(realDt: number): number {
    if (realDt <= 0) return 1;
    let remainingDt = realDt;
    let simulated = 0;
    while (remainingDt > 0 && this.effects.length > 0 && this.used < 2) {
      const duration = Math.min(
        remainingDt,
        2 - this.used,
        ...this.effects.map((effect) => effect.remaining)
      );
      const scale = Math.min(...this.effects.map((effect) => effect.scale));
      simulated += duration * scale;
      this.used += duration;
      remainingDt -= duration;
      this.effects = this.effects
        .map((effect) => ({
          ...effect,
          remaining: effect.remaining - duration
        }))
        .filter((effect) => effect.remaining > 0);
    }
    if (this.used >= 2) this.effects = [];
    return Math.max(0.25, Math.min(1, (simulated + remainingDt) / realDt));
  }
}
