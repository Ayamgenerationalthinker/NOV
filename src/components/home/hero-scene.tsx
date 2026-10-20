'use client';

import { useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { COIN_SYMBOLS, coinFaceTexture, type CoinSymbol } from './coin-face';

/**
 * The growth scene: a glowing seed in dark soil that puts out roots, grows a trunk and
 * branches, then gathers leaves and coins into its canopy. Everything is procedural
 * (no model files) and driven by one number, the hero's scroll progress from 0 to 1.
 */

const BLUE = '#4d8dff';

/** The strip of the canvas the tree should sit in, as fractions of its height from the top. */
export interface ArtBand {
  top: number;
  bottom: number;
}

interface HeroSceneProps {
  /** Scroll progress through the hero, 0 → 1. Read every frame; never causes a re-render. */
  progress: RefObject<number>;
  /** Set on phones and tablets, where the text sits below the tree. Null on the desktop layout. */
  band: RefObject<ArtBand | null>;
  /** Pauses rendering while the hero is off screen. */
  active: boolean;
  onReady: () => void;
}

/** Small seeded generator so the tree is the same on every visit. */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smoothstep = (v: number, from: number, to: number) => {
  const t = clamp01((v - from) / (to - from));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const RADIAL = 7;

/** A tube that narrows towards its tip. Indices run root → tip, so drawRange can "grow" it. */
function taperedTube(curve: THREE.Curve<THREE.Vector3>, segments: number, radius: number, tip: number) {
  const geometry = new THREE.TubeGeometry(curve, segments, radius, RADIAL, false);
  const position = geometry.attributes.position;
  const centre = new THREE.Vector3();
  const vertex = new THREE.Vector3();
  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    curve.getPointAt(u, centre);
    const scale = 1 - (1 - tip) * u;
    for (let j = 0; j <= RADIAL; j++) {
      const index = i * (RADIAL + 1) + j;
      vertex.fromBufferAttribute(position, index).sub(centre).multiplyScalar(scale).add(centre);
      position.setXYZ(index, vertex.x, vertex.y, vertex.z);
    }
  }
  geometry.computeVertexNormals();
  geometry.setDrawRange(0, 0);
  return geometry;
}

interface Limb {
  geometry: THREE.TubeGeometry;
  segments: number;
  /** Scroll window over which this limb grows. */
  from: number;
  to: number;
}

const CANOPY = { y: 3.0, rx: 1.55, ry: 1.0, rz: 1.15 };
const SEED_Y = -0.32;

function buildTree() {
  const rand = seeded(7);
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

  const trunkCurve = new THREE.CatmullRomCurve3([
    v(0, SEED_Y, 0),
    v(0.06, 0.5, 0.02),
    v(-0.07, 1.3, -0.03),
    v(0.03, 2.1, 0.02),
    v(0, 2.7, 0),
  ]);
  const trunk: Limb = { geometry: taperedTube(trunkCurve, 48, 0.14, 0.42), segments: 48, from: 0.3, to: 0.62 };

  const roots: Limb[] = [];
  const rootCount = 9;
  for (let i = 0; i < rootCount; i++) {
    const angle = (i / rootCount) * Math.PI * 2 + rand() * 0.5;
    const reach = 1.3 + rand() * 0.9;
    const depth = 0.55 + rand() * 0.7;
    const dx = Math.cos(angle);
    const dz = Math.sin(angle) * 0.7;
    const curve = new THREE.CatmullRomCurve3([
      v(0, SEED_Y, 0),
      v(dx * reach * 0.3, SEED_Y - depth * 0.25, dz * reach * 0.3),
      v(dx * reach * 0.65 + (rand() - 0.5) * 0.3, SEED_Y - depth * 0.7, dz * reach * 0.65),
      v(dx * reach, SEED_Y - depth, dz * reach + (rand() - 0.5) * 0.3),
    ]);
    const from = 0.06 + rand() * 0.08;
    roots.push({ geometry: taperedTube(curve, 28, 0.05, 0.12), segments: 28, from, to: from + 0.26 });
  }

  const branches: Limb[] = [];
  const branchCount = 8;
  for (let i = 0; i < branchCount; i++) {
    const start = trunkCurve.getPointAt(0.55 + (i / branchCount) * 0.45);
    const angle = (i / branchCount) * Math.PI * 2 + rand() * 0.8;
    const lift = 0.2 + rand() * 0.75;
    const end = v(
      Math.cos(angle) * CANOPY.rx * 0.8,
      CANOPY.y - CANOPY.ry * 0.5 + lift * CANOPY.ry * 1.3,
      Math.sin(angle) * CANOPY.rz * 0.8,
    );
    const mid = start.clone().lerp(end, 0.5);
    mid.y += 0.18;
    const curve = new THREE.CatmullRomCurve3([start, mid, end]);
    const from = 0.46 + rand() * 0.1;
    branches.push({ geometry: taperedTube(curve, 20, 0.05, 0.18), segments: 20, from, to: from + 0.2 });
  }

  return { trunk, roots, branches };
}

interface Drifter {
  start: THREE.Vector3;
  target: THREE.Vector3;
  size: number;
  from: number;
  phase: number;
  spin: number;
  tilt: THREE.Euler;
}

function buildDrifters(count: number, seed: number, from: number, spread: number, size: [number, number]): Drifter[] {
  const rand = seeded(seed);
  return Array.from({ length: count }, () => {
    // A point in the canopy, pushed towards the outside so the crown reads as full.
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(2 * rand() - 1);
    const r = 0.5 + 0.5 * rand();
    const target = new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta) * CANOPY.rx * r,
      CANOPY.y + Math.cos(phi) * CANOPY.ry * r,
      Math.sin(phi) * Math.sin(theta) * CANOPY.rz * r,
    );
    const start = target
      .clone()
      .add(new THREE.Vector3((rand() - 0.5) * 5, 1.6 + rand() * 2.4, (rand() - 0.5) * 2.5));
    return {
      start,
      target,
      size: lerp(size[0], size[1], rand()),
      from: from + rand() * spread,
      phase: rand() * Math.PI * 2,
      spin: 0.6 + rand() * 1.6,
      tilt: new THREE.Euler(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI),
    };
  });
}

