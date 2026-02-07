import * as THREE from "three";
import type { Character } from "./Character";

export class Game {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly clock: THREE.Clock;

  private characters: Character[] = [];
  private animationFrameId: number | null = null;
  private container: HTMLElement;
  private disposed = false;

  // Debug fly camera
  private _debugMode = false;
  private savedCameraPos: THREE.Vector3 | null = null;
  private savedCameraQuat: THREE.Quaternion | null = null;
  private debugYaw = 0;
  private debugPitch = 0;
  private keysPressed = new Set<string>();
  private readonly boundDebugKeyDown: (e: KeyboardEvent) => void;
  private readonly boundDebugKeyUp: (e: KeyboardEvent) => void;
  private readonly boundDebugMouseMove: (e: MouseEvent) => void;
  private readonly boundDebugClick: () => void;

  constructor(container: HTMLElement) {
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a1a);

    this.camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      500
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(this.renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 200, 100);
    this.scene.add(directionalLight);

    // Ground
    const gridHelper = new THREE.GridHelper(1000, 100, 0x444444, 0x222222);
    this.scene.add(gridHelper);

    this.clock = new THREE.Clock();

    this.handleResize = this.handleResize.bind(this);
    window.addEventListener("resize", this.handleResize);

    // Pre-bind debug handlers
    this.boundDebugKeyDown = (e: KeyboardEvent) => this.keysPressed.add(e.key.toLowerCase());
    this.boundDebugKeyUp = (e: KeyboardEvent) => this.keysPressed.delete(e.key.toLowerCase());
    this.boundDebugMouseMove = this.handleDebugMouseMove.bind(this);
    this.boundDebugClick = () => this.renderer.domElement.requestPointerLock();
  }

  get debugMode(): boolean {
    return this._debugMode;
  }

  setDebugMode(enabled: boolean): void {
    if (enabled === this._debugMode) return;
    this._debugMode = enabled;

    if (enabled) {
      // Save current camera state
      this.savedCameraPos = this.camera.position.clone();
      this.savedCameraQuat = this.camera.quaternion.clone();

      // Extract current yaw/pitch from camera
      const euler = new THREE.Euler().setFromQuaternion(this.camera.quaternion, "YXZ");
      this.debugYaw = euler.y;
      this.debugPitch = euler.x;

      // Attach debug controls
      document.addEventListener("keydown", this.boundDebugKeyDown);
      document.addEventListener("keyup", this.boundDebugKeyUp);
      document.addEventListener("mousemove", this.boundDebugMouseMove);
      this.renderer.domElement.addEventListener("click", this.boundDebugClick);
    } else {
      // Detach debug controls
      document.removeEventListener("keydown", this.boundDebugKeyDown);
      document.removeEventListener("keyup", this.boundDebugKeyUp);
      document.removeEventListener("mousemove", this.boundDebugMouseMove);
      this.renderer.domElement.removeEventListener("click", this.boundDebugClick);
      this.keysPressed.clear();

      // Exit pointer lock
      if (document.pointerLockElement === this.renderer.domElement) {
        document.exitPointerLock();
      }

      // Restore camera (Player.update will take over next frame)
      if (this.savedCameraPos && this.savedCameraQuat) {
        this.camera.position.copy(this.savedCameraPos);
        this.camera.quaternion.copy(this.savedCameraQuat);
      }
      this.savedCameraPos = null;
      this.savedCameraQuat = null;
    }
  }

  private handleDebugMouseMove(e: MouseEvent): void {
    if (document.pointerLockElement !== this.renderer.domElement) return;
    this.debugYaw -= e.movementX * 0.002;
    this.debugPitch -= e.movementY * 0.002;
    this.debugPitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.debugPitch));
  }

  private updateDebugCamera(delta: number): void {
    const speed = 200 * delta;
    const forward = new THREE.Vector3(0, 0, -1);
    const right = new THREE.Vector3(1, 0, 0);

    const quaternion = new THREE.Quaternion();
    quaternion.setFromEuler(new THREE.Euler(this.debugPitch, this.debugYaw, 0, "YXZ"));

    forward.applyQuaternion(quaternion);
    right.applyQuaternion(quaternion);

    if (this.keysPressed.has("w")) this.camera.position.addScaledVector(forward, speed);
    if (this.keysPressed.has("s")) this.camera.position.addScaledVector(forward, -speed);
    if (this.keysPressed.has("a")) this.camera.position.addScaledVector(right, -speed);
    if (this.keysPressed.has("d")) this.camera.position.addScaledVector(right, speed);
    if (this.keysPressed.has(" ")) this.camera.position.y += speed;
    if (this.keysPressed.has("shift")) this.camera.position.y -= speed;

    this.camera.quaternion.copy(quaternion);
  }

  addCharacter(character: Character): void {
    this.characters.push(character);
  }

  addMesh(mesh: THREE.Object3D): void {
    this.scene.add(mesh);
  }

  start(): void {
    if (this.disposed) return;
    const animate = () => {
      if (this.disposed) return;
      this.animationFrameId = requestAnimationFrame(animate);
      const delta = this.clock.getDelta();

      for (const character of this.characters) {
        character.update(delta);
      }

      if (this._debugMode) {
        this.updateDebugCamera(delta);
      }

      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  private handleResize(): void {
    if (this.disposed) return;
    const { clientWidth, clientHeight } = this.container;
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(clientWidth, clientHeight);
  }

  dispose(): void {
    this.disposed = true;
    if (this._debugMode) {
      this.setDebugMode(false);
    }
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener("resize", this.handleResize);

    for (const character of this.characters) {
      character.dispose();
    }
    this.characters = [];

    this.container.removeChild(this.renderer.domElement);
    this.renderer.dispose();
  }
}
