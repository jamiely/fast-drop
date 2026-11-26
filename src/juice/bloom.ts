import {
  HalfFloatType,
  Vector2,
  WebGLRenderTarget,
  type Camera,
  type Scene,
  type WebGLRenderer
} from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

/**
 * Fever's only post effect. UnrealBloomPass already runs its bright pass and first mip at half the composer
 * size, so the blur chain is half resolution or less. OutputPass only converts to sRGB. The scene target has
 * no MSAA: 4× samples on the half-float target doubled frame time to 33 ms spikes even on an M1, so edges are
 * aliased while bloom is on (the low tier renders straight to the antialiased canvas).
 *
 * Bloom is selective by brightness: the half-float target keeps values above 1, the threshold sits just above
 * white, and only things Fever drives past 1 (LEDs, bulbs, piston rods, jar flashes) glow. Lit white plastic
 * and the display stay crisp.
 */
export const BLOOM_THRESHOLD = 1.02;
export class FeverBloom {
  public enabled = true;
  /** Draw calls of the last frame, scene and post passes together. */
  public calls = 0;
  private readonly composer: EffectComposer;
  private readonly pass: UnrealBloomPass;
  private readonly output = new OutputPass();
  private readonly size = new Vector2();
  private pixelRatio = 0;

  public constructor(
    private readonly renderer: WebGLRenderer,
    private readonly scene: Scene,
    private readonly camera: Camera
  ) {
    renderer.getSize(this.size);
    const target = new WebGLRenderTarget(1, 1, {
      type: HalfFloatType,
      samples: 0
    });
    this.composer = new EffectComposer(renderer, target);
    this.pass = new UnrealBloomPass(
      this.size.clone(),
      0.4,
      0.15,
      BLOOM_THRESHOLD
    );
    this.composer.addPass(new RenderPass(scene, camera));
    this.composer.addPass(this.pass);
    this.composer.addPass(this.output);
    // Several renders per frame: count them all, reset once per frame below.
    renderer.info.autoReset = false;
    this.syncSize();
  }

  public set strength(value: number) {
    this.pass.strength = value;
  }

  public render(): void {
    this.renderer.info.reset();
    if (this.enabled) {
      this.syncSize();
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
    this.calls = this.renderer.info.render.calls;
  }

  public dispose(): void {
    this.renderer.info.autoReset = true;
    this.pass.dispose();
    this.output.dispose();
    this.composer.dispose();
  }

  /** Follows the renderer's size and pixel ratio, which resize and the quality tiers change. */
  private syncSize(): void {
    const ratio = this.renderer.getPixelRatio();
    const width = this.size.x;
    const height = this.size.y;
    this.renderer.getSize(this.size);
    if (
      ratio === this.pixelRatio &&
      width === this.size.x &&
      height === this.size.y
    )
      return;
    this.pixelRatio = ratio;
    this.composer.setPixelRatio(ratio);
    this.composer.setSize(this.size.x, this.size.y);
    // Only bloom runs at quarter resolution; keep scene geometry and the HUD crisp.
    this.pass.setSize(this.size.x * ratio * 0.5, this.size.y * ratio * 0.5);
  }
}