/** Smoothed copy of the scroll progress, shared so every part of the scene agrees. */
const clock = { p: 0 };
/** How far the whole tree turns (in radians) between the top and bottom of the hero. */
const TREE_TURN = 0.9;

function Rig({ progress, band }: { progress: RefObject<number>; band: RefObject<ArtBand | null> }) {
  const { camera, size } = useThree();
  const look = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    const target = clamp01(progress.current ?? 0);
    clock.p = THREE.MathUtils.damp(clock.p, target, 5, Math.min(delta, 0.1));
    const p = clock.p;

    // Close on the seed → pull back for the roots → rise with the trunk → the whole tree.
    const keys = [
      { at: 0, y: -0.2, dist: 4.4, lookY: -0.3 },
      { at: 0.35, y: -0.3, dist: 6.4, lookY: -0.7 },
      { at: 0.65, y: 0.8, dist: 9, lookY: 0.7 },
      { at: 1, y: 1.3, dist: 11.2, lookY: 1.0 },
    ];
    let i = 0;
    while (i < keys.length - 2 && p > keys[i + 1].at) i++;
    const a = keys[i];
    const b = keys[i + 1];
    const t = smoothstep(p, a.at, b.at);

    const aspect = size.width / size.height;
    const strip = band.current;
    // Phones: the framing meant for the whole screen is fitted into the strip above the text.
    const dist = lerp(a.dist, b.dist, t) * (strip ? 0.76 / (strip.bottom - strip.top) : 1);
    const halfHeight = dist * Math.tan(THREE.MathUtils.degToRad(20));
    const halfWidth = halfHeight * aspect;

    // Wide screens: tree on the right, leaving the left for the headline.
    // Phones: tree centred in its strip.
    const shiftX = strip ? 0 : -halfWidth * 0.42;
    const shiftY = strip ? -(1 - strip.top - strip.bottom) * halfHeight : 0;

    camera.position.set(shiftX, lerp(a.y, b.y, t) + shiftY, dist);
    look.set(shiftX, lerp(a.lookY, b.lookY, t) + shiftY, 0);
    camera.lookAt(look);
  }, -1);

  return null;
}

