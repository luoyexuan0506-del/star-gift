export enum TreeState {
  SCATTERED = 'Scattered',
  ASSEMBLED = 'Assembled',
}

export interface OrnamentData {
  id: number;
  type: 'box' | 'sphere';
  scatterPosition: [number, number, number];
  treePosition: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  color: string;
}

export interface FoliageData {
  scatterPositions: Float32Array;
  treePositions: Float32Array;
  randoms: Float32Array;
  sizes: Float32Array; // Added size attribute
  count: number;
}