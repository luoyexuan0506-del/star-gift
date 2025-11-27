import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { generateFoliage, generateOrnaments } from '../utils/geometry';
import { TreeState } from '../types';

interface SceneProps {
  treeState: TreeState;
  morphProgress: number; // 0 (Tree) to 1 (Scatter)
}

// --- FOLIAGE SHADER (UPDATED: Cozy Warmth) ---
const foliageVertexShader = `
  uniform float uTime;
  uniform float uMorph;
  uniform float uPixelRatio;
  
  attribute vec3 aTreePos;
  attribute vec3 aScatterPos;
  attribute float aRandom;
  attribute float aSize; // New size attribute
  
  varying float vAlpha;
  varying float vMorph;
  varying float vRandom;
  varying float vSize;

  float easeInOutCubic(float x) {
    return x < 0.5 ? 4.0 * x * x * x : 1.0 - pow(-2.0 * x + 2.0, 3.0) / 2.0;
  }

  void main() {
    vMorph = uMorph;
    vRandom = aRandom;
    vSize = aSize;
    
    float localProgress = smoothstep(0.0, 1.0, (uMorph * 1.5) - (aRandom * 0.5));
    localProgress = clamp(localProgress, 0.0, 1.0);
    
    vec3 currentPos = mix(aTreePos, aScatterPos, easeInOutCubic(localProgress));
    
    // Breathing effect
    float breathe = sin(uTime * 1.5 + aRandom * 10.0) * 0.05 * (1.0 - localProgress);
    currentPos += normalize(currentPos) * breathe;

    vec4 mvPosition = modelViewMatrix * vec4(currentPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    // Base size attenuation
    gl_PointSize = (35.0 * aSize * uPixelRatio) * (1.0 / -mvPosition.z);
    
    vAlpha = 1.0; 
  }
`;

const foliageFragmentShader = `
  uniform float uTime;
  varying float vAlpha;
  varying float vMorph;
  varying float vRandom;
  varying float vSize;
  
  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) discard;
    
    // --- COLOR PALETTE (Golden Warmth) ---
    // Core Warmth (Deep Yellow/Gold) - Removed whiteness
    vec3 colorWarm = vec3(1.0, 0.85, 0.3); 
    // Edge/Shadow (Amber/Orange)
    vec3 colorGold = vec3(1.0, 0.6, 0.1); 
    // Scatter color (Light Gold)
    vec3 colorScatter = vec3(1.0, 0.9, 0.5);

    // Calculate glow/gradient based on distance from center
    float glow = 1.0 - (dist * 2.0);
    glow = pow(glow, 1.5); 
    
    vec3 baseColor = mix(colorWarm, colorGold, dist * 1.2);
    
    // --- SPARKLE LOGIC ---
    float twinkle = 1.0;
    if (vSize > 1.5 || vRandom > 0.8) {
      float speed = 3.0 + (vRandom * 5.0);
      twinkle = 0.5 + 0.5 * sin(uTime * speed + vRandom * 100.0);
      // Sparkle adds intensity but keeps hue golden
      baseColor += vec3(0.4, 0.3, 0.1) * twinkle;
    }
    
    // Mix with scatter color when morphing
    vec3 finalColor = mix(baseColor, colorScatter, vMorph * 0.6);

    // Alpha handling
    float finalAlpha = glow * vAlpha;
    
    // "Light" particles stay brighter
    if (vSize > 1.5) {
       finalAlpha *= (0.8 + 0.2 * twinkle);
    }

    // Increased intensity for glowing effect
    gl_FragColor = vec4(finalColor * 2.5, finalAlpha); 
  }
`;

// --- STAR COMPONENT ---
const Star: React.FC<{ morphProgress: number }> = ({ morphProgress }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const treePos = useMemo(() => new THREE.Vector3(0, 3.8, 0), []); 
  const scatterPos = useMemo(() => new THREE.Vector3(0, 10, 0), []); 

  // Create Star Shape
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    const points = 5;
    const outerRadius = 0.5;
    const innerRadius = 0.25;
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i / (points * 2)) * Math.PI * 2;
      const x = Math.cos(angle + Math.PI / 2 * 3) * radius; 
      const y = Math.sin(angle + Math.PI / 2 * 3) * radius;
      if (i === 0) s.moveTo(x, y);
      else s.lineTo(x, y);
    }
    s.closePath();
    return s;
  }, []);

  const extrudeSettings = useMemo(() => ({
    depth: 0.15,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.05,
    bevelSegments: 2
  }), []);

  useFrame((state) => {
    if (meshRef.current) {
      // Position Morph
      const ease = morphProgress < 0.5 ? 4 * morphProgress * morphProgress * morphProgress : 1 - Math.pow(-2 * morphProgress + 2, 3) / 2;
      meshRef.current.position.lerpVectors(treePos, scatterPos, ease);
      
      const time = state.clock.getElapsedTime();
      
      // Dynamic Rotation: Fast spin when scattered, gentle float when assembled
      // Plus a continuous slow y-axis rotation
      meshRef.current.rotation.y = time * 0.8;
      
      // Add a slight wobble on Z and X for playfulness
      meshRef.current.rotation.z = Math.sin(time * 0.5) * 0.1 + (ease * 0.5); 
      meshRef.current.rotation.x = Math.cos(time * 0.5) * 0.1;
    }
  });

  return (
    <mesh ref={meshRef}>
      <extrudeGeometry args={[shape, extrudeSettings]} />
      <meshStandardMaterial 
        color="#FFD700" 
        emissive="#FFC000"
        emissiveIntensity={1.0}
        metalness={0.9}
        roughness={0.2}
      />
    </mesh>
  );
};

