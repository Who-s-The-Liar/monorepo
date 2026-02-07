import * as THREE from "three";
import { Character, type CharacterOptions } from "./Character";

export class NPC extends Character {
  constructor(scene: THREE.Scene, options: CharacterOptions) {
    super(scene, options);
  }
}
