import * as THREE from "three";
import type { NPC } from "./NPC";
import type { Seat } from "./seating";
import { createCardMesh, CARD_WIDTH } from "./CardMesh";
import { TABLE_HEIGHT } from "./seating";

// ── Types ────────────────────────────────────────────────────

interface FlyingCard {
  mesh: THREE.Mesh;
  startPos: THREE.Vector3;
  startQuat: THREE.Quaternion;
  endPos: THREE.Vector3;
  endQuat: THREE.Quaternion;
  elapsed: number;
  duration: number;
  done: boolean;
}

interface PlayerHandCard {
  mesh: THREE.Mesh;
  localOffset: THREE.Vector3;
  localEuler: THREE.Euler;
}

export type DealState = "idle" | "shuffling" | "dealing" | "dealt";

// ── Constants ────────────────────────────────────────────────

const CARDS_PER_PLAYER = 3;
const CARD_FLY_DURATION = 0.4;
const CARD_DEAL_DELAY = 0.15;
const SHUFFLE_DURATION = 2.0;
const TABLE_CARD_Y = TABLE_HEIGHT + 0.5;

// Player hand layout (camera-local)
const HAND_DISTANCE = 20;
const HAND_DROP = 12;
const HAND_FAN_ANGLE = 12; // degrees between cards
const HAND_TILT = -30; // degrees toward camera

const LABELS = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];

// ── Helpers ──────────────────────────────────────────────────

function randomLabel(): string {
  return LABELS[Math.floor(Math.random() * LABELS.length)];
}

// ── Class ────────────────────────────────────────────────────

export class CardDealer {
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly dealer: NPC;
  private readonly seats: Seat[];

  state: DealState = "idle";

