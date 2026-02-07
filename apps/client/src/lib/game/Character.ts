import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";

export interface CharacterOptions {
  assetPath: string;
  position?: THREE.Vector3;
  rotation?: THREE.Euler;
  scale?: number;
}

export class Character {
  protected model: THREE.Group | null = null;
  protected mixer: THREE.AnimationMixer | null = null;
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
      this.mixer.clipAction(model.animations[0]).play();
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
    this.mixer = null;
    this.model = null;
  }
}