function Limbs() {
  const tree = useMemo(() => buildTree(), []);
  const limbs = useMemo(() => [tree.trunk, ...tree.roots, ...tree.branches], [tree]);

  const bark = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#dbe7ff', roughness: 0.55, metalness: 0.2, emissive: '#0848e0', emissiveIntensity: 0.22 }),
    [],
  );
  const rootSkin = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#7aa9ff', roughness: 0.45, metalness: 0.3, emissive: '#0b5cff', emissiveIntensity: 0.55 }),
    [],
  );

  useFrame(() => {
    for (const limb of limbs) {
      const grown = Math.floor(smoothstep(clock.p, limb.from, limb.to) * limb.segments);
      limb.geometry.setDrawRange(0, grown * RADIAL * 6);
    }
  });

  return (
    <>
      <mesh geometry={tree.trunk.geometry} material={bark} />
      {tree.branches.map((limb, i) => (
        <mesh key={`b${i}`} geometry={limb.geometry} material={bark} />
      ))}
      {tree.roots.map((limb, i) => (
        <mesh key={`r${i}`} geometry={limb.geometry} material={rootSkin} />
      ))}
    </>
  );
}

/** Where a leaf or coin is on its way from the sky to its place in the canopy. */
function place(dummy: THREE.Object3D, item: Drifter, t: number, time: number) {
  const loose = 1 - t;
  dummy.position.set(
    lerp(item.start.x, item.target.x, t) + Math.sin(time * 0.7 + item.phase) * 0.3 * loose,
    lerp(item.start.y, item.target.y, t) + Math.sin(time * 1.1 + item.phase) * 0.03,
    lerp(item.start.z, item.target.z, t) + Math.cos(time * 0.6 + item.phase) * 0.2 * loose,
  );
  dummy.scale.setScalar(item.size * smoothstep(t, 0, 0.12));
}

function Leaves({ items }: { items: Drifter[] }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useLayoutEffect(() => {
    const instanced = mesh.current;
    if (!instanced) return;
    const rand = seeded(23);
    const colour = new THREE.Color();
    items.forEach((_, i) => {
      // A mix of white, sky blue and deeper blue leaves.
      const pick = rand();
      colour.set(pick < 0.45 ? '#FFFFFF' : pick < 0.8 ? BLUE : '#0b5cff');
      instanced.setColorAt(i, colour);
    });
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
  }, [items]);

  useFrame(({ clock: three }) => {
    const instanced = mesh.current;
    if (!instanced) return;
    const time = three.elapsedTime;

    items.forEach((item, i) => {
      const t = smoothstep(clock.p, item.from, item.from + 0.2);
      place(dummy, item, t, time);
      // Spin on the way down, then keep fluttering gently once settled.
      dummy.rotation.set(
        item.tilt.x + time * item.spin * (1 - t) + Math.sin(time * 1.3 + item.phase) * 0.12 * t,
        item.tilt.y + Math.sin(time * 0.9 + item.phase) * 0.3,
        item.tilt.z,
      );
      dummy.updateMatrix();
      instanced.setMatrixAt(i, dummy.matrix);
    });
    instanced.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, items.length]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#ffffff" roughness={0.45} metalness={0.35} emissive="#0a3bb5" emissiveIntensity={0.35} flatShading />
    </instancedMesh>
  );
}

