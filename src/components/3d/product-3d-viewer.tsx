'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, useGLTF, Center, Html } from '@react-three/drei';
import { Box, RotateCcw, AlertCircle, Sparkles } from 'lucide-react';

interface Product3DViewerProps {
  modelUrl?: string | null;
  posterImage?: string | null;
  productTitle: string;
  autoRotate?: boolean;
}

function ModelMesh({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

// Procedural high-end geometric showcase mesh if no external GLB is uploaded
function LuxuryPlaceholderMesh() {
  return (
    <mesh castShadow receiveShadow>
      <octahedronGeometry args={[1.2, 2]} />
      <meshStandardMaterial
        color="#18181b"
        metalness={0.9}
        roughness={0.15}
        envMapIntensity={1.5}
      />
    </mesh>
  );
}

function CanvasLoader() {
  return (
    <Html center>
      <div className="flex flex-col items-center justify-center p-4 bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-zinc-800 text-zinc-300 shadow-2xl">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2" />
        <span className="text-xs font-mono tracking-wider uppercase text-zinc-400">Loading 3D Model...</span>
      </div>
    </Html>
  );
}

export function Product3DViewer({
  modelUrl,
  posterImage,
  productTitle,
  autoRotate = true,
}: Product3DViewerProps) {
  const [hasWebGL, setHasWebGL] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isRotating, setIsRotating] = useState(autoRotate);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) setHasWebGL(false);
    } catch {
      setHasWebGL(false);
    }
  }, []);

  if (!hasWebGL || loadError) {
    return (
      <div className="relative w-full aspect-square bg-zinc-950 rounded-2xl overflow-hidden flex flex-col items-center justify-center border border-zinc-800">
        {posterImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={posterImage}
            alt={productTitle}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center p-6 text-zinc-400">
            <Box className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
            <p className="text-sm font-medium">3D Preview unavailable</p>
            <p className="text-xs text-zinc-500 mt-1">Showing standard product photography</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-square bg-gradient-to-b from-zinc-900 via-zinc-950 to-black rounded-3xl overflow-hidden border border-zinc-800/80 shadow-2xl group">
      {/* 3D Canvas */}
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 0, 4], fov: 45 }}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        <Suspense fallback={<CanvasLoader />}>
          <Stage environment="city" intensity={0.6} shadows={{ type: 'contact', opacity: 0.4, blur: 2 }}>
            <Center>
              {modelUrl ? (
                <ModelMesh url={modelUrl} />
              ) : (
                <LuxuryPlaceholderMesh />
              )}
            </Center>
          </Stage>
          <OrbitControls
            enableZoom={true}
            enablePan={false}
            autoRotate={isRotating}
            autoRotateSpeed={2.5}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI / 1.8}
            minDistance={2}
            maxDistance={7}
          />
        </Suspense>
      </Canvas>

      {/* Floating 3D Badge & Interaction Controls */}
      <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md border border-zinc-800 px-3 py-1.5 rounded-full text-xs font-medium text-zinc-300">
        <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
        <span>360° Interactive 3D</span>
      </div>

      <div className="absolute bottom-4 right-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsRotating(!isRotating)}
          className="p-2.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80 backdrop-blur-md transition-all shadow-lg"
          title={isRotating ? 'Pause Rotation' : 'Auto Rotate'}
        >
          <RotateCcw className={`w-4 h-4 ${isRotating ? 'animate-spin' : ''}`} style={{ animationDuration: '8s' }} />
        </button>
      </div>

      <div className="absolute bottom-4 left-4 text-[11px] text-zinc-500 font-mono tracking-tight pointer-events-none hidden sm:block">
        Drag to Orbit • Scroll to Zoom
      </div>
    </div>
  );
}
