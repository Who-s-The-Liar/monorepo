import * as THREE from "three";

/** Card dimensions in world units — slightly oversized for visibility at table distance */
export const CARD_WIDTH = 6;
export const CARD_HEIGHT = 8.5;
export const CARD_THICKNESS = 0.3;

/**
 * Creates a single playing card mesh with red back and white front.
 * The card lies flat when rotation is identity, with +Y as the face-up side.
 */
export function createCardMesh(
  label: string,
  faceColor = 0xffffff,
  backColor = 0xcc2222
): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(
    CARD_WIDTH,
    CARD_THICKNESS,
    CARD_HEIGHT
  );

  // BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z
  // +Y = front (face-up), -Y = back (face-down)
  const side = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.8,
  });
  const front = new THREE.MeshStandardMaterial({
    color: faceColor,
    roughness: 0.5,
  });
  const back = new THREE.MeshStandardMaterial({
    color: backColor,
    roughness: 0.5,
  });

  const materials = [side, side, front, back, side, side];

  const mesh = new THREE.Mesh(geometry, materials);
  mesh.userData.cardLabel = label;
  return mesh;
}
