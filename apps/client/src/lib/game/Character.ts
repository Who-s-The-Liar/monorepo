import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";

export interface CharacterOptions {
  assetPath: string;
  position?: THREE.Vector3;
  rotation?: THREE.Euler;
  scale?: number;
}

// Mixamo lower body bone fragments — tracks matching these get stripped
const LOWER_BODY = ["hips", "upleg", "leg", "foot", "toe"];

function isLowerBodyTrack(trackName: string): boolean {
  const boneName = trackName.split(".")[0].toLowerCase();
  // Keep hips rotation but strip hips position (prevents standing up)
  if (boneName.includes("hips") && trackName.includes("position")) return true;
  return LOWER_BODY.some(
    (part) => boneName.includes(part) && !boneName.includes("hips")
  );
}

export class Character {
  protected model: THREE.Group | null = null;
  protected mixer: THREE.AnimationMixer | null = null;
  protected actions: Map<string, THREE.AnimationAction> = new Map();
  protected overlays: Set<string> = new Set();
  protected activeOverlay: THREE.AnimationAction | null = null;
  protected currentAction: THREE.AnimationAction | null = null;
  protected readonly scene: THREE.Scene;
  protected readonly options: CharacterOptions;

  constructor(scene: THREE.Scene, options: CharacterOptions) {
    this.scene = scene;
    this.options = options;
  }

  async load(): Promise<void> {
    const loader = new FBXLoader();
    return new Promise<void>((resolve, reject) => {
      loader.load(
        this.options.assetPath,
        (model) => {
          this.model = model;
          model.scale.setScalar(this.options.scale ?? 1);

          if (this.options.position) {
            model.position.copy(this.options.position);
          }
          if (this.options.rotation) {
            model.rotation.copy(this.options.rotation);
          }

          this.mixer = new THREE.AnimationMixer(model);
          this.onLoaded(model);
          this.scene.add(model);
          resolve();
        },
        undefined,
        (error) => reject(error)
      );
    });
  }

  /** Override in subclasses to customize model after load */
  protected onLoaded(model: THREE.Group): void {
    if (model.animations.length > 0 && this.mixer) {
      const action = this.mixer.clipAction(model.animations[0]);
      action.play();
      this.actions.set("base", action);
      this.currentAction = action;
    }
  }

  /**
   * Load an extra animation FBX (e.g. standing card shuffle),
   * strip lower body tracks so it layers on top of sitting.
   */
  async loadAnimation(
    name: string,
    fbxPath: string,
    upperBodyOnly = true
  ): Promise<void> {
    if (!this.mixer) return;
    const loader = new FBXLoader();
    return new Promise<void>((resolve, reject) => {
      loader.load(
        fbxPath,
        (animFbx) => {
          if (!this.mixer || animFbx.animations.length === 0) {
            resolve();
            return;
          }

          let clip = animFbx.animations[0];

          if (upperBodyOnly) {
            const filtered = clip.tracks.filter(
              (t) => !isLowerBodyTrack(t.name)
            );
            clip = new THREE.AnimationClip(name, clip.duration, filtered);
          }

          const action = this.mixer.clipAction(clip);
          this.actions.set(name, action);
          if (upperBodyOnly) this.overlays.add(name);
          resolve();
        },
        undefined,
        (error) => reject(error)
      );
    });
  }

  /** Play a named animation. Overlays layer on top of base; full clips crossfade. */
  playAnimation(name: string, fadeDuration = 0.4): void {
    const action = this.actions.get(name);
    if (!action || !this.mixer) return;

    if (this.overlays.has(name)) {
      // Layer overlay on top — keep base playing underneath
      if (action === this.activeOverlay) return;
      this.activeOverlay?.fadeOut(fadeDuration);
      action.reset().setEffectiveWeight(1).fadeIn(fadeDuration).play();
      this.activeOverlay = action;
    } else {
      // Full animation (e.g. switching back to "base") — fade out any overlay
      if (action === this.currentAction && !this.activeOverlay) return;
      this.activeOverlay?.fadeOut(fadeDuration);
      this.activeOverlay = null;
      if (action !== this.currentAction) {
        action.reset().setEffectiveWeight(1).fadeIn(fadeDuration).play();
        this.currentAction?.fadeOut(fadeDuration);
        this.currentAction = action;
      }
    }
  }

  update(delta: number): void {
    this.mixer?.update(delta);
  }

  dispose(): void {
    if (this.model) {
      this.scene.remove(this.model);
      this.model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m: THREE.Material) => m.dispose());
          } else {
            child.material?.dispose();
          }
        }
      });
    }
    this.actions.clear();
    this.overlays.clear();
    this.activeOverlay = null;
    this.currentAction = null;
    this.mixer = null;
    this.model = null;
  }
}
