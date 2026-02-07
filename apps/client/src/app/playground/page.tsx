"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Game, Player, NPC } from "@/lib/game";

export default function PlaygroundPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const game = new Game(containerRef.current);

    const npc = new NPC(game.scene, {
      assetPath: "/assets/Sitting.fbx",
      position: new THREE.Vector3(0, 0, 0),
    });

    const player = new Player(game.scene, game.camera, {
      assetPath: "/assets/Sitting.fbx",
      position: new THREE.Vector3(0, 0, 200),
      rotation: new THREE.Euler(0, Math.PI, 0),
      neckPosition: new THREE.Vector3(0, 110, 200),
      eyeOffset: new THREE.Vector3(0, 10, 12),
    });

    game.addCharacter(npc);
    game.addCharacter(player);

    player.attachControls(game.renderer.domElement, setIsLocked);

    npc.load();
    player.load();

    game.start();

    return () => {
      game.dispose();
    };
  }, []);

  return (
    <div className="w-full h-screen relative">
      <div ref={containerRef} className="w-full h-full" />

      {isLocked && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-1 h-1 bg-white rounded-full" />
        </div>
      )}
    </div>
  );
}
