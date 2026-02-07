import * as THREE from "three";
import { Character, type CharacterOptions } from "./Character";

export class NPC extends Character {
  constructor(scene: THREE.Scene, options: CharacterOptions) {
    super(scene, options);
  }

  /** Freeze at frame 0 of the base animation — hands-on-table idle pose */
  protected onLoaded(model: THREE.Group): void {
    if (model.animations.length > 0 && this.mixer) {
      const action = this.mixer.clipAction(model.animations[0]);
      action.play();
      action.paused = true;
      this.actions.set("base", action);
      this.currentAction = action;
    }
  }
}
