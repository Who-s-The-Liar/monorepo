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

  constructor(container: HTMLElement) {
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a1a);

    this.camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
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
  }

  addCharacter(character: Character): void {
    this.characters.push(character);
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
