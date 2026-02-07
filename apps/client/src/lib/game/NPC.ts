import * as THREE from "three";
import { Character, type CharacterOptions } from "./Character";
import { TABLE_HEIGHT } from "./seating";

const TABLE_SURFACE = TABLE_HEIGHT + 2;
const STEP = 0.04; // rotation step per iteration (radians)
const MAX_ITER = 12;

const _handPos = new THREE.Vector3();
const _probePos = new THREE.Vector3();

export class NPC extends Character {
  private leftForeArm: THREE.Bone | null = null;
  private rightForeArm: THREE.Bone | null = null;
  private leftHand: THREE.Bone | null = null;
  private rightHand: THREE.Bone | null = null;

  constructor(scene: THREE.Scene, options: CharacterOptions) {
    super(scene, options);
  }

  protected onLoaded(model: THREE.Group): void {
    super.onLoaded(model);

    model.traverse((child) => {
      if (!(child instanceof THREE.Bone)) return;
      const n = child.name.toLowerCase();
      if (n.endsWith("leftforearm")) this.leftForeArm = child;
      else if (n.endsWith("rightforearm")) this.rightForeArm = child;
      else if (n.endsWith("lefthand")) this.leftHand = child;
      else if (n.endsWith("righthand")) this.rightHand = child;
    });
  }

  update(delta: number): void {
    super.update(delta);
    this.resolveTableCollision(this.leftForeArm, this.leftHand);
    this.resolveTableCollision(this.rightForeArm, this.rightHand);
  }

  /**
   * Iteratively rotate the forearm so the hand clears the table.
   * Probes both rotation directions first to find which one actually
   * lifts the hand (bone local axes vary between models).
   */
  private resolveTableCollision(
    forearm: THREE.Bone | null,
    hand: THREE.Bone | null
  ): void {
    if (!forearm || !hand) return;

    hand.updateMatrixWorld(true);
    hand.getWorldPosition(_handPos);
    if (_handPos.y >= TABLE_SURFACE) return;

    // Probe: which direction on rotation.x lifts the hand?
    const saved = forearm.rotation.x;

    forearm.rotation.x = saved - STEP;
    forearm.updateMatrix();
    forearm.updateMatrixWorld(true);
    hand.getWorldPosition(_probePos);
    const negLift = _probePos.y - _handPos.y;

    // Reset
    forearm.rotation.x = saved;
    forearm.updateMatrix();
    forearm.updateMatrixWorld(true);

    const dir = negLift > 0 ? -1 : 1;

    // Iteratively rotate until hand clears the table
    for (let i = 0; i < MAX_ITER; i++) {
      hand.updateMatrixWorld(true);
      hand.getWorldPosition(_handPos);
      if (_handPos.y >= TABLE_SURFACE) break;

      forearm.rotation.x += dir * STEP;
      forearm.updateMatrix();
      forearm.updateMatrixWorld(true);
    }
  }
}
