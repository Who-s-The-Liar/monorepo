import * as THREE from "three";

export interface Seat {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  neckPosition: THREE.Vector3;
  /** Camera yaw so it faces center from this seat */
  initialYaw: number;
}

const SITTING_HEIGHT = 110;

export function computeSeats(playerCount: 2 | 3, radius = 100): Seat[] {
  const seats: Seat[] = [];

  if (playerCount === 2) {
    // Two players facing each other along the Z axis
    seats.push({
      position: new THREE.Vector3(0, 0, radius),
      rotation: new THREE.Euler(0, Math.PI, 0), // face -Z (toward center)
      neckPosition: new THREE.Vector3(0, SITTING_HEIGHT, radius),
      initialYaw: 0, // camera faces -Z at yaw=0, which is toward center
    });
    seats.push({
      position: new THREE.Vector3(0, 0, -radius),
      rotation: new THREE.Euler(0, 0, 0), // face +Z (toward center)
      neckPosition: new THREE.Vector3(0, SITTING_HEIGHT, -radius),
      initialYaw: Math.PI,
    });
  } else {
    // Three players in equilateral triangle
    // Angles: seat 0 at bottom (270°), seat 1 top-left (150°), seat 2 top-right (30°)
    const angles = [
      (3 / 2) * Math.PI, // 270° — bottom (player)
      (5 / 6) * Math.PI, // 150° — top-left
      (1 / 6) * Math.PI, // 30°  — top-right
    ];

    for (const angle of angles) {
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const pos = new THREE.Vector3(x, 0, z);

      // Face toward center: atan2 from position to origin
      const yRot = Math.atan2(-pos.x, -pos.z);

      seats.push({
        position: pos,
        rotation: new THREE.Euler(0, yRot, 0),
        neckPosition: new THREE.Vector3(x, SITTING_HEIGHT, z),
        initialYaw: Math.atan2(x, z),
      });
    }
  }

  return seats;
}

export const TABLE_HEIGHT = 65;

export function createCenterPaper(radius = 98): THREE.Mesh {
  const geometry = new THREE.CircleGeometry(radius, 64);
  const material = new THREE.MeshStandardMaterial({
    color: 0xf5f5f0,
    roughness: 0.8,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2; // lay flat
  mesh.position.set(0, TABLE_HEIGHT, 0);
  return mesh;
}
