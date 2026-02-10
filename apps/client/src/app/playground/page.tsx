"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import {
  Game,
  Player,
  NPC,
  computeSeats,
  createCenterPaper,
  CardDealer,
} from "@/lib/game";
import type { DealState } from "@/lib/game";

export default function PlaygroundPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [shuffling, setShuffling] = useState(false);
  const [dealState, setDealState] = useState<DealState>("idle");
  const gameRef = useRef<Game | null>(null);
  const playerRef = useRef<Player | null>(null);
  const npcsRef = useRef<NPC[]>([]);
  const dealerRef = useRef<CardDealer | null>(null);

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
      const npcs: NPC[] = [];

      // Seat 0 is always the local player
      const playerSeat = seats[0];
      const player = new Player(game.scene, game.camera, {
        assetPath: "/assets/Sitting.glb",
        position: playerSeat.position,
        rotation: playerSeat.rotation,
        neckPosition: playerSeat.neckPosition,
        eyeOffset: new THREE.Vector3(0, 3, -12),
        initialYaw: playerSeat.initialYaw,
      });
      playerRef.current = player;
      game.addCharacter(player);
      player.attachControls(game.renderer.domElement, setIsLocked);
      await player.load();

      // Remaining seats are NPCs
      for (let i = 1; i < seats.length; i++) {
        const seat = seats[i];
        const npc = new NPC(game.scene, {
          assetPath: "/assets/Sitting.glb",
          position: seat.position,
          rotation: seat.rotation,
        });
        game.addCharacter(npc);
        await npc.load();
        // Pre-load the shuffle animation (upper body only)
        await npc.loadAnimation("shuffle", "/assets/Cards.glb");
        npcs.push(npc);
      }
      npcsRef.current = npcs;

      // Card dealer — first NPC is the dealer
      const cardDealer = new CardDealer(
        game.scene,
        game.camera,
        npcs[0],
        seats
      );
      game.addUpdatable(cardDealer);
      dealerRef.current = cardDealer;

      // Add circular table in the center
      game.addMesh(createCenterPaper());

      game.start();
    };

    setup();

    return () => {
      dealerRef.current?.dispose();
      dealerRef.current = null;
      game?.dispose();
      gameRef.current = null;
      playerRef.current = null;
      npcsRef.current = [];
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

  const toggleShuffle = useCallback(() => {
    const npcs = npcsRef.current;
    if (npcs.length === 0) return;

    const next = !shuffling;
    for (const npc of npcs) {
      if (next) {
        npc.playAnimation("shuffle");
      } else {
        npc.stopOverlay();
      }
    }
    setShuffling(next);
  }, [shuffling]);

  const handleDeal = useCallback(async () => {
    const dealer = dealerRef.current;
    const npcs = npcsRef.current;
    if (!dealer || dealer.state !== "idle") return;

    setDealState("shuffling");
    for (const npc of npcs) {
      npc.setHandCardsVisible(false);
    }

    await dealer.startDeal();
    setDealState("dealt");
  }, []);

  const handleReset = useCallback(() => {
    const dealer = dealerRef.current;
    const npcs = npcsRef.current;
    if (!dealer) return;

    dealer.clearCards();
    for (const npc of npcs) {
      npc.setHandCardsVisible(true);
    }
    setDealState("idle");
  }, []);

  return (
    <div className="w-full h-screen relative">
      <div ref={containerRef} className="w-full h-full" />

      {isLocked && !debugMode && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-1 h-1 bg-white rounded-full" />
        </div>
      )}

      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <button
          onClick={handleDeal}
          disabled={dealState !== "idle"}
          className="px-3 py-1.5 text-xs font-mono rounded bg-green-800 text-green-300 border border-green-600 hover:bg-green-700 disabled:opacity-50"
        >
          Deal Cards
        </button>
        {dealState === "dealt" && (
          <button
            onClick={handleReset}
            className="px-3 py-1.5 text-xs font-mono rounded bg-amber-800 text-amber-300 border border-amber-600 hover:bg-amber-700"
          >
            New Round
          </button>
        )}
        <button
          onClick={toggleShuffle}
          className="px-3 py-1.5 text-xs font-mono rounded bg-zinc-800 text-zinc-300 border border-zinc-600 hover:bg-zinc-700"
        >
          {shuffling ? "Stop Shuffle" : "Shuffle Cards"}
        </button>
        <button
          onClick={toggleDebug}
          className="px-3 py-1.5 text-xs font-mono rounded bg-zinc-800 text-zinc-300 border border-zinc-600 hover:bg-zinc-700"
        >
          {debugMode ? "Exit Debug" : "Debug"}
        </button>
      </div>

      {debugMode && (
        <div className="absolute bottom-4 left-4 text-xs font-mono text-zinc-400 bg-zinc-900/80 px-3 py-2 rounded z-10">
          WASD move | Mouse look | Space up | Shift down | Click to lock
        </div>
      )}
    </div>
  );
}