  private shuffleTimer = 0;
  private flyingCards: FlyingCard[] = [];
  private dealQueue: { seatIndex: number; cardIndex: number }[] = [];
  private dealTimer = 0;
  private nextDealIndex = 0;
  private tableCards: THREE.Mesh[] = [];
  private playerHandCards: PlayerHandCard[] = [];
  private onDealComplete: (() => void) | null = null;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    dealer: NPC,
    seats: Seat[]
  ) {
    this.scene = scene;
    this.camera = camera;
    this.dealer = dealer;
    this.seats = seats;
  }

  /** Kick off the deal sequence: shuffle → deal cards */
  startDeal(): Promise<void> {
    if (this.state !== "idle") return Promise.resolve();
    this.clearCards();

    this.state = "shuffling";
    this.shuffleTimer = 0;
    this.dealer.playAnimation("shuffle");

    return new Promise((resolve) => {
      this.onDealComplete = resolve;
    });
  }

  /** Called every frame from the game loop */
  update(delta: number): void {
    if (this.state === "shuffling") {
      this.updateShuffling(delta);
    } else if (this.state === "dealing") {
      this.updateDealing(delta);
    } else if (this.state === "dealt") {
      this.updatePlayerHand();
    }

    this.updateFlyingCards(delta);
  }

  // ── Shuffling phase ──────────────────────────────────────

  private updateShuffling(delta: number): void {
    this.shuffleTimer += delta;
    if (this.shuffleTimer >= SHUFFLE_DURATION) {
      this.dealer.stopOverlay();
      this.beginDealing();
    }
  }

  // ── Dealing phase ────────────────────────────────────────

  private beginDealing(): void {
    this.state = "dealing";
    this.dealTimer = 0;
    this.nextDealIndex = 0;

    // Round-robin: 1 card to each player × 3 rounds
    this.dealQueue = [];
    for (let round = 0; round < CARDS_PER_PLAYER; round++) {
      for (let s = 0; s < this.seats.length; s++) {
        this.dealQueue.push({ seatIndex: s, cardIndex: round });
      }
    }
  }

  private updateDealing(delta: number): void {
    this.dealTimer += delta;

    while (
      this.nextDealIndex < this.dealQueue.length &&
      this.dealTimer >= this.nextDealIndex * CARD_DEAL_DELAY
    ) {
      this.launchCard(this.dealQueue[this.nextDealIndex]);
      this.nextDealIndex++;
    }

    if (
      this.nextDealIndex >= this.dealQueue.length &&
      this.flyingCards.every((c) => c.done)
    ) {
      this.state = "dealt";
      this.onDealComplete?.();
      this.onDealComplete = null;
    }
  }

  private launchCard(deal: { seatIndex: number; cardIndex: number }): void {
    const isPlayer = deal.seatIndex === 0;
    const mesh = createCardMesh(randomLabel());
    this.scene.add(mesh);

    // Start: dealer's hand position (or approximate from seat)
    const dealerHandPos = this.dealer.getRightHandWorldPosition();
    const startPos = dealerHandPos ?? this.seats[1].position.clone();
    if (!dealerHandPos) startPos.y = TABLE_HEIGHT + 10;

    const startQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(-Math.PI / 2, 0, 0) // flat, face-down
    );

    let endPos: THREE.Vector3;
    let endQuat: THREE.Quaternion;

    if (isPlayer) {
      // Player cards: position near camera, will be tracked in updatePlayerHand
      const seat = this.seats[0];
      const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        seat.initialYaw
      );
      const right = new THREE.Vector3(-forward.z, 0, forward.x);

      endPos = seat.neckPosition
        .clone()
        .addScaledVector(forward, HAND_DISTANCE)
        .add(new THREE.Vector3(0, -HAND_DROP, 0));

      const fanOffset = (deal.cardIndex - 1) * CARD_WIDTH * 1.1;
      endPos.addScaledVector(right, fanOffset);

      endQuat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          THREE.MathUtils.degToRad(HAND_TILT),
          seat.initialYaw,
          THREE.MathUtils.degToRad((deal.cardIndex - 1) * HAND_FAN_ANGLE)
        )
      );

      this.playerHandCards.push({
        mesh,
        localOffset: new THREE.Vector3(
          (deal.cardIndex - 1) * CARD_WIDTH * 1.1,
          -HAND_DROP,
          -HAND_DISTANCE
        ),
        localEuler: new THREE.Euler(
          THREE.MathUtils.degToRad(HAND_TILT),
          0,
          THREE.MathUtils.degToRad((deal.cardIndex - 1) * HAND_FAN_ANGLE)
        ),
      });
    } else {
      // NPC cards: land face-down on the table
      const seat = this.seats[deal.seatIndex];
      const toCenter = new THREE.Vector3(
        -seat.position.x,
        0,
        -seat.position.z
      ).normalize();
      const right = new THREE.Vector3(-toCenter.z, 0, toCenter.x);

      endPos = seat.position.clone().addScaledVector(toCenter, 30);
      endPos.y = TABLE_CARD_Y + deal.cardIndex * 0.15; // stack offset

      const fanOffset = (deal.cardIndex - 1) * CARD_WIDTH * 0.8;
      endPos.addScaledVector(right, fanOffset);

      const yaw = Math.atan2(-seat.position.x, -seat.position.z);
      endQuat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(-Math.PI / 2, yaw, 0)
      );

      this.tableCards.push(mesh);
    }

    mesh.position.copy(startPos);
    mesh.quaternion.copy(startQuat);

    this.flyingCards.push({
      mesh,
      startPos: startPos.clone(),
      startQuat: startQuat.clone(),
      endPos,
      endQuat,
      elapsed: 0,
      duration: CARD_FLY_DURATION,
      done: false,
    });
  }

  // ── Flying card animation ────────────────────────────────

  private updateFlyingCards(delta: number): void {
    for (const card of this.flyingCards) {
      if (card.done) continue;
      card.elapsed += delta;

      // Ease-out cubic
      let t = Math.min(card.elapsed / card.duration, 1);
      t = 1 - Math.pow(1 - t, 3);

      card.mesh.position.lerpVectors(card.startPos, card.endPos, t);
      card.mesh.quaternion.slerpQuaternions(
        card.startQuat,
        card.endQuat,
        t
      );

      // Parabolic arc
      card.mesh.position.y += 15 * 4 * t * (1 - t);

      if (card.elapsed >= card.duration) {
        card.done = true;
        card.mesh.position.copy(card.endPos);
        card.mesh.quaternion.copy(card.endQuat);
      }
    }
  }

  // ── Player hand tracking ─────────────────────────────────

  private updatePlayerHand(): void {
    for (const handCard of this.playerHandCards) {
      const worldOffset = handCard.localOffset
        .clone()
        .applyQuaternion(this.camera.quaternion);
      handCard.mesh.position.copy(this.camera.position).add(worldOffset);

      const cardQuat = new THREE.Quaternion().setFromEuler(
        handCard.localEuler
      );
      handCard.mesh.quaternion
        .copy(this.camera.quaternion)
        .multiply(cardQuat);
    }
  }

  // ── Reset ────────────────────────────────────────────────

  clearCards(): void {
    const disposeMesh = (mesh: THREE.Mesh) => {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      const mat = mesh.material;
      if (Array.isArray(mat)) {
        mat.forEach((m) => m.dispose());
      } else {
        mat.dispose();
      }
    };

    for (const card of this.flyingCards) disposeMesh(card.mesh);
    for (const mesh of this.tableCards) disposeMesh(mesh);
    for (const handCard of this.playerHandCards) disposeMesh(handCard.mesh);

    this.flyingCards = [];
    this.tableCards = [];
    this.playerHandCards = [];
    this.dealQueue = [];
    this.nextDealIndex = 0;
    this.state = "idle";
  }

  dispose(): void {
    this.clearCards();
  }
}