/** Coins stamped with a dollar or cedi sign. They tumble down, then hang facing the viewer and sway. */
function Coins({ items, symbol }: { items: Drifter[]; symbol: CoinSymbol }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => {
    const object = new THREE.Object3D();
    // Turn about the upright axis last, so a coin can sway like a hanging medal.
    object.rotation.order = 'YXZ';
    return object;
  }, []);
  const materials = useMemo(() => {
    const face = coinFaceTexture(symbol);
    const stamped = new THREE.MeshStandardMaterial({
      map: face,
      emissive: '#ffffff',
      emissiveMap: face,
      emissiveIntensity: 0.45,
      roughness: 0.35,
      metalness: 0.25,
    });
    const rim = new THREE.MeshStandardMaterial({ color: '#7aa9ff', roughness: 0.3, metalness: 0.7, emissive: '#0b5cff', emissiveIntensity: 0.5 });
    // A cylinder's materials go: side, top, bottom.
    return [rim, stamped, stamped];
  }, [symbol]);

  useFrame(({ clock: three }) => {
    const instanced = mesh.current;
    if (!instanced) return;
    const time = three.elapsedTime;
    // The tree turns as it grows; turning the coins back keeps their faces towards the viewer.
    const home = -clock.p * TREE_TURN;

    items.forEach((item, i) => {
      const t = smoothstep(clock.p, item.from, item.from + 0.2);
      const loose = 1 - t;
      place(dummy, item, t, time);
      dummy.rotation.set(
        Math.PI / 2 + time * item.spin * 2 * loose,
        home + time * item.spin * loose + Math.sin(time * 0.9 + item.phase) * 0.6 * t,
        0,
      );
      dummy.updateMatrix();
      instanced.setMatrixAt(i, dummy.matrix);
    });
    instanced.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, items.length]} material={materials} frustumCulled={false}>
      <cylinderGeometry args={[1, 1, 0.14, 32]} />
    </instancedMesh>
  );
}

