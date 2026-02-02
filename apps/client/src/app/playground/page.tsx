"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";

export default function PlaygroundPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);

    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );

    // ===== REALISTIC HEAD SETUP =====
    // Neck pivot point (where head rotates from)
    const neckPosition = new THREE.Vector3(0, 110, 200); // Sitting height

    // Eye offset from neck pivot
    const eyeOffset = new THREE.Vector3(0, 10, 12); // ~10cm up, ~12cm forward

    // Head rotation limits (in radians)
    const limits = {
      yawMin: -Math.PI * 0.45, // ~80° left
      yawMax: Math.PI * 0.45, // ~80° right
      pitchMin: -Math.PI * 0.35, // ~60° down
      pitchMax: Math.PI * 0.3, // ~55° up
    };

    // Current and target rotation (for smoothing)
    let targetYaw = 0;
    let targetPitch = 0;
    let currentYaw = 0;
    let currentPitch = 0;
    const smoothing = 0.15; // Lower = smoother, higher = snappier

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(
      containerRef.current.clientWidth,
      containerRef.current.clientHeight
    );
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 200, 100);
    scene.add(directionalLight);

    // Ground
    const gridHelper = new THREE.GridHelper(1000, 100, 0x444444, 0x222222);
    scene.add(gridHelper);

    // Animation mixers
    let npcMixer: THREE.AnimationMixer;
    let playerMixer: THREE.AnimationMixer;
    const clock = new THREE.Clock();

    const loader = new FBXLoader();

    // Load NPC (the character you're looking at)
    loader.load("/assets/Sitting.fbx", (model) => {
      model.scale.setScalar(1);
      model.position.set(0, 0, 0);
      scene.add(model);

      npcMixer = new THREE.AnimationMixer(model);
      if (model.animations.length > 0) {
        npcMixer.clipAction(model.animations[0]).play();
      }
    });

    // Load Player body (your own body visible when looking down)
    loader.load("/assets/Sitting.fbx", (model) => {
      model.scale.setScalar(1);
      // Position at player's sitting location
      model.position.set(0, 0, 200);
      // Rotate to face the NPC (away from camera)
      model.rotation.y = Math.PI;

      // Hide the head so it doesn't block the camera view
      model.traverse((child) => {
        if (child.name.toLowerCase().includes("head")) {
          child.visible = false;
        }
      });

      scene.add(model);

      playerMixer = new THREE.AnimationMixer(model);
      if (model.animations.length > 0) {
        playerMixer.clipAction(model.animations[0]).play();
      }
    });

    // ===== HEAD ROTATION CONTROLS =====
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== renderer.domElement) return;

      // Update target rotation
      targetYaw -= e.movementX * 0.002;
      targetPitch -= e.movementY * 0.002;

      // Clamp to human limits
      targetYaw = Math.max(limits.yawMin, Math.min(limits.yawMax, targetYaw));
      targetPitch = Math.max(
        limits.pitchMin,
        Math.min(limits.pitchMax, targetPitch)
      );
    };

    const onClick = () => {
      renderer.domElement.requestPointerLock();
    };

    const onLockChange = () => {
      setIsLocked(document.pointerLockElement === renderer.domElement);
    };

    document.addEventListener("mousemove", onMouseMove);
    renderer.domElement.addEventListener("click", onClick);
    document.addEventListener("pointerlockchange", onLockChange);

    // ===== UPDATE CAMERA POSITION & ROTATION =====
    const updateCamera = () => {
      // Smooth interpolation toward target
      currentYaw += (targetYaw - currentYaw) * smoothing;
      currentPitch += (targetPitch - currentPitch) * smoothing;

      // Create rotation quaternion
      const quaternion = new THREE.Quaternion();
      quaternion.setFromEuler(
        new THREE.Euler(currentPitch, currentYaw, 0, "YXZ")
      );

      // Calculate eye position (offset from neck, rotated)
      const rotatedOffset = eyeOffset.clone().applyQuaternion(quaternion);
      camera.position.copy(neckPosition).add(rotatedOffset);

      // Apply rotation to camera
      camera.quaternion.copy(quaternion);
    };

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      const delta = clock.getDelta();

      if (npcMixer) npcMixer.update(delta);
      if (playerMixer) playerMixer.update(delta);
      updateCamera();

      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect =
        containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(
        containerRef.current.clientWidth,
        containerRef.current.clientHeight
      );
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("pointerlockchange", onLockChange);
      containerRef.current?.removeChild(renderer.domElement);
      renderer.dispose();
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
