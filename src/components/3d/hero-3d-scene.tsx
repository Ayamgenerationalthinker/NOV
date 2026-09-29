'use client';

import React, { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Sphere, Torus, Stage } from '@react-three/drei';
import * as THREE from 'three';

function FloatingLuxuryShapes() {
  const torusRef = useRef<THREE.Mesh>(null!);
  const sphereRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (torusRef.current) {
      torusRef.current.rotation.x = t * 0.2;
      torusRef.current.rotation.y = t * 0.3;
    }
  });

  return (
    <group>
      <Float speed={2.5} rotationIntensity={1.2} floatIntensity={1.5}>
        <mesh ref={torusRef} position={[0, 0, 0]} scale={1.4}>
          <torusGeometry args={[1.2, 0.35, 32, 100]} />
          <meshStandardMaterial
            color="#d4af37"
            metalness={0.95}
            roughness={0.12}
            envMapIntensity={2}
          />
        </mesh>
      </Float>

      <Float speed={3} rotationIntensity={0.8} floatIntensity={2}>
        <Sphere ref={sphereRef} position={[0, 0, 0]} args={[0.7, 64, 64]}>
          <MeshDistortMaterial
            color="#09090b"
            roughness={0.1}
            metalness={0.9}
            distort={0.3}
            speed={2}
          />
        </Sphere>
      </Float>
    </group>
  );
}

export function Hero3DScene() {
  return (
    <div className="w-full h-full min-h-[380px] lg:min-h-[460px] relative">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        dpr={[1, 1.5]}
        className="w-full h-full"
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} color="#ffffff" />
        <pointLight position={[-10, -10, -5]} intensity={0.8} color="#d4af37" />
        <Suspense fallback={null}>
          <FloatingLuxuryShapes />
        </Suspense>
      </Canvas>
    </div>
  );
}
