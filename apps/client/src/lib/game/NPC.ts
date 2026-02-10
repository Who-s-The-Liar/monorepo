import * as THREE from "three";
import { Character, type CharacterOptions } from "./Character";

interface CardAttachment {
  mesh: THREE.Mesh;
  bone: THREE.Bone;
  /** Local offset applied after bone world transform (in bone-local space) */
  localOffset: THREE.Vector3;
}

export class NPC extends Character {
  private cards: CardAttachment[] = [];

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

    // Find hand bones and create scene-level cards synced per frame
    this.attachCardToHand(model, "mixamorigLeftHand");
    this.attachCardToHand(model, "mixamorigRightHand");
  }

  private attachCardToHand(model: THREE.Group, boneName: string): void {
    let handBone: THREE.Bone | null = null;
    model.traverse((child) => {
      if (child instanceof THREE.Bone && child.name === boneName) {
        handBone = child;
      }
    });
    if (!handBone) return;

    // Card-stack proportions: width × thickness × height
    const geometry = new THREE.BoxGeometry(8, 1.5, 11);
    const material = new THREE.MeshStandardMaterial({
      color: 0xcc2222,
      roughness: 0.5,
    });
    const mesh = new THREE.Mesh(geometry, material);

    this.scene.add(mesh);

    // Offset toward fingertips so card sits in palm, not at wrist
    // In bone-local space, the finger direction varies per skeleton.
    // We'll apply the offset in world space during update using the bone's axes.
    this.cards.push({
      mesh,
      bone: handBone as THREE.Bone,
      localOffset: new THREE.Vector3(0, 2, 0), // slight upward to clear palm
    });
  }

  update(delta: number): void {
    super.update(delta);

    const boneWorldPos = new THREE.Vector3();
    const boneWorldQuat = new THREE.Quaternion();

    for (const { mesh, bone, localOffset } of this.cards) {
      bone.getWorldPosition(boneWorldPos);
      bone.getWorldQuaternion(boneWorldQuat);

      // Apply local offset rotated into world space
      const worldOffset = localOffset.clone().applyQuaternion(boneWorldQuat);
      mesh.position.copy(boneWorldPos).add(worldOffset);
      mesh.quaternion.copy(boneWorldQuat);
    }
  }

  /** Get world position of the right hand bone (card dealing origin) */
  getRightHandWorldPosition(): THREE.Vector3 | null {
    if (this.cards.length < 2) return null;
    const pos = new THREE.Vector3();
    this.cards[1].bone.getWorldPosition(pos);
    return pos;
  }

  /** Hide/show the static card-stack meshes in hands */
  setHandCardsVisible(visible: boolean): void {
    for (const { mesh } of this.cards) {
      mesh.visible = visible;
    }
  }

  dispose(): void {
    for (const { mesh } of this.cards) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.cards = [];
    super.dispose();
  }
}
