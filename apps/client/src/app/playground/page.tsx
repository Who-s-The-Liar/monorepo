"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import {
  Game,
  Player,
  NPC,
  computeSeats,
  createCenterPaper,
} from "@/lib/game";

export default function PlaygroundPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const gameRef = useRef<Game | null>(null);
  const playerRef = useRef<Player | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let game: Game | null = null;

    const setup = async () => {
      if (!containerRef.current) return;

      // Ask the server how many players to load
      const res = await fetch("/api/room");
      const room = await res.json();
      const playerCount = room.playerCount as 2 | 3;

      game = new Game(containerRef.current);
      gameRef.current = game;
      const seats = computeSeats(playerCount);

      // Seat 0 is always the local player
      const playerSeat = seats[0];
      const player = new Player(game.scene, game.camera, {
        assetPath: "/assets/Sitting.fbx",
        position: playerSeat.position,
        rotation: playerSeat.rotation,
        neckPosition: playerSeat.neckPosition,
        eyeOffset: new THREE.Vector3(0, 10, 12),
        initialYaw: playerSeat.initialYaw,
      });
      playerRef.current = player;
      game.addCharacter(player);
      player.attachControls(game.renderer.domElement, setIsLocked);
      player.load();

      // Remaining seats are NPCs
      for (let i = 1; i < seats.length; i++) {
        const seat = seats[i];
        const npc = new NPC(game.scene, {
          assetPath: "/assets/Sitting.fbx",
          position: seat.position,
          rotation: seat.rotation,
        });
        game.addCharacter(npc);
        npc.load();
      }

      // Add circular table in the center
      game.addMesh(createCenterPaper());

      game.start();
    };

    setup();

    return () => {
      game?.dispose();
      gameRef.current = null;
      playerRef.current = null;
    };
  }, []);

  const toggleDebug = useCallback(() => {
    const game = gameRef.current;
    const player = playerRef.current;
    if (!game || !player) return;

    const next = !debugMode;
    game.setDebugMode(next);
    player.debugMode = next;
    setDebugMode(next);
  }, [debugMode]);

  return (
    <div className="w-full h-screen relative">
      <div ref={containerRef} className="w-full h-full" />

      {isLocked && !debugMode && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-1 h-1 bg-white rounded-full" />
        </div>
      )}

      <button
        onClick={toggleDebug}
        className="absolute top-4 right-4 px-3 py-1.5 text-xs font-mono rounded bg-zinc-800 text-zinc-300 border border-zinc-600 hover:bg-zinc-700 z-10"
      >
        {debugMode ? "Exit Debug (Fly Cam)" : "Debug (Fly Cam)"}
      </button>

      {debugMode && (
        <div className="absolute bottom-4 left-4 text-xs font-mono text-zinc-400 bg-zinc-900/80 px-3 py-2 rounded z-10">
          WASD move | Mouse look | Space up | Shift down | Click to lock
        </div>
      )}
    </div>
  );
}