const Foliage: React.FC<{ morphProgress: number }> = ({ morphProgress }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const data = useMemo(() => generateFoliage(), []);
  
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uMorph: { value: 0 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
  }), []);

  useFrame((state) => {
    if (pointsRef.current) {
      const material = pointsRef.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = state.clock.getElapsedTime();
      material.uniforms.uMorph.value = THREE.MathUtils.lerp(
        material.uniforms.uMorph.value, 
        morphProgress, 
        0.05
      );
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={data.count} array={data.treePositions} itemSize={3} />
        <bufferAttribute attach="attributes-aTreePos" count={data.count} array={data.treePositions} itemSize={3} />
        <bufferAttribute attach="attributes-aScatterPos" count={data.count} array={data.scatterPositions} itemSize={3} />
        <bufferAttribute attach="attributes-aRandom" count={data.count} array={data.randoms} itemSize={1} />
        <bufferAttribute attach="attributes-aSize" count={data.count} array={data.sizes} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={foliageVertexShader}
        fragmentShader={foliageFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

const Ornaments: React.FC<{ morphProgress: number }> = ({ morphProgress }) => {
  const data = useMemo(() => generateOrnaments(), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const boxes = useMemo(() => data.filter(d => d.type === 'box'), [data]);
  const spheres = useMemo(() => data.filter(d => d.type === 'sphere'), [data]);
  
  const boxMeshRef = useRef<THREE.InstancedMesh>(null);
  const sphereMeshRef = useRef<THREE.InstancedMesh>(null);

  useFrame((state) => {
    const targetMorph = morphProgress;
    const time = state.clock.getElapsedTime();

    const updateMesh = (mesh: THREE.InstancedMesh | null, items: typeof data) => {
      if (!mesh) return;
      
      items.forEach((item, i) => {
        const sx = item.scatterPosition[0], sy = item.scatterPosition[1], sz = item.scatterPosition[2];
        const tx = item.treePosition[0], ty = item.treePosition[1], tz = item.treePosition[2];
        
        const offset = item.id * 0.002;
        const localMorph = THREE.MathUtils.clamp((targetMorph * 1.2) - offset, 0, 1);
        const smoothMorph = localMorph < 0.5 ? 4 * localMorph * localMorph * localMorph : 1 - Math.pow(-2 * localMorph + 2, 3) / 2;

        dummy.position.set(
          THREE.MathUtils.lerp(tx, sx, smoothMorph),
          THREE.MathUtils.lerp(ty, sy, smoothMorph),
          THREE.MathUtils.lerp(tz, sz, smoothMorph)
        );
        
        // --- ADDED CONTINUOUS SELF-ROTATION ---
        dummy.rotation.set(
          item.rotation[0] + smoothMorph * 5 + time * 0.5,
          item.rotation[1] + smoothMorph * 5 + time * 0.3,
          item.rotation[2] + time * 0.2
        );
        
        dummy.scale.setScalar(item.scale);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, new THREE.Color(item.color));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    };

    updateMesh(boxMeshRef.current, boxes);
    updateMesh(sphereMeshRef.current, spheres);
  });

  return (
    <group>
      <instancedMesh ref={boxMeshRef} args={[undefined, undefined, boxes.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.2} metalness={0.9} />
      </instancedMesh>
      
      <instancedMesh ref={sphereMeshRef} args={[undefined, undefined, spheres.length]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial roughness={0.1} metalness={0.9} />
      </instancedMesh>
    </group>
  );
};

const ParticleScene: React.FC<SceneProps> = ({ morphProgress }) => {
  return (
    <group>
      <Foliage morphProgress={morphProgress} />
      <Ornaments morphProgress={morphProgress} />
      <Star morphProgress={morphProgress} />
      
      {/* Cinematic Lighting for Warm Happy Theme */}
      <ambientLight intensity={0.2} color="#FFF5E0" />
      <pointLight position={[10, 5, 10]} intensity={1.5} color="#FFD700" distance={25} />
      <pointLight position={[-10, 8, -5]} intensity={1.2} color="#FF8C00" distance={25} />
      <pointLight position={[0, 2, 8]} intensity={0.8} color="#FF4500" distance={15} /> {/* Subtle Red glow from front */}
      
      {/* Rim light from bottom */}
      <spotLight position={[0, -10, 0]} target-position={[0, 5, 0]} angle={1.2} penumbra={1} intensity={1.5} color="#FFE4B5" />
    </group>
  );
};

export default ParticleScene;