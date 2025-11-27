import * as THREE from 'three';
import { OrnamentData, FoliageData } from '../types';

// Constants
const FOLIAGE_COUNT = 15000;
const ORNAMENT_COUNT = 150;
const TREE_HEIGHT = 7.0;
const TREE_RADIUS = 2.8;
const SCATTER_RADIUS = 12.0;

// Helper: Random point in sphere
const getRandomPointInSphere = (radius: number): THREE.Vector3 => {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = Math.cbrt(Math.random()) * radius;
  const sinPhi = Math.sin(phi);
  return new THREE.Vector3(
    r * sinPhi * Math.cos(theta),
    r * sinPhi * Math.sin(theta),
    r * Math.cos(phi)
  );
};

// Helper: Point in Cone (Volume)
const getRandomPointInCone = (height: number, maxRadius: number): THREE.Vector3 => {
  const y = Math.random() * height; // 0 to H
  const rAtY = (1 - y / height) * maxRadius; // Linear taper
  const r = Math.sqrt(Math.random()) * rAtY; // Uniform circle distribution
  const theta = Math.random() * Math.PI * 2;
  
  return new THREE.Vector3(
    r * Math.cos(theta),
    y - height / 2 - 0.5, // Center vertically, adjust down slightly for star
    r * Math.sin(theta)
  );
};

// Helper: Point on Cone Surface (Spiral)
const getSpiralPointOnCone = (t: number, height: number, maxRadius: number): THREE.Vector3 => {
  // t is 0 to 1
  const y = t * height;
  const rAtY = (1 - t) * maxRadius;
  const theta = t * Math.PI * 15; // Spiral turns
  
  return new THREE.Vector3(
    rAtY * Math.cos(theta),
    y - height / 2 - 0.5,
    rAtY * Math.sin(theta)
  );
};

export const generateFoliage = (): FoliageData => {
  const scatterPositions = new Float32Array(FOLIAGE_COUNT * 3);
  const treePositions = new Float32Array(FOLIAGE_COUNT * 3);
  const randoms = new Float32Array(FOLIAGE_COUNT);
  const sizes = new Float32Array(FOLIAGE_COUNT);

  for (let i = 0; i < FOLIAGE_COUNT; i++) {
    // 1. Scatter Position (Chaos)
    const scatter = getRandomPointInSphere(SCATTER_RADIUS);
    scatterPositions[i * 3] = scatter.x;
    scatterPositions[i * 3 + 1] = scatter.y;
    scatterPositions[i * 3 + 2] = scatter.z;

    // 2. Tree Position (Order)
    const tree = getRandomPointInCone(TREE_HEIGHT, TREE_RADIUS);
    // Add volume fluffiness
    tree.add(new THREE.Vector3((Math.random()-0.5)*0.3, (Math.random()-0.5)*0.3, (Math.random()-0.5)*0.3));
    
    treePositions[i * 3] = tree.x;
    treePositions[i * 3 + 1] = tree.y;
    treePositions[i * 3 + 2] = tree.z;

    // 3. Random attribute
    randoms[i] = Math.random();

    // 4. Size attribute (Mix of dust and larger "lights")
    // 90% are small dust, 10% are larger lights
    if (Math.random() > 0.9) {
      sizes[i] = 2.0 + Math.random() * 2.0; // Lights
    } else {
      sizes[i] = 0.5 + Math.random() * 0.8; // Gold dust
    }
  }

  return { scatterPositions, treePositions, randoms, sizes, count: FOLIAGE_COUNT };
};

export const generateOrnaments = (): OrnamentData[] => {
  const ornaments: OrnamentData[] = [];
  
  // Golds
  const golds = ['#FFD700', '#DAA520', '#F7E7CE'];
  // Greens (Lighter, livelier Forest Greens)
  const greens = ['#2E8B57', '#228B22', '#3CB371']; 
  // Red (Christmas Red)
  const red = '#D6001C';

  for (let i = 0; i < ORNAMENT_COUNT; i++) {
    const isBox = Math.random() > 0.6;
    const scatterVec = getRandomPointInSphere(SCATTER_RADIUS * 0.8);
    const t = i / ORNAMENT_COUNT;
    const treeVec = getSpiralPointOnCone(t, TREE_HEIGHT, TREE_RADIUS + 0.3);
    
    // Noise
    treeVec.x += (Math.random() - 0.5) * 0.5;
    treeVec.z += (Math.random() - 0.5) * 0.5;

    // Color Logic: 10% Red, 30% Green, 60% Gold
    let color;
    const rand = Math.random();
    if (rand < 0.10) {
      color = red;
    } else if (rand < 0.40) {
      color = greens[Math.floor(Math.random() * greens.length)];
    } else {
      color = golds[Math.floor(Math.random() * golds.length)];
    }

    ornaments.push({
      id: i,
      type: isBox ? 'box' : 'sphere',
      scatterPosition: [scatterVec.x, scatterVec.y, scatterVec.z],
      treePosition: [treeVec.x, treeVec.y, treeVec.z],
      rotation: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI],
      scale: 0.12 + Math.random() * 0.15,
      color: color
    });
  }
  return ornaments;
};