/** Motes of light that rise through the canopy once the tree is in leaf. */
function Sparkles({ count }: { count: number }) {
  const points = useRef<THREE.Points>(null);
  const material = useRef<THREE.PointsMaterial>(null);
  const motes = useMemo(() => {
    const rand = seeded(57);
    return Array.from({ length: count }, () => ({
      angle: rand() * Math.PI * 2,
      radius: 0.3 + rand() * 1.5,
      speed: 0.05 + rand() * 0.09,
      offset: rand(),
      phase: rand() * Math.PI * 2,
    }));
  }, [count]);
  const geometry = useMemo(() => {
    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    return buffer;
  }, [count]);

  useFrame(({ clock: three }) => {
    const time = three.elapsedTime;
    if (material.current) material.current.opacity = smoothstep(clock.p, 0.72, 0.96) * 0.9;
    if (!points.current) return;
    const position = points.current.geometry.attributes.position as THREE.BufferAttribute;
    motes.forEach((mote, i) => {
      const rise = (time * mote.speed + mote.offset) % 1;
      const sway = mote.angle + Math.sin(time * 0.5 + mote.phase) * 0.4;
      position.setXYZ(
        i,
        Math.cos(sway) * mote.radius,
        CANOPY.y - CANOPY.ry - 0.4 + rise * (CANOPY.ry * 2 + 1.4),
        Math.sin(sway) * mote.radius * 0.75,
      );
    });
    position.needsUpdate = true;
  });

  return (
    <points ref={points} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        ref={material}
        color="#ffffff"
        size={0.05}
        sizeAttenuation
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function Seed() {
  const seed = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.PointLight>(null);
  const crown = useRef<THREE.PointLight>(null);

  useFrame(({ clock: three }) => {
    const pulse = 0.5 + 0.5 * Math.sin(three.elapsedTime * 1.8);
    // The seed is spent as the trunk rises out of it.
    const spent = 1 - 0.55 * smoothstep(clock.p, 0.3, 0.6);
    if (seed.current) seed.current.scale.set(0.17, 0.23, 0.17).multiplyScalar((1 + pulse * 0.06) * spent);
    if (glow.current) glow.current.intensity = 1.6 + pulse * 1.2;
    if (crown.current) crown.current.intensity = smoothstep(clock.p, 0.6, 1) * 14;
  });

  return (
    <>
      <mesh ref={seed} position={[0, SEED_Y, 0]}>
        <sphereGeometry args={[1, 32, 24]} />
        <meshStandardMaterial color="#eaf2ff" emissive="#2f74ff" emissiveIntensity={0.7} roughness={0.3} metalness={0.4} />
      </mesh>
      <pointLight ref={glow} position={[0, SEED_Y, 0.4]} color="#8fb4ff" distance={5} decay={2} />
      <pointLight ref={crown} position={[0, CANOPY.y, 1.2]} color="#8fb4ff" distance={7} decay={2} intensity={0} />
    </>
  );
}

function Soil() {
  const points = useMemo(() => {
    const rand = seeded(41);
    const count = 700;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = rand() * Math.PI * 2;
      const radius = Math.sqrt(rand()) * 3.2;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = -rand() * rand() * 1.9 - 0.02;
      positions[i * 3 + 2] = Math.sin(angle) * radius * 0.45;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, []);

  return (
    <>
      {/* Ground: a disc that fades out towards its edge */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3.4, 64]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          vertexShader="varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }"
          fragmentShader="varying vec2 vUv; void main() { float d = distance(vUv, vec2(0.5)) * 2.0; gl_FragColor = vec4(0.14, 0.3, 0.62, 0.6 * (1.0 - smoothstep(0.15, 1.0, d))); }"
        />
      </mesh>
      <points geometry={points}>
        <pointsMaterial color="#6f93cf" size={0.02} sizeAttenuation transparent opacity={0.7} depthWrite={false} />
      </points>
    </>
  );
}

function Scene({ progress, band, compact }: Pick<HeroSceneProps, 'progress' | 'band'> & { compact: boolean }) {
  const group = useRef<THREE.Group>(null);
  const leaves = useMemo(() => buildDrifters(compact ? 150 : 280, 11, 0.58, 0.2, [0.07, 0.14]), [compact]);
  // Half the coins carry a dollar sign and half a cedi sign.
  const coins = useMemo(() => {
    const all = buildDrifters(compact ? 10 : 18, 19, 0.68, 0.12, [0.17, 0.23]);
    // Hang the coins just outside the leaves so their faces are not buried.
    const centre = new THREE.Vector3(0, CANOPY.y, 0);
    for (const coin of all) coin.target.sub(centre).multiplyScalar(1.22).add(centre);
    return COIN_SYMBOLS.map((symbol, s) => ({ symbol, items: all.filter((_, i) => i % COIN_SYMBOLS.length === s) }));
  }, [compact]);

  useFrame(({ clock: three }) => {
    if (group.current) group.current.rotation.y = clock.p * TREE_TURN + Math.sin(three.elapsedTime * 0.25) * 0.06;
  });

  return (
    <>
      <Rig progress={progress} band={band} />
      <ambientLight color="#ffffff" intensity={0.6} />
      <directionalLight color="#ffffff" intensity={1.8} position={[4, 6, 5]} />
      <directionalLight color="#4d8dff" intensity={0.7} position={[-5, 2, -3]} />
      <group ref={group}>
        <Soil />
        <Seed />
        <Limbs />
        <Leaves items={leaves} />
        {coins.map((set) => (
          <Coins key={set.symbol} items={set.items} symbol={set.symbol} />
        ))}
        <Sparkles count={compact ? 40 : 80} />
      </group>
    </>
  );
}

export default function HeroScene({ progress, band, active, onReady }: HeroSceneProps) {
  const compact = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <Canvas
      aria-hidden
      className="!absolute inset-0"
      dpr={[1, compact ? 1.5 : 1.75]}
      camera={{ fov: 40, near: 0.1, far: 60, position: [0, -0.25, 2.5] }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      frameloop={active ? 'always' : 'never'}
      onCreated={onReady}
    >
      <Scene progress={progress} band={band} compact={compact} />
    </Canvas>
  );
}
