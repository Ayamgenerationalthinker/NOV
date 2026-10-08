'use client';

import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GOALS, type GoalMotif } from '@/content/home';

/**
 * Backdrop for the goal selector. Each goal has its own field of floating shapes; choosing a
 * goal fades its field in and the previous one out.
 */

const COUNT = 46;
const NEUTRAL = '#60A5FA';

function geometryFor(motif: GoalMotif | 'dust') {
  switch (motif) {
    case 'blocks':
      return <boxGeometry args={[1, 1, 1]} />;
    case 'rings':
      return <torusGeometry args={[0.7, 0.14, 10, 28]} />;
    case 'coins':
      return <cylinderGeometry args={[0.7, 0.7, 0.12, 24]} />;
    case 'darts':
      return <coneGeometry args={[0.5, 1.4, 4]} />;
    case 'chips':
      return <boxGeometry args={[1.2, 0.12, 0.8]} />;
    default:
      return <icosahedronGeometry args={[0.45, 0]} />;
  }
}

/** Where each shape floats. Seeded, so a goal's field looks the same every time. */
function scatter(seed: number) {
  let a = seed;
  const rand = () => {
    a = (a * 1664525 + 1013904223) % 4294967296;
    return a / 4294967296;
  };
  return Array.from({ length: COUNT }, () => ({
    x: (rand() - 0.5) * 22,
    y: (rand() - 0.5) * 9,
    z: -rand() * 9,
    size: 0.22 + rand() * 0.4,
    speed: 0.15 + rand() * 0.35,
    phase: rand() * Math.PI * 2,
  }));
}

interface FieldProps {
  motif: GoalMotif | 'dust';
  color: string;
  shown: boolean;
  seed: number;
}

function Field({ motif, color, shown, seed }: FieldProps) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const items = useMemo(() => scatter(seed), [seed]);

  useFrame(({ clock }, delta) => {
    const instanced = mesh.current;
    const mat = material.current;
    if (!instanced || !mat) return;

    // Roughly an 800ms cross-fade between goals.
    mat.opacity = THREE.MathUtils.damp(mat.opacity, shown ? 0.55 : 0, 4, Math.min(delta, 0.1));
    instanced.visible = mat.opacity > 0.01;
    if (!instanced.visible) return;

    const time = clock.elapsedTime;
    items.forEach((item, i) => {
      dummy.position.set(
        item.x + Math.sin(time * item.speed + item.phase) * 0.6,
        item.y + Math.cos(time * item.speed * 0.8 + item.phase) * 0.5,
        item.z,
      );
      dummy.rotation.set(time * item.speed + item.phase, time * item.speed * 0.7, item.phase);
      dummy.scale.setScalar(item.size);
      dummy.updateMatrix();
      instanced.setMatrixAt(i, dummy.matrix);
    });
    instanced.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, COUNT]} frustumCulled={false}>
      {geometryFor(motif)}
      <meshStandardMaterial
        ref={material}
        color={color}
        emissive={color}
        emissiveIntensity={0.25}
        roughness={0.4}
        metalness={0.5}
        transparent
        opacity={0}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

export default function GoalScene({ selected, active }: { selected: string | null; active: boolean }) {
  return (
    <Canvas
      aria-hidden
      className="!absolute inset-0"
      dpr={[1, 1.5]}
      camera={{ fov: 45, position: [0, 0, 9] }}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      frameloop={active ? 'always' : 'never'}
    >
      <ambientLight intensity={0.7} color="#ffffff" />
      <directionalLight intensity={1.6} position={[3, 5, 6]} color="#ffffff" />
      <Field motif="dust" color={NEUTRAL} shown={selected === null} seed={3} />
      {GOALS.map((goal, i) => (
        <Field key={goal.slug} motif={goal.motif} color={goal.color} shown={selected === goal.slug} seed={i + 11} />
      ))}
    </Canvas>
  );
}
