import * as THREE from "three";
import { Character, type CharacterOptions } from "./Character";

export interface PlayerOptions extends CharacterOptions {
  neckPosition: THREE.Vector3;
  eyeOffset: THREE.Vector3;
  /** Initial camera yaw so it faces the right direction */
  initialYaw?: number;
  headLimits?: {
    yawMin: number;
    yawMax: number;
    pitchMin: number;
    pitchMax: number;
  };
  smoothing?: number;
}

const DEFAULT_LIMITS = {
  yawMin: -Math.PI * 0.45,
  yawMax: Math.PI * 0.45,
  pitchMin: -Math.PI * 0.35,
  pitchMax: Math.PI * 0.3,
};

export type PointerLockCallback = (locked: boolean) => void;

export class Player extends Character {
  private readonly camera: THREE.PerspectiveCamera;
  private readonly neckPosition: THREE.Vector3;
  private readonly eyeOffset: THREE.Vector3;
  private readonly limits: typeof DEFAULT_LIMITS;
  private readonly smoothing: number;

  private targetYaw: number;
  private targetPitch = 0;
  private currentYaw: number;
  private currentPitch = 0;

  private onPointerLockChange: PointerLockCallback | null = null;
  private rendererDomElement: HTMLCanvasElement | null = null;

  /** When true, Player stops controlling the camera (debug fly-cam takes over) */
  debugMode = false;

  private readonly boundMouseMove: (e: MouseEvent) => void;
  private readonly boundClick: () => void;
  private readonly boundLockChange: () => void;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    options: PlayerOptions
  ) {
    super(scene, options);
    this.camera = camera;
    this.neckPosition = options.neckPosition.clone();
    this.eyeOffset = options.eyeOffset.clone();
    const baseYaw = options.initialYaw ?? 0;
    const rawLimits = { ...DEFAULT_LIMITS, ...options.headLimits };
    // Offset yaw limits around the initial facing direction
    this.limits = {
      yawMin: baseYaw + rawLimits.yawMin,
      yawMax: baseYaw + rawLimits.yawMax,
      pitchMin: rawLimits.pitchMin,
      pitchMax: rawLimits.pitchMax,
    };
    this.smoothing = options.smoothing ?? 0.15;
    this.targetYaw = baseYaw;
    this.currentYaw = baseYaw;

    this.boundMouseMove = this.handleMouseMove.bind(this);
    this.boundClick = this.handleClick.bind(this);
    this.boundLockChange = this.handleLockChange.bind(this);
  }

  attachControls(
    rendererDomElement: HTMLCanvasElement,
    onPointerLockChange?: PointerLockCallback
  ): void {
    this.rendererDomElement = rendererDomElement;
    this.onPointerLockChange = onPointerLockChange ?? null;

    document.addEventListener("mousemove", this.boundMouseMove);
    rendererDomElement.addEventListener("click", this.boundClick);
    document.addEventListener("pointerlockchange", this.boundLockChange);
  }

  protected onLoaded(model: THREE.Group): void {
    // Hide head mesh
    model.traverse((child) => {
      if (child.name.toLowerCase().includes("head")) {
        child.visible = false;
      }
    });

    // Play animation but freeze at frame 0
    if (model.animations.length > 0 && this.mixer) {
      const action = this.mixer.clipAction(model.animations[0]);
      action.play();
      action.paused = true;
    }
  }

  update(delta: number): void {
    super.update(delta);
    if (!this.debugMode) {
      this.updateCamera();
    }
  }

  private updateCamera(): void {
    this.currentYaw += (this.targetYaw - this.currentYaw) * this.smoothing;
    this.currentPitch +=
      (this.targetPitch - this.currentPitch) * this.smoothing;

    const quaternion = new THREE.Quaternion();
    quaternion.setFromEuler(
      new THREE.Euler(this.currentPitch, this.currentYaw, 0, "YXZ")
    );

    const rotatedOffset = this.eyeOffset.clone().applyQuaternion(quaternion);
    this.camera.position.copy(this.neckPosition).add(rotatedOffset);
    this.camera.quaternion.copy(quaternion);
  }

  private handleMouseMove(e: MouseEvent): void {
    if (
      !this.rendererDomElement ||
      document.pointerLockElement !== this.rendererDomElement
    )
      return;

    this.targetYaw -= e.movementX * 0.002;
    this.targetPitch -= e.movementY * 0.002;

    this.targetYaw = Math.max(
      this.limits.yawMin,
      Math.min(this.limits.yawMax, this.targetYaw)
    );
    this.targetPitch = Math.max(
      this.limits.pitchMin,
      Math.min(this.limits.pitchMax, this.targetPitch)
    );
  }

  private handleClick(): void {
    this.rendererDomElement?.requestPointerLock()?.catch(() => {});
  }

  private handleLockChange(): void {
    const locked = document.pointerLockElement === this.rendererDomElement;
    this.onPointerLockChange?.(locked);
  }

  dispose(): void {
    document.removeEventListener("mousemove", this.boundMouseMove);
    document.removeEventListener("pointerlockchange", this.boundLockChange);
    if (this.rendererDomElement) {
      this.rendererDomElement.removeEventListener("click", this.boundClick);
    }
    this.rendererDomElement = null;
    this.onPointerLockChange = null;
    super.dispose();
  }
}
